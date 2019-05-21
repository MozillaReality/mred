import {fetchGraphObject} from "../../syncgraph/utils";
import ObjectDef from './ObjectDef'
import {ASSET_TYPES, NONE_ASSET, PROP_DEFS} from '../Common'
import {TextureLoader, MeshLambertMaterial, DoubleSide, VideoTexture, Mesh, SphereBufferGeometry} from 'three'

export default class SphereDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'sphere',
            title:'a sphere',
            visible:true,
            radius: 0.3/2,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#0000ff',
            children:graph.createArray(),
            asset:NONE_ASSET.id,
            parent:scene.id
        }))
    }
    makeNode(obj, provider) {
        const node = new Mesh(
            new SphereBufferGeometry(obj.radius),
            new MeshLambertMaterial({color: obj.color})
        )
        node.name = obj.title
        node.userData.clickable = true
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        node.visible = obj.visible
        this.attachAsset(node, obj, provider)
        return node
    }

    updateProperty(node, obj, op, provider) {
        if (op.name === 'radius') node.geometry = new SphereBufferGeometry(op.value)
        if (op.name === PROP_DEFS.asset.key) return this.attachAsset(node, obj, provider)
        return super.updateProperty(node,obj,op,provider)
    }

    attachAsset(node, obj, provider) {
        if(obj.asset === NONE_ASSET.id) {
            node.material = new MeshLambertMaterial({color: obj.color, side:DoubleSide})
            return
        }
        const asset = provider.accessObject(obj.asset)
        if(!asset.exists()) return
        const url = provider.getAssetURL(asset)
        provider.getLogger().log("loading asset url",url)
        if(asset.subtype === ASSET_TYPES.IMAGE) {
            const tex = new TextureLoader().load(url)
            node.material = new MeshLambertMaterial({color: obj.color, side: DoubleSide, map: tex})
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
            node.material = new MeshLambertMaterial({color: obj.color, side: DoubleSide, map: tex})
        }
    }
}
