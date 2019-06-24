import {fetchGraphObject} from "../../syncgraph/utils"
import {Group, Mesh, MeshLambertMaterial, SphereBufferGeometry} from 'three'
import ObjectDef from './ObjectDef'
import {OBJ_TYPES, REC_TYPES} from '../Common'

let COUNTER = 0

export default class LocalAnchorDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't localanchor w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.localanchor,
            title:'localanchor '+COUNTER++,
            visible:true,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#00ff00',
            children:graph.createArray(),
            recType:REC_TYPES.SCENE_START,
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
        node.visible = true

        const clicker =  new Mesh(
            new SphereBufferGeometry(1),
            new MeshLambertMaterial({color:"green", transparent:true, opacity: 0.2})
        )
        clicker.material.visible = true
        clicker.userData.clickable = true
        node.userData.clicker = clicker
        node.add(clicker)

        node.enter = (evt, scriptManager) => {
            clicker.visible = false
            node.visible = true
            node.userData.info = {
                recType: obj.recType,
                object: obj,
                node: node,
                callback: (info) => {
                    node.visible = true
                }
            }
            scriptManager.sgp.startLocalAnchor(node.userData.info)
        }
        node.exit = (evt, scriptManager) => {
            clicker.visible = true
            scriptManager.sgp.stopLocalAnchor(node.userData.info)
        }
        return node
    }

    updateProperty(node, obj, op, provider) {
        return super.updateProperty(node,obj,op,provider)
    }


}
