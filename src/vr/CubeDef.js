import {createGraphObjectFromObject} from "../syncgraph/utils";
import * as THREE from "three";
import {POINTER_CLICK} from "webxr-boilerplate/pointer";
import SelectionManager from "../SelectionManager";

const on = (elem,type,cb) => elem.addEventListener(type,cb)

export default class CubeDef {
    make(graph, scene) {
        return createGraphObjectFromObject(graph,{
            type:'cube',
            title:'first cube',
            width:1, height:1, depth:1,
            tx:0, ty:1.5, tz:-5,
            parent:scene
        })
    }
    makeNode(obj) {
        const node = new THREE.Mesh(
            new THREE.BoxGeometry(obj.width, obj.height, obj.depth),
            new THREE.MeshLambertMaterial({color: 'red'})
        )
        node.userData.clickable = true
        on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        return node
    }
}