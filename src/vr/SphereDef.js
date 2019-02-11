import {fetchGraphObject} from "../syncgraph/utils";
import * as THREE from "three";
import {POINTER_CLICK} from "webxr-boilerplate/pointer";
import SelectionManager from "../SelectionManager";
import {on} from "../utils";
import ObjectDef from './ObjectDef'

export default class SphereDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'sphere',
            title:'a sphere',
            radius: 0.5,
            tx:0, ty:1.5, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#0000ff',
            navTarget:0,
            parent:scene.id
        }))
    }
    makeNode(obj) {
        const node = new THREE.Mesh(
            new THREE.SphereBufferGeometry(obj.radius),
            new THREE.MeshLambertMaterial({color: obj.color})
        )
        node.name = obj.title
        node.userData.clickable = true
        on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        return node
    }

    updateProperty(node, obj, op, provider) {
        if (op.name === 'radius') node.geometry = new THREE.SphereGeometry(op.value)
        return super.updateProperty(node,obj,op,provider)
    }

}
