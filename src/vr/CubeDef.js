import {fetchGraphObject} from "../syncgraph/utils";
import * as THREE from "three";
import ObjectDef from './ObjectDef'
import {TRIGGERS} from './Common'

const on = (elem,type,cb) => elem.addEventListener(type,cb)

export default class CubeDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create cube w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'cube',
            title:'first cube',
            visible:true,
            width:1, height:1, depth:1,
            tx:0, ty:1.5, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#00ff00',
            action:0,
            trigger:TRIGGERS.CLICK,
            children:graph.createArray(),
            parent:scene.id
        }))
    }
    makeNode(obj) {
        const node = new THREE.Mesh(
            new THREE.BoxGeometry(obj.width, obj.height, obj.depth),
            new THREE.MeshLambertMaterial({color: obj.color})
        )
        node.name = obj.title
        node.userData.clickable = true
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        return node
    }



    updateProperty(node, obj, op, provider) {
        if (op.name === 'width' || op.name === 'height' || op.name === 'depth') {
            node.geometry = new THREE.BoxGeometry(obj.width, obj.height, obj.depth)
            return
        }
        return super.updateProperty(node,obj,op,provider)
    }

}
