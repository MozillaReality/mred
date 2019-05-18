import {fetchGraphObject} from "../../syncgraph/utils"
import {Group, Mesh, MeshLambertMaterial, SphereBufferGeometry, PlaneBufferGeometry, TextureLoader, DoubleSide} from 'three'
import ObjectDef from './ObjectDef'
import {OBJ_TYPES, REC_TYPES, PROP_DEFS, toRad} from '../Common'

let COUNTER = 0

export default class ImageAnchorDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't imageanchor w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.imageanchor,
            title:'image anchor '+COUNTER++,
            visible:true,
            reactivate: false,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#00ff00',
            children:graph.createArray(),
            targetImage:null,
            imageRealworldWidth:1,
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

        const clicker =  new Mesh(
            new SphereBufferGeometry(1),
            new MeshLambertMaterial({color:"red", transparent:true, opacity: 0.2})
        )
        clicker.material.visible = true
        clicker.userData.clickable = true
        node.userData.clicker = clicker
        node.add(clicker)

        const preview = new Mesh(
            new PlaneBufferGeometry(1,1),
            new MeshLambertMaterial({color:'white',transparent:true, opacity: 0.5, side: DoubleSide})
        )
        preview.rotation.x = toRad(90)
        node.add(preview)
        node.userData.preview = preview
        this.updateImagePreview(node,obj,provider)

        node.enter = (evt, scriptManager) => {
            clicker.visible = false
            node.visible = false
            preview.visible = false
            node.userData.info = {
                image: scriptManager.sgp.getGraphObjectById(obj.targetImage),
                imageRealworldWidth: obj.imageRealworldWidth,
                reactivate: obj.reactivate,
                recType: obj.recType,
                object: obj,
                node: node,
                callback: (info) => {
                    scriptManager.fireEventAtTarget(obj, 'recognized', info)
                    node.visible = true
                }
            }
            scriptManager.sgp.startImageRecognizer(node.userData.info)
        }
        node.exit = (evt, scriptManager) => {
            clicker.visible = true
            preview.visible = true
            scriptManager.sgp.stopImageRecognizer(node.userData.info)
        }
        return node
    }

    updateProperty(node, obj, op, provider) {
        if(op.name === PROP_DEFS.targetImage.key) {
            return this.updateImagePreview(node,obj,provider)
        }
        if(op.name === PROP_DEFS.imageRealworldWidth.key) {
            return this.updateImagePreview(node,obj,provider)
        }
        return super.updateProperty(node,obj,op,provider)
    }

    updateImagePreview(node,obj,provider) {
        const targetImage = provider.accessObject(obj.targetImage)
        if(targetImage.exists()) {
            const tex = new TextureLoader().load(targetImage.src)
            node.userData.preview.material = new MeshLambertMaterial({color:'white',transparent:true, opacity:0.5, side:DoubleSide, map:tex})
            let height = (targetImage.height / targetImage.width)
            let width = 1
            node.userData.preview.geometry = new PlaneBufferGeometry(width,height)
            console.log(obj)
            let scale = obj.imageRealworldWidth
            node.userData.preview.scale.set(scale,scale,scale)
        }
        if(provider.accessObject(obj.targetImage).exists()) {
            node.userData.preview.visible = true
            node.userData.clicker.visible = false
        } else {
            node.userData.preview.visible = false
            node.userData.clicker.visible = true
        }
    }

}
