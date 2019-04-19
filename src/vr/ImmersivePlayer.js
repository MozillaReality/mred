import React, {Component} from 'react'
import ScriptManager from './ScriptManager'
import {getDocsURL} from '../TreeItemProvider'
import {GET_JSON, on, parseOptions} from '../utils'
import {TweenManager} from '../common/tween'
import * as THREE from 'three'
import {Group} from "three"
import VRManager, {VR_DETECTED} from 'webxr-boilerplate/vrmanager'
import SceneDef from './SceneDef'
import {ACTIONS, ASSET_TYPES, get3DObjectDef, is3DObjectType, TOTAL_OBJ_TYPES} from './Common'
import {Pointer} from 'webxr-boilerplate/pointer'

function parsePropsOfBehaviorContent(contents) {
    return Function('"use strict"; return('+contents+')')();
}


export class ImmersivePlayer extends Component {
    constructor(props) {
        super(props)
        this.obj_map = {}
        this.three_map = {}
        this.action_map = {}
        this.title_map = {}
        this.current_scene = null
        this.root = null
        this.behavior_map = {}
        this.behavior_assets = {}
        this.pendingAssets = []
        this.scriptManager = new ScriptManager({
            getCurrentScene: () => {
                return this.current_scene
            },
            getBehaviorsForObject: (obj) => {
                if(!obj.children) return []
                return obj.children.filter(ch => ch.type === TOTAL_OBJ_TYPES.BEHAVIOR)
            },
            getAllBehaviors: () => {
                console.log("all behaviors",this.behavior_map)
                return Object.keys(this.behavior_map).map(key => this.behavior_map[key])
            },
            getParsedBehaviorAsset: (b) => {
                // console.log("trying to load",b)
                const asset = this.behavior_assets[b.behavior]
                // console.log("found the asset",asset)
                return asset
                // console.log("pending assets",this.pendingAssets)
            },
            navigateScene: (sceneid) => {
                console.log("navigating to ",sceneid)
                const scene = this.obj_map[sceneid]
                if(!scene) return console.warn("couldn't find scene for",sceneid)
                this.setCurrentScene(scene)
            },
            getSceneObjects:(sc) => {
                // console.log("getting children for",sc)
                return sc.children.filter(ch => is3DObjectType(ch.type))
            },
            getGraphObjectById: (id) => {
                return this.obj_map[id]
            },
            findThreeObject: (id) => {
                return this.three_map[id]
            },
            playAudioAsset: (audio) => {
                console.log("trying to play",audio)
                const sound = new THREE.Audio(this.audioListener)
                const audioLoader = new THREE.AudioLoader()
                audioLoader.load(audio.src, function( buffer ) {
                    sound.setBuffer( buffer );
                    sound.setLoop( false );
                    sound.setVolume( 0.5 );
                    sound.play();
                });
            }
        })
    }

    componentDidMount() {
        this.initThreeJS()
        const opts = parseOptions({})
        GET_JSON(getDocsURL()+opts.doc).then((payload)=>{
            this.root = payload.graph
            this.buildRoot(this.root)
            console.log("root is",this.root)
            if(this.root.defaultScene) {
                const sc = this.root.children.find(ch => ch.id  === this.root.defaultScene)
                this.setCurrentScene(sc)
            }
            Promise.all(this.pendingAssets).then(() => {
                console.log("all assets loaded now")
                this.scriptManager.startRunning()
            })
        })
    }

    render() {
        return <div>
            <div id="overlay">
                <div id="inner">
                    <h1>Application Name</h1>
                    <div id="loading-indicator">
                        <label>loading</label>
                        <progress max="100" value="0" id="progress"></progress>
                    </div>
                    <button id="enter-button" disabled>VR not supported, play anyway</button>
                </div>
            </div>
            <div ref={c => this.sceneContainer = c}></div>
        </div>
    }

    buildRoot(graph) {
        graph.children.forEach(ch => {
            if(ch.type === TOTAL_OBJ_TYPES.SCENE) return this.initScene(ch)
            if(ch.type === TOTAL_OBJ_TYPES.ASSETS_LIST) return this.initAssets(ch)
            if(ch.type === TOTAL_OBJ_TYPES.BEHAVIORS_LIST) return this.initBehaviors(ch)
        })
    }

