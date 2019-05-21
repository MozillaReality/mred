import {fetchGraphObject} from "../../syncgraph/utils"
import {BoxGeometry, Mesh, MeshLambertMaterial, TextureLoader, DoubleSide, VideoTexture} from 'three'
import ObjectDef from './ObjectDef'
import {ASSET_TYPES, NONE_ASSET, OBJ_TYPES, PROP_DEFS} from '../Common'

let COUNTER = 0

export default class CubeDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create cube w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.cube,
            title:'cube '+COUNTER++,
            visible:true,
            width:0.3, height:0.3, depth:0.3,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#00ff00',
            children:graph.createArray(),
            asset:NONE_ASSET.id,
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
        node.visible = obj.visible
        this.attachAsset(node, obj, provider)
        return node
    }



    updateProperty(node, obj, op, provider) {
        if (op.name === 'width' || op.name === 'height' || op.name === 'depth') {
            node.geometry = new BoxGeometry(obj.width, obj.height, obj.depth)
            return
        }
        if (op.name === PROP_DEFS.asset.key) return this.attachAsset(node, obj, provider)
        return super.updateProperty(node,obj,op,provider)
    }

    attachAsset(node, obj, provider) {
        if(obj.asset === NONE_ASSET.id) {
            node.material = new MeshLambertMaterial({color: obj.color, side:DoubleSide})
            return
        }
        const tex = provider.assetsManager.getTexture(obj.asset)
        if(tex) node.material = new MeshLambertMaterial({color: obj.color, side: DoubleSide, map: tex})
    }

}
