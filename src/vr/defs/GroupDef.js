import {fetchGraphObject} from "../../syncgraph/utils";
import * as THREE from "three";
import ObjectDef from '../ObjectDef'

const on = (elem,type,cb) => elem.addEventListener(type,cb)

export default class GroupDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create cube w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'group',
            title:'first group',
            visible:true,
            tx:0, ty:1.5, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#00ff00',
            children:graph.createArray(),
            parent:scene.id
        }))
    }
    makeNode(obj) {
        const node = new THREE.Group()
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
