import React, {Component} from 'react'
import ScriptManager, {SceneGraphProvider} from './ScriptManager'
import TreeItemProvider, {getDocsURL} from '../TreeItemProvider'
import {on, parseOptions, toFlatString} from '../utils'
import {TweenManager} from '../common/tween'
import * as THREE from 'three'
import {Group} from "three"
import {VRManager, VR_DETECTED, Pointer} from 'webxr-boilerplate'
import SceneDef from './defs/SceneDef'
import {ASSET_TYPES, get3DObjectDef, is3DObjectType, parseBehaviorScript, TOTAL_OBJ_TYPES} from './Common'
import {AuthModule} from './AuthModule'
import {XRSupport} from './XRSupport'
import {PubnubLogger} from '../syncgraph/PubnubSyncWrapper'
import {ErrorCatcher} from './ErrorCatcher'


function attachUtilFunctions(obj) {
    obj.find = (match,list) => {
        if(!list) list = []
        if(match(obj)) list.push(obj)
        if(obj.children) obj.children.forEach(ch => {
            ch.find(match,list)
        })
        return list
    }
    obj.exists = ()=>true
}

export class ImmersivePlayer extends Component {
    constructor(props) {
        super(props)
        const opts = parseOptions({})
        if(!opts.doc) throw new Error("doc not specified")
        new TreeItemProvider(props.options)
        this.obj_map = {}
        this.three_map = {}
        this.title_map = {}
        this.previewUpdateNodes = []
        this.current_scene = null
        this.root = null
        this.behavior_map = {}
        this.behavior_assets = {}
        this.pendingAssets = []

        this.sceneAnchor = null

        this.logger = new PubnubLogger(opts.doc)
        this.scriptManager = new ScriptManager(new Adapter(this),this.logger)
        this.provider = {
            accessObject:(id)=>{
                if(!this.obj_map[id]) return {
                    exists:()=>false,
                }
                return this.obj_map[id]
            }
        }
    }

    componentDidMount() {
        this.logger.log("mounted ImmersivePlayer")
        const canvas = this.canvas
        if(XRSupport.supportsARKit()) {
            this.xr = new XRSupport()
            this.xr.getContext(canvas).then((context) => {
                this.initThreeJS(canvas,context)
                this.xr.setAnimationLoop( this.renderThreeWithCamera.bind(this))
                this.startScene()
            }).catch(err => {
                console.error('Error', err)
            })
        } else {
            this.initThreeJS(canvas,0)
            this.renderer.setAnimationLoop(this.renderThree.bind(this))
            this.startScene()
        }

    }

    startScene() {
        const opts = parseOptions({})
        AuthModule.getJSON(getDocsURL()+opts.doc).then((payload)=>{
            this.root = payload.graph
            this.logger.log("loaded payload",this.root)
            this.buildRoot(this.root)
            this.logger.log(this.root)
            if(this.root.defaultScene) {
                const sc = this.root.children.find(ch => ch.id  === this.root.defaultScene)
                this.setCurrentScene(sc)
            } else {
                const sc = this.root.children[0]
                this.setCurrentScene(sc)
            }
            Promise.all(this.pendingAssets).then(() => {
                this.logger.log("all assets loaded now. starting script manager")
                this.scriptManager.startRunning()
            })
        })
    }

    render() {
        return <div>
            {/*<div id="overlay">*/}
            {/*    <div id="inner">*/}
            {/*        <h1>Application Name</h1>*/}
            {/*        <div id="loading-indicator">*/}
            {/*            <label>loading</label>*/}
            {/*            <progress max="100" value="0" id="progress"></progress>*/}
            {/*        </div>*/}
            {/*        <button id="enter-button" disabled>VR not supported, play anyway</button>*/}
            {/*    </div>*/}
            {/*</div>*/}
            <ErrorCatcher logger={this.logger}>
                <canvas ref={c => this.canvas = c} width={600} height={400}
                    onClick={this.clickedCanvas}
                />
            </ErrorCatcher>
        </div>
    }

    clickedCanvas = (e) => {
        this.canvas.focus()
        const rect = this.canvas.getBoundingClientRect();
        const pointer = {
            x: ( e.clientX - rect.left ) / rect.width * 2 - 1,
            y: - ( e.clientY - rect.top ) / rect.height * 2 + 1,
        }
        this.logger.log("clicked on the canvas")
        this.raycaster.setFromCamera(pointer, this.camera);
        const scene = this.three_map[this.current_scene.id]
        const intersect = this.raycaster.intersectObjects(scene.children, true)
        if(intersect && intersect.length >= 1) {
            const inter = intersect.find(inter => inter.distance > 0)
            if(inter) {
                this.logger.log("found the interesction", inter)
                this.logger.log("intersections", intersect)
                const obj = inter.object
                this.logger.log("obj", obj)
                const gobj = this.obj_map[obj.userData.graphid]
                this.logger.log("jobj", gobj)
                this.scriptManager.performClickAction(gobj)
            }
        }
    }

