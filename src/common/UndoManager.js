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
                undo:()=>{
                    e.provider.deleteChild(e.child)
                },
                redo:() => {
                    e.provider.appendChild(e.parent,e.child)
                },
                toString:() => `ADD ${e.child.id}`
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
            // console.log(`property changed: ${e.child.id} ${e.propKey}`)
            if(this.locked) return
            this.stack = this.stack.slice(0,this.current+1)
            this.stack.push({
                undo:()=>{
                    e.provider.setPropertyValueByName(e.child,e.propKey,e.oldValue)
                },
                redo:() => {
                    e.provider.setPropertyValueByName(e.child,e.propKey,e.newValue)
                },
                toString:() => `PROPCHANGE ${e.child.id} ${e.propKey}`
            })

            this.current++
            this.dump()
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
}