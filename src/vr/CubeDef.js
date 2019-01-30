import {createGraphObjectFromObject, fetchGraphObject} from "../syncgraph/utils";
import * as THREE from "three";
import {POINTER_CLICK} from "webxr-boilerplate/pointer";
import SelectionManager from "../SelectionManager";
import BoxAccessor from "./BoxAccessor";

const on = (elem,type,cb) => elem.addEventListener(type,cb)

export default class CubeDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create cube w/ missing parent")
        return fetchGraphObject(graph,createGraphObjectFromObject(graph,{
            type:'cube',
            title:'first cube',
            width:1, height:1, depth:1,
            tx:0, ty:1.5, tz:-5,
            color:'#00ff00',
            parent:scene.id
        }))
    }
    makeNode(obj) {
        const node = new THREE.Mesh(
            new THREE.BoxGeometry(obj.width, obj.height, obj.depth),
            new THREE.MeshLambertMaterial({color: obj.color})
        )
        node.userData.clickable = true
        on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        return node
    }
    updateProperty(node, obj, op) {
        if(op.name === 'color') {
            let color = op.value
            if(color.indexOf('#') === 0) color = color.substring(1)
            node.material.color.set(parseInt(color,16))
            return
        }
        return new BoxAccessor(node, obj).updateProperty(op)
    }
}