    buildRoot(graph) {
        //init assets first
        graph.children.forEach(ch => {
            if(ch.type === TOTAL_OBJ_TYPES.ASSETS_LIST) return this.initAssets(ch)
        })
        graph.children.forEach(ch => {
            attachUtilFunctions(ch)
            if(ch.type === TOTAL_OBJ_TYPES.SCENE) return this.initObject(ch)
            if(ch.type === TOTAL_OBJ_TYPES.BEHAVIORS_LIST) return this.initBehaviors(ch)
        })
    }

    initObject(obj) {
        attachUtilFunctions(obj)
        this.obj_map[obj.id] = obj
        if(obj.title) this.title_map[obj.title] = obj
        let node = null
        if(obj.type === TOTAL_OBJ_TYPES.SCENE) {
            const scene = new SceneDef().makeNode(obj, this.provider)
            this.three_map[obj.id] = scene
            scene.userData.graphid = obj.id
            this.scenes.add(scene)
            scene.visible = false
            node = scene
        }
        obj.props = () => obj

        if(is3DObjectType(obj.type)) {
            node = get3DObjectDef(obj.type).makeNode(obj, this.provider)
            if(node.previewUpdate) this.previewUpdateNodes.push(node)
            this.three_map[obj.id] = node
            node.userData.graphid = obj.id
            on(node, 'click', () => {
                this.scriptManager.performClickAction(obj)
            })
        }
        if(obj.type === TOTAL_OBJ_TYPES.BEHAVIOR) {
            this.behavior_map[obj.id] = obj
        }

        if(obj.children) {
            obj.children.forEach(ch => {
                const chnode = this.initObject(ch)
                if(chnode) node.add(chnode)
            })
        }

        return node
    }

    initThreeJS(canvas, context) {
        this.tweenManager = new TweenManager()
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 50 );
        this.renderer = new THREE.WebGLRenderer( { antialias: true, canvas:canvas, context:context } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.gammaOutput = true
        this.renderer.vr.enabled = true;
        // this.sceneContainer.appendChild( this.renderer.domElement );
        this.vrmanager = new VRManager(this.renderer)
        this.audioListener = new THREE.AudioListener()
        this.camera.add(this.audioListener)
        if(!this.xr) this.scene.background = new THREE.Color(0x000000);
        this.camera.matrixAutoUpdate = false
        this.scene.add(this.camera)
        window.addEventListener( 'resize', ()=>{
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( window.innerWidth, window.innerHeight );
        }, false );
        const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
        light.position.set( 1, 1, 1 ).normalize();
        this.scene.add( light );
        this.scene.add(new THREE.AmbientLight(0xffffff,0.2))


        this.scenes = new Group()
        this.scene.add(this.scenes)

        this.raycaster = new THREE.Raycaster();

        // const $ = (sel) => document.querySelector(sel)
        // const on = (elem, type, cb) => elem.addEventListener(type,cb)

        // on($("#enter-button"),'click',()=>{
        //     $("#overlay").style.display = 'none'
        //     //we can start playing sound now
        // })
        /*
        this.vrmanager.addEventListener(VR_DETECTED,()=>{
            console.log("VR detected")
            $("#enter-button").removeAttribute('disabled',false)
            $("#enter-button").innerText = "enter vr"
            on($("#enter-button"),'click',()=> this.vrmanager.enterVR())
        })
         */

        // const WAIT_FOR_LOAD = false
        /*
        if(!WAIT_FOR_LOAD) {
            $("#loading-indicator").style.display = 'none'
            $("#enter-button").style.display = 'block'
            $("#enter-button").removeAttribute('disabled')
        }
         */

        /*
        //class which handles mouse and VR controller
        this.pointer = new Pointer(this, {
            intersectionFilter: ((o) => o.userData.clickable),
            cameraFollowMouse:false,
            mouseSimulatesController:false,
            enableLaser: true,
            laserLength: 20,
        })
         */

    }

    renderThreeWithCamera = (bounds,projectionMatrix,viewMatrix, time,frame) => {
        if(!this.scene || !this.camera) return
        this.camera.matrix.fromArray(viewMatrix)
        this.camera.matrixWorldNeedsUpdate = true
        this.camera.updateMatrixWorld()
        this.camera.projectionMatrix.fromArray(projectionMatrix)
        this.renderThree(time,frame)
    }

    renderThree = (time, frame) => {
        if(this.tweenManager) this.tweenManager.update(time)
        this.previewUpdateNodes.forEach(n => n.previewUpdate())
        if(this.pointer) this.pointer.tick(time)
        if(this.stats) this.stats.update(time)
        if(this.controller) this.controller.update(time)
        let session = null
        if(this.xr) session = this.xr.session
        this.scriptManager.tick(time, session)
        this.renderer.render( this.scene, this.camera );
    }

    initAssets(assets) {
        assets.children.forEach(obj => {
            this.logger.log("loading asset",obj)
            attachUtilFunctions(obj)
            this.obj_map[obj.id] =  obj
            if(obj.title) this.title_map[obj.title] = obj
        })
    }

