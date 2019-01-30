import {createGraphObjectFromObject, fetchGraphObject} from "../syncgraph/utils";
import * as THREE from "three";
import {POINTER_CLICK} from "webxr-boilerplate/pointer";
import SelectionManager from "../SelectionManager";
import {on} from "../utils";

export default class SphereDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,createGraphObjectFromObject(graph,{
            type:'sphere',
            title:'a sphere',
            radius: 0.5,
            tx:0, ty:1.5, tz:-5,
            parent:scene.id
        }))
    }
    makeNode(obj) {
        const node = new THREE.Mesh(
            new THREE.SphereBufferGeometry(obj.radius),
            new THREE.MeshLambertMaterial({color: 'green'})
        )
        node.userData.clickable = true
        on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        return node
    }
}
