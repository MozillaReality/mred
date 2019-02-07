import {fetchGraphObject} from "../syncgraph/utils";
import * as THREE from "three";
import {POINTER_CLICK} from "webxr-boilerplate/pointer";
import SelectionManager from "../SelectionManager";
import {on} from "../utils";
import {PROP_DEFS} from './Common'

export default class PlaneDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create plane w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'plane',
            title:'a plane',
            width: 3,
            height: 3,
            tx:0, ty:1.5, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#ffffff',
            asset:0,
            parent:scene.id
        }))
    }
    makeNode(obj) {
        const node = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(obj.width,obj.height),
            new THREE.MeshLambertMaterial({color: obj.color, side: THREE.DoubleSide})
        )
        node.userData.clickable = true
        on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        return node
    }

    updateProperty(node, obj, op, provider) {
        if(op.name === 'color') {
            let color = op.value
            if(color.indexOf('#') === 0) color = color.substring(1)
            node.material.color.set(parseInt(color,16))
            return
        }

        if (op.name === 'width') node.geometry = new THREE.PlaneBufferGeometry(op.value,obj.height)
        if (op.name === 'height') node.geometry = new THREE.PlaneBufferGeometry(obj.width,op.value)
        if (op.name === 'tx') node.position.x = parseFloat(op.value)
        if (op.name === 'ty') node.position.y = parseFloat(op.value)
        if (op.name === 'tz') node.position.z = parseFloat(op.value)
        if (op.name === 'rx') node.rotation.x = parseFloat(op.value)
        if (op.name === 'ry') node.rotation.y = parseFloat(op.value)
        if (op.name === 'rz') node.rotation.z = parseFloat(op.value)
        if (op.name === 'sx') node.scale.x = parseFloat(op.value)
        if (op.name === 'sy') node.scale.y = parseFloat(op.value)
        if (op.name === 'sz') node.scale.z = parseFloat(op.value)
        if (op.name === PROP_DEFS.asset.key) {
            const g = provider.getDataGraph()
            const asset = fetchGraphObject(g,op.value)
            if(asset) {
                const tex = new THREE.TextureLoader().load(asset.src)
                node.material = new THREE.MeshLambertMaterial({color:obj.color, side: THREE.DoubleSide, map:tex})
            }
        }
    }

}
