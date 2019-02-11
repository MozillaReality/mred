import {fetchGraphObject} from '../syncgraph/utils'
import {OBJ_TYPES, PROP_DEFS} from './Common'
import * as THREE from 'three'
import {on} from '../utils'
import {POINTER_CLICK} from 'webxr-boilerplate/pointer'
import SelectionManager from '../SelectionManager'

export default class BG360Def {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.bg360,
            title:'background',
            asset:0,
            parent:scene.id,
            imageOffset:0,
        }))
    }
    makeNode(obj) {
        const node = new THREE.Mesh(
            new THREE.SphereBufferGeometry(20.0, 50,50),
            new THREE.MeshLambertMaterial({color: 'white', side: THREE.BackSide})
        )
        node.name = obj.title
        node.userData.clickable = true
        on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        return node
    }
    updateProperty(node, obj, op, provider) {
        if (op.name === PROP_DEFS.asset.key) {
            const g = provider.getDataGraph()
            const asset = fetchGraphObject(g,op.value)
            if(asset) {
                const tex = new THREE.TextureLoader().load(asset.src)
                node.material = new THREE.MeshLambertMaterial({color:'white', side: THREE.BackSide, map:tex})
            }
        }
    }

}
