import {createGraphObjectFromObject, fetchGraphObject} from "../syncgraph/utils";
import * as THREE from "three";
import {SceneAccessor} from "./SceneAccessor";

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
        const acc = new SceneAccessor(scene)
        acc.setDefaultFloor(obj.defaultFloor)
        return scene
    }
}
