import {fetchGraphObject} from "../../syncgraph/utils"
import {Group, Mesh, MeshLambertMaterial, SphereBufferGeometry} from 'three'
import ObjectDef from './ObjectDef'
import {OBJ_TYPES, REC_TYPES} from '../Common'
let COUNTER = 0

export default class GeoAnchorDef extends ObjectDef {
    make(graph, scene) {
        if (!scene.id) throw new Error("can't create geo anchor w/ missing parent")
        return fetchGraphObject(graph, graph.createObject({
            type: OBJ_TYPES.geoanchor,
            title: 'geo anchor ' + COUNTER++,
            visible: true,
            tx: 0, ty: 0, tz: 0,
            rx: 0, ry: 0, rz: 0,
            sx: 1, sy: 1, sz: 1,
            color: '#00ff00',
            children: graph.createArray(),
            targetGeoLocation: null,
            recType: REC_TYPES.SCENE_START,
            parent: scene.id
        }))
    }
    makeNode(obj) {
        const node = new Group()
        node.name = obj.title
        node.userData.clickable = true
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)

        const clicker =  new Mesh(
            new SphereBufferGeometry(1),
            new MeshLambertMaterial({color:"red", transparent:true, opacity: 0.2})
        )
        clicker.material.visible = true
        clicker.userData.clickable = true
        node.userData.clicker = clicker
        node.add(clicker)
        node.enter = (evt) => {
            clicker.visible = false
            node.visible = false
            node.userData.info = {
                location:evt.system.getObjectById(obj.targetGeoLocation),
                recType:obj.recType,
                object:obj,
                node:node,
                callback:(info) => {
                    evt.system.fireEvent(obj, 'recognized', info)
                    node.visible = true
                }
            }
            evt.system.startGeoRecognizer(node.userData.info)
        }
        node.exit = (evt) => {
            clicker.visible = true
            evt.system.stopGeoRecognizer(node.userData.info)
        }
        return node
    }
}