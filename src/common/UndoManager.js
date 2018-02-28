import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'

export default class UndoManager {
    constructor(prov) {
        this.prov = prov;
        this.stack = []
        this.current = -1
        this.prov.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, (e) => {
            // console.log(`structure changed. new doc?`)
        })
        this.prov.on(TREE_ITEM_PROVIDER.STRUCTURE_ADDED, (e) => {
            if(this.locked) return
            // console.log(`structure added: ${e.child.id}`)
            this.stack = this.stack.slice(0,this.current+1)
            this.stack.push({
                undo: () => {
                    e.provider.deleteChild(e.child)
                },
                redo: () => {
                    e.provider.appendChild(e.parent, e.child)
                },
                toString: () => `ADD ${e.child.id}`
            })
            this.current++
            this.dump()
        })
        this.prov.on(TREE_ITEM_PROVIDER.STRUCTURE_REMOVED, (e) => {
            if(this.locked) return
            // console.log(`structure removed: ${e.child.id}`)
            this.stack = this.stack.slice(0,this.current+1)
            this.stack.push({
                undo:()=>{
                    e.provider.appendChild(e.parent,e.child)
                },
                redo:() => {
                    e.provider.deleteChild(e.child)
                },
                toString:() => `REMOVE ${e.child.id}`
            })
            this.current++
            this.dump()
        })
        this.prov.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, (e)=> {
            if(this.locked) return
            if(this.grouping) {
                if(!this.groups[e.propKey]) {
                    this.groups[e.propKey] = {
                        oldValue: e.oldValue,
                        newValue: e.newValue,
                        undo: function () {
                            e.provider.setPropertyValueByName(e.child, e.propKey, this.oldValue)
                        },
                        redo: function () {
                            e.provider.setPropertyValueByName(e.child, e.propKey, this.newValue)
                        },
                        toString: function() {
                            return `PROPCHANGE (grouped) ${e.child.id} ${e.propKey}:${this.oldValue}=>${this.newValue}`
                        }
                    }
                } else {
                    this.groups[e.propKey].newValue = e.newValue
                }
            } else {
                this.stack = this.stack.slice(0, this.current + 1)
                this.stack.push({
                    undo: () => {
                        e.provider.setPropertyValueByName(e.child, e.propKey, e.oldValue)
                    },
                    redo: () => {
                        e.provider.setPropertyValueByName(e.child, e.propKey, e.newValue)
                    },
                    toString: () => `PROPCHANGE ${e.child.id} ${e.propKey}`
                })

                this.current++
            }
            //this.dump()
        })
        // this.prov.on(TREE_ITEM_PROVIDER.SAVED, ()=> this.clearDirty())
        // this.prov.on(TREE_ITEM_PROVIDER.CLEAR_DIRTY, ()=> this.clearDirty())
    }
    undo() {
        if(this.current <0 ) {
            console.log("no undo-s left");
            return;
        }
        this.locked = true
        console.log("undoing")
        this.stack[this.current].undo()
        this.current--
        this.dump()
        this.locked = false
    }
    redo() {
        if(this.current +1 >= this.stack.length) {
            console.log("no redo-s left");
            return
        }
        this.locked = true
        this.current++
        console.log("redoing")
        this.stack[this.current].redo()
        this.dump()
        this.locked = false
    }
    dump() {
        console.log("current stack",this.stack.join(", "))
        console.log("at index",this.current)
    }
    startGrouping() {
        this.grouping = true;
        this.groups = {}
    }
    stopGrouping() {
        this.grouping = false;
        const groups = this.groups
        this.groups = {}
        this.stack = this.stack.slice(0, this.current + 1)
        this.stack.push({
            undo:() => {
                Object.values(groups).forEach((g)=>g.undo())
            },
            redo:() => {
                Object.values(groups).forEach((g)=>g.redo())
            },
            toString: () => `Grouped: (${Object.values(groups).join(",")})`
        })
        this.current++
        this.dump()
    }
}