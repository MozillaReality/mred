import {fetchGraphObject} from '../syncgraph/utils'
import {OBJ_TYPES, PROP_DEFS} from './Common'
import * as THREE from 'three'
import ObjectDef from './ObjectDef'

export default class Image2DDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.img2d,
            title:'image',
            visible:true,
            width:1,
            ratio:1,
            tx:0, ty:1.5, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            asset:0,
            parent:scene.id,
        }))
    }
    makeNode(obj) {
        const node = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(obj.width, obj.width*obj.ratio),
            new THREE.MeshLambertMaterial({color: 'white', side: THREE.DoubleSide})
        )
        node.name = obj.title
        node.userData.clickable = true
        // on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        return node
    }
    updateProperty(node, obj, op, provider) {
        if (op.name === PROP_DEFS.asset.key) {
            const asset = provider.accessObject(op.value)
            if(asset.exists()) {
                const tex = new THREE.TextureLoader().load(asset.src)
                node.material = new THREE.MeshLambertMaterial({color:'white', side: THREE.DoubleSide, map:tex})
                asset.set('ratio',asset.width/asset.height)
            }
            return
        }
        if( op.name === PROP_DEFS.width.key || op.name === 'ratio') {
            node.geometry = new THREE.PlaneBufferGeometry(obj.width, obj.width*(1/obj.ratio))
            return
        }
        return super.updateProperty(node,obj,op,provider)
    }

}
