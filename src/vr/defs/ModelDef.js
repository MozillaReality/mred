import {fetchGraphObject} from "../../syncgraph/utils";
import * as THREE from "three";
import {PROP_DEFS} from '../Common'
import GLTFLoader from '../GLTFLoader'
import {MeshLambertMaterial} from 'three'
import ObjectDef from './ObjectDef'

export default class ModelDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create model w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'model',
            title:'a model',
            visible:true,
            tx:0, ty:0, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#ffffff',
            asset:0,
            parent:scene.id
        }))
    }
    makeNode(obj, provider) {
        const node = new THREE.Group()
        node.name = obj.title
        const clicker =  new THREE.Mesh(
            new THREE.SphereBufferGeometry(1),
            new MeshLambertMaterial({color:"red", transparent:true, opacity: 0.2})
        )
        clicker.material.visible = true
        clicker.userData.clickable = true
        node.userData.clicker = clicker
        node.add(clicker)
        // on(clicker,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)

        const asset = provider.accessObject(obj.asset)
        if(asset.exists()) this.attachAsset(asset, obj, node, provider)

        return node
    }

    updateProperty(node, obj, op, provider) {
        if (op.name === PROP_DEFS.asset.key) {
            const asset = provider.accessObject(op.value)
            if(asset.exists()) this.attachAsset(asset, obj, node, provider)
        }
        return super.updateProperty(node,obj,op,provider)
    }

    attachAsset(asset,obj,node,provider) {
        const loader = new GLTFLoader()
        console.log("loading the url",asset.src)
        loader.load(asset.src, (gltf)=> {
            console.log("loaded", gltf)
            //swap the model
            if(node.userData.model) node.remove(node.userData.model)
            node.userData.model = gltf.scene.clone()
            node.add(node.userData.model)

            //calculate the size of the model
            if(node.userData.model.geometry) {
                node.userData.model.geometry.computeBoundingSphere()
                const bs = node.userData.model.geometry.boundingSphere
                const model = node.userData.model
                model.position.x = -bs.center.x
                model.position.y = -bs.center.y
                model.position.z = -bs.center.z
                node.userData.clicker.geometry = new THREE.SphereBufferGeometry(bs.radius)
            }
        })
    }

}
