import {fetchGraphObject} from "../../syncgraph/utils";
import ObjectDef from './ObjectDef'
import {ASSET_TYPES, PROP_DEFS} from '../Common'
import {TextureLoader, MeshLambertMaterial, DoubleSide, VideoTexture, Mesh, SphereBufferGeometry} from 'three'

export default class SphereDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'sphere',
            title:'a sphere',
            visible:true,
            radius: 0.5,
            tx:0, ty:0, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#0000ff',
            children:graph.createArray(),
            asset:0,
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
        const asset = provider.accessObject(obj.asset)
        if(asset.exists()) this.attachAsset(asset, obj, node, provider)
        return node
    }

    updateProperty(node, obj, op, provider) {
        if (op.name === 'radius') node.geometry = new SphereBufferGeometry(op.value)
        if (op.name === PROP_DEFS.asset.key) {
            const asset = provider.accessObject(obj.asset)
            if(asset.exists()) this.attachAsset(asset, obj, node, provider)
        }
        return super.updateProperty(node,obj,op,provider)
    }

    attachAsset(asset, obj, node, provider) {
        if(asset.subtype === ASSET_TYPES.IMAGE) {
            const tex = new TextureLoader().load(asset.src)
            node.material = new MeshLambertMaterial({color: obj.color, side: DoubleSide, map: tex})
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
            const tex = new VideoTexture(video)
            node.material = new MeshLambertMaterial({color: obj.color, side: DoubleSide, map: tex})
        }
    }
}
