import {fetchGraphObject} from '../../syncgraph/utils'
import {ASSET_TYPES, NONE_ASSET, OBJ_TYPES, PROP_DEFS} from '../Common'
import * as THREE from 'three'
import ObjectDef from './ObjectDef'
import {MeshLambertMaterial} from 'three'
import {DoubleSide} from 'three'
import {TextureLoader} from 'three'
import {VideoTexture} from 'three'

export default class Image2DDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create Image2D with missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.img2d,
            title:'image',
            visible:true,
            width:0.5,
            ratio:1,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            asset:NONE_ASSET.id,
            parent:scene.id,
        }))
    }
    makeNode(obj, provider) {
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
        node.visible = obj.visible
        this.attachAsset(node, obj, provider)
        return node
    }
    updateProperty(node, obj, op, provider) {
        if (op.name === PROP_DEFS.asset.key) return this.attachAsset(node, obj, provider)
        if( op.name === PROP_DEFS.width.key || op.name === 'ratio') {
            node.geometry = new THREE.PlaneBufferGeometry(obj.width, obj.width*(1/obj.ratio))
            return
        }
        return super.updateProperty(node,obj,op,provider)
    }

}
