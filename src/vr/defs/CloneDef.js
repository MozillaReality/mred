import ObjectDef from './ObjectDef'
import {NONE_ASSET, OBJ_TYPES, PROP_DEFS, TOTAL_OBJ_TYPES} from '../Common'
import {fetchGraphObject} from '../../syncgraph/utils'
import * as THREE from 'three'
import {MeshLambertMaterial} from 'three'

let COUNTER = 0


export default class CloneDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create cube w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.clone,
            title:'clone '+COUNTER++,
            visible:true,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            children:graph.createArray(),
            cloneTarget:NONE_ASSET.id,
            parent:scene.id
        }))
    }

    makeNode(obj,provider) {
        const node = new THREE.Group()
        node.name = obj.title
        const clicker = new THREE.Mesh(
            new THREE.SphereBufferGeometry(1),
            new MeshLambertMaterial({color: "red", transparent: true, opacity: 0.2})
        )
        clicker.material.visible = true
        clicker.userData.clickable = true
        node.userData.clicker = clicker
        node.add(node.userData.clicker)
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx, obj.ry, obj.rz)
        node.scale.set(obj.sx, obj.sy, obj.sz)
        node.visible = obj.visible
        node.enter = (evt, scriptManager) => {
            clicker.visible = false
            const cloneTarget = scriptManager.sgp.getGraphObjectById(obj.cloneTarget)
            const cloneNode = scriptManager.sgp.getThreeObject(cloneTarget)
            const theClone = cloneNode.clone()
            node.add(theClone)
            node.userData.theClone = theClone
            node.userData.cloneTarget = cloneTarget

            if(node.userData.theClone.enter) node.userData.theClone.enter(evt,scriptManager)
            node.userData.cloneTarget.find(child => scriptManager.fireSceneLifecycleEventAtChild('enter',evt,child,obj.id))
        }
        node.tick  = (evt,scriptManager) => {
            if(node.userData.theClone.tick) node.userData.theClone.tick(evt,scriptManager)
            node.userData.cloneTarget.find(child => scriptManager.fireSceneLifecycleEventAtChild('tick',evt,child,obj.id))
        }
        node.exit = (evt,scriptManager) => {
            if(node.userData.theClone.exit) node.userData.theClone.exit(evt,scriptManager)
            node.userData.cloneTarget.find(child => scriptManager.fireSceneLifecycleEventAtChild('exit',evt,child,obj.id))

            clicker.visible = true
            node.remove(node.userData.theClone)
            node.userData.theClone = null
        }
        return node
    }

}
