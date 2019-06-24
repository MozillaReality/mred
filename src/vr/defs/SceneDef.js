import {createGraphObjectFromObject, fetchGraphObject} from "../../syncgraph/utils";
import {
    Group,
    Mesh,
    MeshLambertMaterial,
    PlaneBufferGeometry
} from 'three'
import {OBJ_TYPES, PROP_DEFS} from '../Common'

function isAnchorType(type) {
    if(type === OBJ_TYPES.geoanchor) return true
    if(type === OBJ_TYPES.localanchor) return true
    if(type === OBJ_TYPES.imageanchor) return true
    if(type === OBJ_TYPES.hudanchor) return true
    return false
}

function generateUniqueTitle(prefix,count, root) {
    const title = prefix + ' ' + count
    const dup = root.getChildren().find(sc =>  sc.title === title)
    if(dup) {
        return generateUniqueTitle(prefix,count+1,root)
    } else {
        return title
    }
}

export default class SceneDef {
    make(graph, root) {
        if(!root.id) throw new Error("can't create scene w/ missing parent")
        let title = generateUniqueTitle('Scene ',0,root)
        return fetchGraphObject(graph,createGraphObjectFromObject(graph,{
            type:'scene',
            title:title,
            autoRecenter:true,
            defaultFloor: false,
            parent:root.id,
            children:graph.createArray()
        }))
    }
    makeNode(obj,provider) {
        const scene = new Group()
        scene.name = obj.title
        this.setDefaultFloor(scene,obj.defaultFloor)
        scene.start = () => {
            scene.userData.sceneAnchor = new Group()
            scene.userData.sceneAnchor.name = "SceneAnchor"
            scene.children.slice().forEach(chNode => {
                const chObj = provider.accessObject(chNode.userData.graphid)
                if(!chObj.exists()) return
                if(isAnchorType(chObj.type)) return
                if(chObj.type === OBJ_TYPES.geoanchor) return
                if(chObj.type === OBJ_TYPES.localanchor) return
                if(chObj.type === OBJ_TYPES.imageanchor) return
                if(chObj.type === OBJ_TYPES.hudanchor) return
                scene.userData.sceneAnchor.add(chNode)
            })
            scene.add(scene.userData.sceneAnchor)
        }
        scene.stop = () => {
            const toMove = scene.userData.sceneAnchor.children.slice()
            toMove.forEach(chNode => scene.add(chNode))
            scene.remove(scene.userData.sceneAnchor)
        }
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
            const floor = new Mesh(
                new PlaneBufferGeometry(100, 100, 10, 10),
                new MeshLambertMaterial({color: 'blue'})
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
