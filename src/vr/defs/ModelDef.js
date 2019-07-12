import {fetchGraphObject} from "../../syncgraph/utils"
import * as THREE from "three"
import {MeshLambertMaterial} from "three"
import {NONE_ASSET, PROP_DEFS} from '../Common'
import SkeletonUtils from '../SkeletonUtils'
import ObjectDef from './ObjectDef'

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
            transparent:false,
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

        node.enter = (evt,scriptManager) => {
            node.userData.clicker.visible = false
            // if (node.userData.mixer) {
            //     provider.addMixer(obj.id, node.userData.mixer)
            // }
            if (node.userData.model) {
                if (node.userData.currentClip) {
                    node.userData.action = node.userData.mixer.clipAction( node.userData.currentClip );
                    node.userData.action.play()
                }
            } else {
                node.userData.shouldPlay = true
            }
        }
        node.exit = (evt,scriptManager) => {
            const ob2 = provider.accessObject(obj.id)
            if(ob2.asset === NONE_ASSET.id) {
                node.userData.clicker.visible = true
            }
            // if (node.userData.mixer) {
            //     provider.removeMixer(obj.id)
            // }
        }
        node.tick = (evt,scriptManager) => {
            const dt = evt.deltaTime / 1000;
            node.userData.mixer && node.userData.mixer.update(dt);
        }

        // node.playAllClips = (evt, scriptManager) => {
        //     node.userData.clips.forEach((clip) => {
        //         node.userData.mixer.clipAction(clip).reset().play();
        //     });
        // }
        // need to get this into the render loop somehow

        node.useClip = (name) => {
            if (node.userData.model) {
                var clip = THREE.AnimationClip.findByName( node.userData.clips, name );
                if (clip) {
                    node.userData.currentClip = clip
                }
            } else {
                node.userData.currentClipName = name
            }
        }

        node.play = () => {
            if (node.userData.currentClip) {
                node.userData.mixer.stopAllAction();
                node.userData.action = node.userData.mixer.clipAction( node.userData.currentClip );
                node.userData.action.play()
            }
        }

        node.stop = () => {
            if (node.userData.mixer) {
                node.userData.mixer.stopAllAction();            
            }
        }
        return node
    }

    updateProperty(node, obj, op, provider) {
        if (op.name === PROP_DEFS.asset.key) return this.attachAsset(node, obj, provider)
        return super.updateProperty(node,obj,op,provider)
    }

    setClips ( userData ) {
        if (userData.mixer) {
          userData.mixer.stopAllAction();
          userData.mixer.uncacheRoot(userData.mixer.getRoot());
          userData.mixer = null;
        }
    
        userData.clips.forEach((clip) => {
          if (clip.validate()) clip.optimize();
        });

        if (!userData.clips.length) return;
    
        userData.currentClip = userData.clips[0]
        userData.mixer = new THREE.AnimationMixer( userData.model );
    }
        
    attachAsset(node, obj, provider) {
        if(obj.asset === NONE_ASSET.id) {
            // node.material = new MeshLambertMaterial({color: obj.color, side:THREE.DoubleSide})
            console.log("REMOVE NODE CHILDREN")
            if(node.userData.model) {
                node.remove(node.userData.model)
                delete node.userData.model
            }
            node.userData.clicker.visible = true
            return
        }

        node.userData.shouldPlay = false
        node.userData.currentClip = null
        node.userData.model = null
        node.userData.currentClipName = null

        provider.assetsManager.getGLTF(obj.asset).then(gltf => {
            //swap the model
            if(node.userData.model) node.remove(node.userData.model)

            node.userData.model = gltf.scene || gltf.scenes[0]

            // clone it, in case the loader is returning the same cached version?
            node.userData.model = SkeletonUtils.clone( node.userData.model  );

            node.userData.clips = gltf.animations || [];

            node.add(node.userData.model)
            node.userData.model.updateMatrixWorld();

            //calculate the size of the model
            // if(node.userData.model.geometry) {
                // node.userData.model.geometry.computeBoundingSphere()
                // node.userData.boundingSphere = node.userData.model.geometry.boundingSphere
                // const bs = node.userData.boundingSphere
                const model = node.userData.model

                node.userData.boundingBox = new THREE.Box3().setFromObject(model);
                node.userData.boundingBoxSize = node.userData.boundingBox.getSize(new THREE.Vector3()).length();
                node.userData.BoundingBoxCenter = node.userData.boundingBox.getCenter(new THREE.Vector3());     
                      
                node.userData.mixer = null
                this.setClips(node.userData)

                // Really don't want to move it
                ///
                // model.position.x += model.position.x - node.userData.BoundingBoxCenter.x
                // model.position.y += model.position.y - node.userData.BoundingBoxCenter.y
                // model.position.z += model.position.z - node.userData.BoundingBoxCenter.z

                // model.position.x = -bs.center.x
                // model.position.y = -bs.center.y
                // model.position.z = -bs.center.z

                if (node.userData.currentClipName) {
                    var clip = THREE.AnimationClip.findByName( node.userData.clips, node.userData.currentClipName );
                    if (clip) {
                        node.userData.currentClip = clip
                    }
                    node.userData.currentClipName = null
                }

                if (node.userData.shouldPlay && node.userData.currentClip) {
                    node.userData.action = node.userData.mixer.clipAction( node.userData.currentClip );
                    node.userData.action.play()
                    node.userData.shouldPlay = false
                }
                node.userData.clicker.geometry = new THREE.SphereBufferGeometry(node.userData.boundingBoxSize / 2)
            // }
            //disable the clicker sphere
            node.userData.clicker.visible = false
        }).catch(e => {
            console.log("error loading GLTF")
        })
    }

}
