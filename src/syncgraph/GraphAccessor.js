export default class GraphAccessor {
    constructor(graph) {
        this.graph = graph
    }
    object(id) {
        if(id.id && id.exists && id.exists()) {
            console.log("someone created a graphaccessor on an existing object")
            return id
        }
        if(this.graph.hasObject(id)) {
            const obj = {}
            this.graph.getPropertiesForObject(id).forEach(key => {
                obj[key] = this.graph.getPropertyValue(id, key)
            })
            obj.id = id
            obj.exists = function() { return true }
            obj.set = (key, value) => {
                this.graph.setProperty(id,key,value)
                return obj
            }
            obj.props = () => {
                const o = {}
                this.graph.getPropertiesForObject(id).forEach(key => {
                    o[key] = this.graph.getPropertyValue(id, key)
                })
                return o
            }
            obj.array = (key) => {
                // console.log("looking at key",key)
                // console.log("self is",obj)
                const CH = obj[key]
                // console.log("children id is",CH)
                const len = this.graph.getArrayLength(CH)
                const ch = []
                for (let i = 0; i < len; i++) {
                    ch.push(this.graph.getElementAt(CH, i))
                }
                return ch
            }
            obj.getChildren = () => {
                if(obj.children) return obj.array('children').map(id => this.object(id))
                return []
            }
            obj.insertChildLast = (child) => {
                this.graph.setProperty(child.id,'parent',obj.id)
                const CH = this.graph.getPropertyValue(obj.id,'children')
                const len = this.graph.getArrayLength(CH)
                const prev = this.graph.getElementAt(CH,len-1)
                this.graph.insertAfter(CH,prev,child.id)
            }
            obj.insertFirstChild = (child) => {
                this.graph.setProperty(child.id,'parent',obj.id)
                const ch = this.graph.getPropertyValue(obj.id,'children')
                this.graph.insertAfter(ch,null,child.id)
            }
            obj.child = (index) => this.object(obj.array('children')[index])
            obj.removeFromParent = () => {
                const parent = this.object(obj.parent)
                const n = parent.array('children').findIndex(ch => ch === obj.id)
                // const n = indexOf(graph, parent.children, obj.id)
                if (n >= 0) {
                    this.graph.removeElement(parent.children, n)
                } else {
                    console.error("could not find index for child", obj, 'in children', parent.children)
                }
            }
            obj.clone = () => {
                const shape = obj;
                const id = shape.id
                const id2 = this.graph.createObject()
                const props = this.graph.getPropertiesForObject(id)
                props.forEach(key => {
                    this.graph.createProperty(id2,key,this.graph.getPropertyValue(id,key))
                })
                return this.object(id2)
            }
            obj.find = (match,list) => {
                if(!list) list = []
                if(match(obj)) list.push(obj)
                if(obj.children) obj.getChildren().forEach(ch => {
                    ch.find(match,list)
                })
                return list
            }
            return obj
        } else {
            return {
                exists: function() { return false }
            }
        }
    }
}
