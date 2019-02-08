import {createGraphObjectFromObject, fetchGraphObject} from "../syncgraph/utils";
import * as THREE from "three";
import {OBJ_TYPES, PROP_DEFS} from './Common'


export default class SceneDef {
    make(graph, root) {
        if(!root.id) throw new Error("can't create scene w/ missing parent")
        return fetchGraphObject(graph,createGraphObjectFromObject(graph,{
            type:'scene',
            title:'Scene 1',
            defaultFloor: true,
            parent:root.id,
            children:graph.createArray()
        }))
    }
    makeNode(obj) {
        const scene = new THREE.Group()
        this.setDefaultFloor(scene,obj.defaultFloor)
        return scene
    }

    updateProperty(node, obj, op, provider) {
        console.log("got hte op",op)
        if(op.name === PROP_DEFS.defaultFloor.key) {
            console.log('setting the fllor too',op.value)
            this.setDefaultFloor(node,op.value)
        }
    }

    setDefaultFloor(scene,val) {
        if (val === true) {
            const floor = new THREE.Mesh(
                new THREE.PlaneBufferGeometry(100, 100, 10, 10),
                new THREE.MeshLambertMaterial({color: 'blue'})
            )
            floor.rotation.x = -90 * Math.PI / 180
            scene.parts = {}
            scene.parts.floor = floor
            scene.add(floor)
        } else {
            if (scene.parts.floor) {
                scene.remove(scene.parts.floor)
                delete scene.parts.floor
            }
        }
    }

    getFloorPart(node) {
        return node.parts.floor
    }

}
