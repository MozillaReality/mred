import {fetchGraphObject} from "../syncgraph/utils";
import * as THREE from "three";
import {POINTER_CLICK} from "webxr-boilerplate/pointer";
import SelectionManager from "../SelectionManager";
import {on} from "../utils";

export default class SphereDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'sphere',
            title:'a sphere',
            radius: 0.5,
            tx:0, ty:1.5, tz:-5,
            color:'#0000ff',
            parent:scene.id
        }))
    }
    makeNode(obj) {
        const node = new THREE.Mesh(
            new THREE.SphereBufferGeometry(obj.radius),
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

        if (op.name === 'radius') node.geometry = new THREE.SphereGeometry(op.value)
        if (op.name === 'tx') node.position.x = parseFloat(op.value)
        if (op.name === 'ty') node.position.y = parseFloat(op.value)
        if (op.name === 'tz') node.position.z = parseFloat(op.value)
    }

}
