import {fetchGraphObject} from "../syncgraph/utils";
import * as THREE from "three";
import {POINTER_CLICK} from "webxr-boilerplate/pointer";
import SelectionManager from "../SelectionManager";
import {on} from "../utils";
import {PROP_DEFS} from './Common'
import GLTFLoader from '../gltfinspector/GLTFLoader'
import {MeshLambertMaterial} from 'three'

export default class ModelDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create model w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'model',
            title:'a model',
            tx:0, ty:1.5, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#ffffff',
            asset:0,
            parent:scene.id
        }))
    }
    makeNode(obj) {
        const node = new THREE.Group()
        const clicker =  new THREE.Mesh(
            new THREE.SphereBufferGeometry(1),
            new MeshLambertMaterial({color:"red", transparent:true, opacity: 0.2})
        )
        clicker.material.visible = true
        clicker.userData.clickable = true
        node.userData.clicker = clicker
        node.add(clicker)
        on(clicker,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        return node
    }

    updateProperty(node, obj, op, provider) {
        if(op.name === 'color') {
            let color = op.value
            if(color.indexOf('#') === 0) color = color.substring(1)
            node.material.color.set(parseInt(color,16))
            return
        }

        if (op.name === 'tx') node.position.x = parseFloat(op.value)
        if (op.name === 'ty') node.position.y = parseFloat(op.value)
        if (op.name === 'tz') node.position.z = parseFloat(op.value)
        if (op.name === 'rx') node.rotation.x = parseFloat(op.value)
        if (op.name === 'ry') node.rotation.y = parseFloat(op.value)
        if (op.name === 'rz') node.rotation.z = parseFloat(op.value)
        if (op.name === 'sx') node.scale.x = parseFloat(op.value)
        if (op.name === 'sy') node.scale.y = parseFloat(op.value)
        if (op.name === 'sz') node.scale.z = parseFloat(op.value)
        if (op.name === PROP_DEFS.asset.key) {
            const g = provider.getDataGraph()
            const asset = fetchGraphObject(g,op.value)
            console.log("got the asset",asset)
            if(asset.src) {
                const loader = new GLTFLoader()
                console.log("loading the url",asset.src)
                loader.load(asset.src, (gltf)=> {
                    console.log("loaded", gltf)
                    //swap the model
                    if(node.userData.model) node.remove(node.userData.model)
                    node.userData.model = gltf.scene.children[0].clone()
                    node.add(node.userData.model)

                    //calculate the size of the model
                    node.userData.model.geometry.computeBoundingSphere()
                    const bs = node.userData.model.geometry.boundingSphere
                    const model = node.userData.model
                    model.position.x = -bs.center.x
                    model.position.y = -bs.center.y
                    model.position.z = -bs.center.z
                    node.userData.clicker.geometry = new THREE.SphereBufferGeometry(bs.radius)
                })

            }
        }
    }

}