    initScene(def) {
        // console.log("making a scene",def)
        this.obj_map[def.id] = def
        const scene = new SceneDef().makeNode(def)
        this.three_map[def.id] = scene
        this.scenes.add(scene)
        this.title_map[def.title] = def
        def.children.forEach(ch => {
            this.obj_map[ch.id] = ch
            this.title_map[ch.title] = ch
            ch.props = () => {
                return ch
            }
            if(is3DObjectType(ch.type)) {
                const child = get3DObjectDef(ch.type).makeNode(ch)
                this.three_map[ch.id] = child
                on(child, 'click', () => {
                    this.scriptManager.performClickAction(ch)
                })
                scene.add(child)
                //TODO: Make this recursive
                if(ch.children) {
                    ch.children.forEach(cch => {
                        if(cch.type === TOTAL_OBJ_TYPES.BEHAVIOR) {
                            this.behavior_map[cch.id] = cch
                            cch.props = () => {
                                return cch
                            }
                        }
                    })
                }
            }
            if(ch.type === TOTAL_OBJ_TYPES.BEHAVIOR) {
                this.behavior_map[ch.id] = ch
            }
        })
        scene.visible = false
    }

    performAction(obj,type) {
        if(obj.trigger !== type) return
        const action = this.action_map[obj.action]
        if (action.subtype === ACTIONS.SCRIPT) return this.scriptManager.executeScriptAction(action,obj)
    }

    initThreeJS() {
        this.tweenManager = new TweenManager()
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xcccccc );
        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 50 );
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.gammaOutput = true
        this.renderer.vr.enabled = true;
        this.sceneContainer.appendChild( this.renderer.domElement );
        this.vrmanager = new VRManager(this.renderer)
        this.audioListener = new THREE.AudioListener()
        this.camera.add(this.audioListener)
        window.addEventListener( 'resize', ()=>{
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( window.innerWidth, window.innerHeight );
        }, false );
        this.renderer.setAnimationLoop(this.renderThree)
        const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
        light.position.set( 1, 1, 1 ).normalize();
        this.scene.add( light );
        this.scene.add(new THREE.AmbientLight(0xffffff,0.2))


        this.scenes = new Group()
        this.scene.add(this.scenes)

        const $ = (sel) => document.querySelector(sel)
        const on = (elem, type, cb) => elem.addEventListener(type,cb)

        on($("#enter-button"),'click',()=>{
            $("#overlay").style.display = 'none'
            //we can start playing sound now
        })

        this.vrmanager.addEventListener(VR_DETECTED,()=>{
            console.log("VR detected")
            $("#enter-button").removeAttribute('disabled',false)
            $("#enter-button").innerText = "enter vr"
            on($("#enter-button"),'click',()=> this.vrmanager.enterVR())
        })

        const WAIT_FOR_LOAD = false
        if(!WAIT_FOR_LOAD) {
            $("#loading-indicator").style.display = 'none'
            $("#enter-button").style.display = 'block'
            $("#enter-button").removeAttribute('disabled')
        }


        //class which handles mouse and VR controller
        this.pointer = new Pointer(this.scene,this.renderer,this.camera, {
            intersectionFilter: ((o) => o.userData.clickable),
            cameraFollowMouse:false,
            mouseSimulatesController:false,
            enableLaser: true,
            laserLength: 20,
        })

    }

    renderThree = (time) => {
        if(this.tweenManager) this.tweenManager.update(time)
        if(this.pointer) this.pointer.tick(time)
        if(this.stats) this.stats.update(time)
        if(this.controller) this.controller.update(time)
        this.scriptManager.tick(time)
        this.renderer.render( this.scene, this.camera );
    }

    initAssets(assets) {
        console.log("loading assets",assets.children)
        assets.children.forEach(ch => {
            console.log("loading asset",ch)
            this.obj_map[ch.id] =  ch
        })
    }

    initBehaviors(behaviors) {
        console.log("loading behaviors",behaviors.children)
        behaviors.children.forEach(ch => {
            this.obj_map[ch.id] =  ch
            if(ch.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT) {
                console.log("loading behavior",ch)
                const prom = fetch(ch.src)
                    .then(res => res.text())
                    .then(text => {
                        const info = parsePropsOfBehaviorContent(text)
                        info.text = text
                        this.behavior_assets[ch.id] = info
                        return text
                    })
                this.pendingAssets.push(prom)
            }
        })
    }

    setCurrentScene(scene) {
        // console.log('setting the current scene to',scene)
        this.scenes.children.forEach(sc => sc.visible = false)
        if(this.three_map[scene.id]) this.three_map[scene.id].visible = true
        this.current_scene = scene
    }

    findGraphObjectByTitle(title) {
        return this.title_map[title]
    }

    findThreeObject(obj) {
        return this.three_map[obj.id]
    }
}