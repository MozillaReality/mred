import {fetchGraphObject} from "../../syncgraph/utils"
import {Group} from 'three'
import ObjectDef from './ObjectDef'
import {OBJ_TYPES} from '../Common'

let COUNTER = 0

export default class GroupDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create cube w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.group,
            title:'group '+COUNTER++,
            visible:true,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#00ff00',
            children:graph.createArray(),
            parent:scene.id
        }))
    }
    makeNode(obj) {
        const node = new Group()
        node.name = obj.title
        node.userData.clickable = true
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        return node
    }

    updateProperty(node, obj, op, provider) {
        return super.updateProperty(node,obj,op,provider)
    }

}
