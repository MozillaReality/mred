import {fetchGraphObject} from "../../syncgraph/utils";
import * as THREE from "three";
import {ASSET_TYPES, PROP_DEFS} from '../Common'
import ObjectDef from './ObjectDef'

export default class PlaneDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create plane w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'plane',
            title:'a plane',
            visible:true,
            width: 3,
            height: 3,
            tx:0, ty:0, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#ffffff',
            children:graph.createArray(),
            asset:0,
            parent:scene.id
        }))
    }
    makeNode(obj, provider) {
        const node = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(obj.width,obj.height),
            new THREE.MeshLambertMaterial({color: obj.color, side: THREE.DoubleSide})
        )
        const asset = provider.accessObject(obj.asset)
        console.log("asset is",asset)
        if(asset.exists()) this.attachAsset(asset, obj, node, provider)
        node.userData.clickable = true
        // on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        return node
    }

    updateProperty(node, obj, op, provider) {
        if (op.name === 'width') node.geometry = new THREE.PlaneBufferGeometry(op.value,obj.height)
        if (op.name === 'height') node.geometry = new THREE.PlaneBufferGeometry(obj.width,op.value)
        if (op.name === PROP_DEFS.asset.key) {
            const asset = provider.accessObject(obj.asset)
            if(asset.exists()) this.attachAsset(asset, obj, node, provider)
        }
        return super.updateProperty(node,obj,op,provider)
    }

    attachAsset(asset, obj, node, provider) {
        if(asset.subtype === ASSET_TYPES.IMAGE) {
            const tex = new THREE.TextureLoader().load(asset.src)
            node.material = new THREE.MeshLambertMaterial({color: obj.color, side: THREE.DoubleSide, map: tex})
        }
        if(asset.subtype === ASSET_TYPES.VIDEO) {
            let video
            if(!provider.videocache[asset.src]) {
                video = document.createElement('video')
                video.crossOrigin = 'anonymous'
                video.src = asset.src
                provider.videocache[asset.src] = video
            } else {
                video = provider.videocache[asset.src]
            }
            const tex = new THREE.VideoTexture(video)
            node.material = new THREE.MeshLambertMaterial({color: obj.color, side: THREE.DoubleSide, map: tex})
        }
    }

}
