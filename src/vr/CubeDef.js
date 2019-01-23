import {createGraphObjectFromObject} from "../syncgraph/utils";

export default class CubeDef {
    make(graph, scene) {
        const obj = createGraphObjectFromObject(graph,{
            type:'cube',
            title:'first cube',
            width:1, height:1, depth:1,
            tx:0, ty:1.5, tz:-5,
            parent:scene
        })
        return obj
    }
}