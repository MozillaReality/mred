import {createGraphObjectFromObject} from "../syncgraph/utils";
import * as THREE from "three";
import {SceneAccessor} from "./SceneAccessor";

export default class SceneDef {
    make(graph) {
        const scene1 = createGraphObjectFromObject(graph,{
            type:'scene',
            title:'Scene 1',
            defaultFloor: true,
            children:graph.createArray()
        })
        return scene1
    }
    makeNode(obj) {
        const scene = new THREE.Group()
        const acc = new SceneAccessor(scene)
        acc.setDefaultFloor(obj.defaultFloor)
        return scene
    }
}
