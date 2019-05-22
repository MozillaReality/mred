import {fetchGraphObject} from "../../syncgraph/utils";
import * as THREE from "three";
import {NONE_ASSET, PROP_DEFS} from '../Common'
import GLTFLoader from '../GLTFLoader'
import {MeshLambertMaterial} from 'three'
import ObjectDef from './ObjectDef'
import {DoubleSide} from 'three'

export default class ModelDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create model w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:'model',
            title:'a model',
            visible:true,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            color:'#ffffff',
            children:graph.createArray(),
            asset:NONE_ASSET.id,
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
        node.visible = obj.visible
        this.attachAsset(node, obj, provider)

        node.enter = (evt, scriptManager) => {
            clicker.visible = false
        }
        node.exit = (evt, scriptManager) => {
            clicker.visible = true
        }
        return node
    }

    updateProperty(node, obj, op, provider) {
        if (op.name === PROP_DEFS.asset.key) return this.attachAsset(node, obj, provider)
        return super.updateProperty(node,obj,op,provider)
    }

    attachAsset(node, obj, provider) {
        if(obj.asset === NONE_ASSET.id) {
            // node.material = new MeshLambertMaterial({color: obj.color, side:DoubleSide})
            console.log("REMOVE NODE CHILDREN")
            return
        }
        const asset = provider.accessObject(obj.asset)
        if(!asset.exists()) return
        const loader = new GLTFLoader()
        const url = provider.assetsManager.getAssetURL(asset)
        provider.getLogger().log("ModelDef loading the model asset url",url)
        if(!url) {
            provider.getLogger().error("ModelDef: empty url. cannot load GLTF")
            return
        }
        loader.load(url, (gltf)=> {
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
