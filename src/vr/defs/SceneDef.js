import {createGraphObjectFromObject, fetchGraphObject} from "../../syncgraph/utils";
import * as THREE from "three";
import {PROP_DEFS} from '../Common'

let COUNTER = 0

export default class SceneDef {
    make(graph, root) {
        if(!root.id) throw new Error("can't create scene w/ missing parent")
        return fetchGraphObject(graph,createGraphObjectFromObject(graph,{
            type:'scene',
            title:'Scene '+COUNTER++,
            defaultFloor: true,
            parent:root.id,
            children:graph.createArray()
        }))
    }
    makeNode(obj) {
        const scene = new THREE.Group()
        scene.name = obj.title
        this.setDefaultFloor(scene,obj.defaultFloor)
        return scene
    }

    updateProperty(node, obj, op, provider) {
        console.log("update property",node.name,op.name,op.value)
        if(op.name === PROP_DEFS.defaultFloor.key) {
            console.log('setting the floor too',op.value)
            this.setDefaultFloor(node,op.value)
        }
    }

    setDefaultFloor(scene,val) {
        if (val === true) {
            const floor = new THREE.Mesh(
                new THREE.PlaneBufferGeometry(100, 100, 10, 10),
                new THREE.MeshLambertMaterial({color: 'blue'})
            )
            floor.name = 'defaultFloor'
            floor.rotation.x = -90 * Math.PI / 180
            scene.parts = {}
            scene.parts.floor = floor
            scene.add(floor)
        } else {
            if (scene.parts && scene.parts.floor) {
                scene.remove(scene.parts.floor)
                delete scene.parts.floor
            }
        }
    }

    getFloorPart(node) {
        if(!node) return null
        if(!node.parts) return null
        return node.parts.floor
    }

}
