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
    attachAsset(node, obj, provider) {
        if(obj.asset === NONE_ASSET.id) {
            node.material = new MeshLambertMaterial({color: 'white', side:DoubleSide})
            return
        }
        const asset = provider.accessObject(obj.asset)
        if(!asset.exists()) return
        const url = provider.getAssetURL(asset)
        provider.getLogger().log("loading asset url",url)
        if(asset.subtype === ASSET_TYPES.IMAGE) {
            const tex = new TextureLoader().load(url)
            node.material = new MeshLambertMaterial({color: 'white', side: DoubleSide, map: tex})
        }
        if(asset.subtype === ASSET_TYPES.VIDEO) {
            let video
            if(!provider.videocache[url]) {
                video = document.createElement('video')
                video.crossOrigin = 'anonymous'

                // video will only play inline on mobile devices if it's muted
                // we will loop video
                video.muted = true;
                video.loop = true;
                video.setAttribute( 'playsinline', '' );

                video.src = url
                provider.videocache[url] = video
            } else {
                video = provider.videocache[url]
            }
            const tex = new VideoTexture(video)
            node.material = new MeshLambertMaterial({color: 'white', side: DoubleSide, map: tex})
        }
    }

}
