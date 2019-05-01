import {fetchGraphObject} from "../../syncgraph/utils";
import * as THREE from "three";
import ObjectDef from './ObjectDef'
import {OBJ_TYPES, REC_TYPES} from '../Common'
import {MeshLambertMaterial} from 'three'

const on = (elem,type,cb) => elem.addEventListener(type,cb)

let COUNTER = 0

export default class AnchorDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create cube w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.anchor,
            title:'anchor '+COUNTER++,
            visible:true,
            tx:0, ty:1.5, tz:-5,
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
    makeNode(obj) {
        const node = new THREE.Group()
        node.name = obj.title
        node.userData.clickable = true
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)

        const clicker =  new THREE.Mesh(
            new THREE.SphereBufferGeometry(1),
            new MeshLambertMaterial({color:"red", transparent:true, opacity: 0.2})
        )
        clicker.material.visible = true
        clicker.userData.clickable = true
        node.userData.clicker = clicker
        node.add(clicker)
        node.update = (time,evt) => {
            if(evt.type === 'tick') {
                if(!evt.system.hasKeyValue('recognized')) {
                    console.log("sending recognition event")
                    evt.system.setKeyValue('recognized',true)
                    evt.system.fireEvent(obj, 'recognized',{
                        message:'we found it'
                    })
                }
            }
        }

        return node
    }

    updateProperty(node, obj, op, provider) {
        return super.updateProperty(node,obj,op,provider)
    }

}
