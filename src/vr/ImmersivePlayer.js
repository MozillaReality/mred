import React, {Component} from 'react'
import ScriptManager, {SceneGraphProvider} from './ScriptManager'
import TreeItemProvider, {getAssetsURL, getDocsURL, getScriptsURL} from '../TreeItemProvider'
import {on, parseOptions, toFlatString} from '../utils'
import {TweenManager} from '../common/tween'
import * as THREE from 'three'
import {Group} from "three"
import {VRManager, VR_DETECTED, Pointer} from 'webxr-boilerplate'
import SceneDef from './defs/SceneDef'
import {ASSET_TYPES, get3DObjectDef, is3DObjectType, NONE_ASSET, parseBehaviorScript, TOTAL_OBJ_TYPES} from './Common'
import {AuthModule} from './AuthModule'
import {XRSupport} from './XRSupport'
import {PubnubLogger} from '../syncgraph/PubnubSyncWrapper'
import {ErrorCatcher} from './ErrorCatcher'
import {AssetsManager} from './AssetsManager'


function attachUtilFunctions(obj, obj_map) {
    obj.find = (match,list) => {
        if(!list) list = []
        if(match(obj)) list.push(obj)
        if(obj.children) obj.children.forEach(ch => {
            ch.find(match,list)
        })
        return list
    }
    obj.exists = ()=>true
    obj.getParent = () => {
        return obj_map[obj.parent]
    }
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
        this.assets_url_map = {}
        this.pendingAssets = []
        this.playing_audio = {}

        this.sceneAnchor = null

        this.logger = new PubnubLogger(opts.doc)
        this.scriptManager = new ScriptManager(new Adapter(this),this.logger)
        this.provider = {
            accessObject:(id)=>{
                if(!this.obj_map[id]) return {
                    exists:()=>false,
                }
                return this.obj_map[id]
            },
            getLogger:() => this.logger
        }
        this.assetsManager = new AssetsManager(this.provider)
        this.provider.assetsManager = this.assetsManager
    }

    componentDidMount() {
        this.logger.log("mounted ImmersivePlayer")
    }

    startScene() {
        const opts = parseOptions({})
        this.assetsManager.cacheAssetsList().then(()=> {
            AuthModule.getJSON(getDocsURL() + opts.doc).then((payload) => {
                this.root = payload.graph
                this.logger.log("loaded payload", this.root)
                this.buildRoot(this.root)
                this.logger.log(this.root)
                Promise.all(this.pendingAssets).then(() => {
                    this.logger.log("all assets loaded now. starting script manager")
                    this.scriptManager.startRunning()
                    if (this.root.defaultScene && this.root.defaultScene !== NONE_ASSET.id) {
                        const sc = this.root.children.find(ch => ch.id === this.root.defaultScene)
                        if(!sc) return this.logger.error("cannot find the default scene")
                        this.setCurrentScene(sc)
                    } else {
                        const sc = this.root.children[0]
                        this.setCurrentScene(sc)
                    }
                    this.scriptManager.startFirstScene()
                })
            })
        })
    }

    clickedStart = () => {
        console.log("clicked. play the sample audio")
        const $ = (sel) => document.querySelector(sel)
        $("#overlay").style.display = 'none'
        $("#test-audio").play()

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

    render() {
        return <div>
            <audio id={"test-audio"} src={"https://vr.josh.earth/assets/sounds/clang.mp3"}/>
            <div id="overlay">
                <div id="inner">
                    <div id="title">some title</div>
                    <button onClick={this.clickedStart}>click to start</button>
                    {/*<div id="loading-indicator">*/}
                    {/*    <label>loading</label>*/}
                    {/*    <progress max="100" value="0" id="progress"></progress>*/}
                    {/*</div>*/}
                    {/*<button id="enter-button" disabled>VR not supported, play anyway</button>*/}
                </div>
            </div>
            <ErrorCatcher logger={this.logger}>
                <canvas ref={c => this.canvas = c} width={600} height={400}
                    onClick={this.clickedCanvas}
                />
            </ErrorCatcher>
        </div>
    }

    clickedCanvas = (e) => {
        function findKnownParent(node) {
            if(!node) return null
            if(node.userData.graphid) return node
            return findKnownParent(node.parent)
        }

        this.logger.log("clicked on the canvas")
        this.canvas.focus()
        const rect = this.canvas.getBoundingClientRect();
        const pointer = {
            x: ( e.clientX - rect.left ) / rect.width * 2 - 1,
            y: - ( e.clientY - rect.top ) / rect.height * 2 + 1,
        }
        this.raycaster.setFromCamera(pointer, this.camera);
        const scene = this.three_map[this.current_scene.id]
        const intersect = this.raycaster.intersectObjects(scene.children, true)
        if(intersect && intersect.length >= 1) {
            const inter = intersect.find(inter => inter.distance > 0)
            if(inter) {
                //this.logger.log("found the interesction", inter)
                //this.logger.log("intersections", intersect)
                // let obj = inter.object
                let obj = findKnownParent(inter.object)

                //this.logger.log("obj", obj)
               // if (obj.userData && obj.userData.graphid) { 
                    const gobj = this.obj_map[obj.userData.graphid]
                    //this.logger.log("jobj", gobj)
                 //   if (gobj) {
                        this.scriptManager.performClickAction(gobj, e)
                  // }
               // }
            }
        }
    }

    buildRoot(graph) {
        //init assets first
        graph.children.forEach(ch => {
            if(ch.type === TOTAL_OBJ_TYPES.ASSETS_LIST) return this.initAssets(ch)
        })
        graph.children.forEach(ch => {
            attachUtilFunctions(ch, this.obj_map)
            if(ch.type === TOTAL_OBJ_TYPES.SCENE) return this.initObject(ch)
            if(ch.type === TOTAL_OBJ_TYPES.BEHAVIORS_LIST) return this.initBehaviors(ch)
        })
    }

    initObject(obj) {
        attachUtilFunctions(obj, this.obj_map)
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
            on(node, 'click', (e) => {
                this.scriptManager.performClickAction(obj, e)
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
            const body = document.documentElement
            this.camera.aspect = body.clientWidth / body.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( body.clientWidth, body.clientHeight);
        }, false );
        const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
        light.position.set( 1, 1, 1 ).normalize();
        this.scene.add( light );
        this.scene.add(new THREE.AmbientLight(0xffffff,0.2))

        this.scenes = new Group()
        this.scene.add(this.scenes)

        this.raycaster = new THREE.Raycaster();
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
            attachUtilFunctions(obj, this.obj_map)
            this.obj_map[obj.id] =  obj
            if(obj.title) this.title_map[obj.title] = obj
            this.assets_url_map[obj.id] = obj.url
        })
    }

    initBehaviors(behaviors) {
        behaviors.children.forEach(ch => {
            attachUtilFunctions(ch, this.obj_map)
            this.obj_map[ch.id] =  ch
            if(ch.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT) {
                const url = getScriptsURL()+ch.src
                this.logger.log("loading behavior",ch,'from',url)
                const prom = AuthModule.fetch(url,{ method:'GET' })
                    .then(res => res.text())
                    .then(text => {
                        const info = parseBehaviorScript(text)
                        info.text = text
                        this.behavior_assets[ch.id] = info
                        return text
                    }).catch((e)=>{
                        this.logger.error("error loading behavior",e)
                    })
                this.pendingAssets.push(prom)
            }
        })
    }

    setCurrentScene(scene) {
        // @blair
        const sceneNode = this.three_map[scene.id]
        // this.logger.log("the scene node is",sceneNode)
        // this.logger.log("if it exists, scene anchor is", sceneNode.userData.sceneAnchor)
        if (sceneNode  && this.xr) {
            const sceneAnchorNode = sceneNode.userData.sceneAnchor
            if (!sceneAnchorNode) {
                this.logger.error("no sceneNode? so no children?")
            } else {
                if (sceneAnchorNode.children) {
                    this.logger.log("scene has children: ", sceneNode.children.length)
                    this.logger.log("scene anchor has children: ", sceneAnchorNode.children.length)
                } else {
                    this.logger.log("no sceneNode children?")
                }

                if (!this.sceneAnchor || (this.sceneAnchor && scene.autoRecenter)) {
                    // create a new scene anchor
                    if (this.sceneAnchor) {
                        this.xr.removeSceneAnchor(this.sceneAnchor, this.logger)
                        this.sceneAnchor = null
                    }
                    this.xr.createSceneAnchor(sceneAnchorNode, this.logger).then(anchor => {
                        this.sceneAnchor = anchor
                    }).catch(error => {
                        this.logger.error(`error creating new scene anchor: ${error}`)
                    })
                } else {
                    this.xr.updateAnchoredSceneNode(this.sceneAnchor, sceneAnchorNode, this.logger)
                }
            }
        }
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
        if(!this.player.current_scene) this.logger.error("the current scene is null")
        return this.player.current_scene
    }
    getSceneObjects(sc) {
        return sc.children.filter(ch => is3DObjectType(ch.type))
    }
    getBehaviorsForObject (obj) {
        if(!obj.children) return []
        return obj.children.filter(ch => ch.type === TOTAL_OBJ_TYPES.BEHAVIOR)
    }
    getThreeObject (obj)  {
        if (!obj) {
            this.logger.error("getThreeObject got invalid obj")
        } else {
            if(obj.id) return this.player.three_map[obj.id]
        }
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
        this.player.setCurrentScene(scene)
    }
    playMediaAsset (asset, trusted=false)  {
        console.log("playing the media asset",asset)
        if(asset.subtype === ASSET_TYPES.AUDIO) {
            if(this.player.playing_audio[asset.id]) {
                this.logger.log("already playing. restarting it")
                const sound = this.player.playing_audio[asset.id]
                if(sound.isPlaying) {
                    sound.stop()
                    sound.play()
                } else {
                    sound.play()
                }
            } else {
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
                this.player.playing_audio[asset.id] = sound
            }
        }
        if(asset.subtype === ASSET_TYPES.VIDEO) {
            this.player.provider.assetsManager.playMediaAsset(asset,trusted)
        }
    }

    stopMediaAsset(asset) {
        if(asset.subtype === ASSET_TYPES.AUDIO) {
            if(this.player.playing_audio[asset.id]) {
                this.player.playing_audio[asset.id].stop()
                delete this.player.playing_audio[asset.id]
                this.player.playing_audio[asset.id] = null
            }
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

    getTweenManager() {
        return this.player.tweenManager
    }

    startLocalAnchor(info) {
        this.logger.log("starting vanilla anchor")
        if(!this.player.xr || !this.player.xr.session) {
            this.logger.log("XR is not active?")
            return
        }
        this.player.xr.createLocalAnchorFromHitTest(info,info.screenx || 0,info.screeny || 0,this.logger)
    }

    stopLocalAnchor(info) {
        this.logger.log("stopping vanilla anchor")
        if(!this.player.xr || !this.player.xr.session) {
            this.logger.log("XR is not active?")
            return
        }
        this.player.xr.stopLocalAnchor(info,this.logger)
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

    startGeoTracker(info) {
        // WebXR loaded?
        return new Promise((res, rej) => {
            if(!this.player.xr || !this.player.xr.session) {
                this.logger.log("XR is not active?")
                return
            }

            this.player.xr.createGeoAnchor(info, this.logger).then(() => {
                // decorate the info.node with an xr anchor
                this.player.xr.addGeoAnchoredNode(info, this.logger)
            })
        })
    }

    stopGeoTracker(info) {
        // WebXR loaded?
        if(!this.player.xr || !this.player.xr.session) {
            this.logger.log("XR is not active?")
            return
        }

        // decorate the info.node with an xr anchor
        this.player.xr.stopGeoTracker(info, this.logger)
    }

}
