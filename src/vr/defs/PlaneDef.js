import {fetchGraphObject} from "../../syncgraph/utils"
import * as THREE from "three"
import {NONE_ASSET, PROP_DEFS} from '../Common'
import ObjectDef from './ObjectDef'

export default class PlaneDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create plane w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'plane',
            title:'a plane',
            visible:true,
            width: 0.5,
            height: 0.5,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#ffffff',
            children:graph.createArray(),
            asset:NONE_ASSET.id,
            transparent:false,
            parent:scene.id
        }))
    }
    makeNode(obj, provider) {
        const node = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(obj.width,obj.height),
            new THREE.MeshLambertMaterial({color: obj.color, side: THREE.DoubleSide})
        )
        this.attachAsset(node, obj, provider)
        node.userData.clickable = true
        // on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        node.visible = obj.visible
        return node
    }

    updateProperty(node, obj, op, provider) {
        if (op.name === 'width') node.geometry = new THREE.PlaneBufferGeometry(op.value,obj.height)
        if (op.name === 'height') node.geometry = new THREE.PlaneBufferGeometry(obj.width,op.value)
        if (op.name === PROP_DEFS.asset.key || op.name === PROP_DEFS.transparent.key) return this.attachAsset(node, obj, provider)
        return super.updateProperty(node,obj,op,provider)
    }

}