    initBehaviors(behaviors) {
        behaviors.children.forEach(ch => {
            attachUtilFunctions(ch)
            this.obj_map[ch.id] =  ch
            if(ch.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT) {
                this.logger.log("loading behavior",ch)
                const prom = AuthModule.fetch(ch.src,{
                    method:'GET'
                }) .then(res => res.text())
                    .then(text => {
                        const info = parseBehaviorScript(text)
                        info.text = text
                        this.behavior_assets[ch.id] = info
                        return text
                    })
                this.pendingAssets.push(prom)
            }
        })
    }

    setCurrentScene(scene) {
        this.scenes.children.forEach(sc => sc.visible = false)
        if(this.three_map[scene.id]) this.three_map[scene.id].visible = true
        this.current_scene = scene
    }

}

// ================  SGP implementation =====================

class Adapter extends SceneGraphProvider {
    constructor(player) {
        super()
        this.player = player
        this.logger = this.player.logger
    }

    getCurrentScene() {
        return this.player.current_scene
    }
    getBehaviorsForObject (obj) {
        if(!obj.children) return []
        return obj.children.filter(ch => ch.type === TOTAL_OBJ_TYPES.BEHAVIOR)
    }
    getSceneObjects(sc) {
        return sc.children.filter(ch => is3DObjectType(ch.type))
    }
    getThreeObject (obj)  {
        if(obj.id) return this.player.three_map[obj.id]
        return this.player.three_map[obj]
    }
    getParsedBehaviorAsset (b) {
        return this.player.behavior_assets[b.behavior]
    }
    getAllBehaviors () {
        return Object.keys(this.player.behavior_map).map(key => this.player.behavior_map[key])
    }
    getAllScenes() {
        return Object.keys(this.player.obj_map)
            .map(key => this.player.obj_map[key])
            .filter(obj => obj.type === TOTAL_OBJ_TYPES.SCENE)
    }

    navigateScene (sceneid) {
        this.logger.log("navigating to ",sceneid)
        const scene = this.player.obj_map[sceneid]
        if(!scene) return this.logger.error("couldn't find scene for",sceneid)

        // @blair
        const sceneNode = this.player.three_map[sceneid]
        // this.logger.log("the scene node is",sceneNode)
        // this.logger.log("if it exists, scene anchor is", sceneNode.userData.sceneAnchor)

        if (!this.sceneAnchor || (this.sceneAnchor && scene.autoRecenter)) {
            // create a new scene anchor
            if (this.sceneAnchor) {
                this.player.xr.removeSceneAnchor(this.sceneAnchor, this.logger)
                this.sceneAnchor = null
            }
            this.player.xr.createSceneAnchor(sceneNode, this.logger).then(anchor => {
                this.sceneAnchor = anchor
            }).catch(error => {
                this.logger.error(`error creating new scene anchor: ${error}`)
            })
        } else {
            this.player.xr.updateAnchoredSceneNode(this.sceneAnchor, sceneNode, this.logger)
        }

        this.player.setCurrentScene(scene)
    }
    playMediaAsset (asset)  {
        if(asset.subtype === ASSET_TYPES.AUDIO) {
            this.logger.log("ImmersivePlayer playing audio", asset)
            const sound = new THREE.Audio(this.player.audioListener)
            const audioLoader = new THREE.AudioLoader()
            audioLoader.load(asset.src, (buffer) => {
                this.logger.log("loaded the buffer", buffer.length)
                sound.setBuffer(buffer);
                sound.setLoop(false);
                sound.setVolume(0.5);
                sound.play();
            });
        }
    }
    getGraphObjectByName(title) {
        return this.player.title_map[title]
    }
    getGraphObjectById (id) {
        return this.player.obj_map[id]
    }
    getCamera() {
        return this.player.camera
    }
    startImageRecognizer(info) {
        this.logger.log("starting the image recognizer")
        return new Promise((res,rej) => {
            //called when an anchor is started that wants to recognize an image
            // WebXR loaded?
            if(!this.player.xr || !this.player.xr.session) {
                this.logger.log("XR is not active?")
                return
            }

            this.player.xr.createDetectionImage(info,this.logger).then((name) => {
                // decorate the info.node with an xr anchor
                this.player.xr.startImageRecognizer(info, name, this.logger)
            })
        })
    }

    stopImageRecognizer(info) {
        this.logger.log("stopping the image recognizer")

        if(!this.player.xr || !this.player.xr.session) {
            this.logger.log("XR is not active?")
            return
        }

        this.player.xr.stopImageRecognizer(info, this.logger)
    }

    startGeoRecognizer(info) {
        // WebXR loaded?
        if(!this.player.xr || !this.player.xr.session) {
            this.logger.log("XR is not active?")
            return
        }

        // decorate the info.node with an xr anchor
        this.player.xr.addGeoAnchoredNode(info, this.logger)
    }

    stopGeoRecognizer(info) {
        // WebXR loaded?
        if(!this.player.xr || !this.player.xr.session) {
            this.logger.log("XR is not active?")
            return
        }

        // decorate the info.node with an xr anchor
        this.player.xr.stopGeoRecognizer(info, this.logger)
    }

}
