import {fetchGraphObject} from "../../syncgraph/utils"
import {BoxGeometry, Mesh, MeshLambertMaterial, TextureLoader, DoubleSide, VideoTexture} from 'three'
import ObjectDef from './ObjectDef'
import {ASSET_TYPES, OBJ_TYPES, PROP_DEFS} from '../Common'

let COUNTER = 0

export default class CubeDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create cube w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.cube,
            title:'cube '+COUNTER++,
            visible:true,
            width:1, height:1, depth:1,
            tx:0, ty:0, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#00ff00',
            children:graph.createArray(),
            asset:0,
            parent:scene.id
        }))
    }
    makeNode(obj, provider) {
        const node = new Mesh(
            new BoxGeometry(obj.width, obj.height, obj.depth),
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
        if (op.name === 'width' || op.name === 'height' || op.name === 'depth') {
            node.geometry = new BoxGeometry(obj.width, obj.height, obj.depth)
            return
        }
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
