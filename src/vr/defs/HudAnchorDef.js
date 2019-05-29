import {fetchGraphObject} from "../../syncgraph/utils"
import {Group, Mesh, MeshLambertMaterial, SphereBufferGeometry, PlaneBufferGeometry, TextureLoader, DoubleSide} from 'three'
import ObjectDef from './ObjectDef'
import {ASSET_TYPES, OBJ_TYPES, REC_TYPES, PROP_DEFS} from '../Common'

let COUNTER = 0

export class HudAnchorDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't add hudanchor w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.hudanchor,
            title:'hud anchor '+COUNTER++,
            visible:true,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            children:graph.createArray(),
            parent:scene.id
        }))
    }
    makeNode(obj, provider) {
        const node = new Group()
        node.name = obj.title
        node.userData.clickable = true
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        node.visible = obj.visible

        const clicker =  new Mesh(
            new SphereBufferGeometry(1),
            new MeshLambertMaterial({color:"red", transparent:true, opacity: 0.2})
        )
        clicker.material.visible = true
        clicker.userData.clickable = true
        node.userData.clicker = clicker
        node.add(clicker)

        node.enter = (evt,scriptManager) => {
            node.parent.remove(node)
            node.position.z = 0
            clicker.visible = false
            scriptManager.sgp.getCamera().add(node)
        }
        node.exit = (evt,scriptManager) => {
            scriptManager.sgp.getCamera().remove(node)
            clicker.visible = true
            const scene = scriptManager.sgp.getThreeObject(obj.parent)
            scene.add(node)
            node.position.set(obj.tx, obj.ty, obj.tz)
            node.rotation.set(obj.rx,obj.ry,obj.rz)
            node.scale.set(obj.sx,obj.sy,obj.sz)
        }
        return node
    }

    updateProperty(node, obj, op, provider) {
        return super.updateProperty(node,obj,op,provider)
    }
}
