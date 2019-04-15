import React, {Component} from 'react'
import ScriptManager from './ScriptManager'
import {getDocsURL} from '../TreeItemProvider'
import {GET_JSON, on, parseOptions} from '../utils'
import {TweenManager} from '../common/tween'
import * as THREE from 'three'
import {Group} from "three"
import VRManager, {VR_DETECTED} from 'webxr-boilerplate/vrmanager'
import SceneDef from './SceneDef'
import {ACTIONS, get3DObjectDef, TRIGGERS} from './Common'
import {Pointer} from 'webxr-boilerplate/pointer'

export class ImmersivePlayer extends Component {
    constructor(props) {
        super(props)
        this.obj_node_map = {}
        this.three_map = {}
        this.action_map = {}
        this.title_map = {}
        this.scriptManager = new ScriptManager(this)
    }

    componentDidMount() {
        this.initThreeJS()
        const opts = parseOptions({})
        GET_JSON(getDocsURL()+opts.doc).then((payload)=>{
            this.buildScene(payload.graph)
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

    buildScene(graph) {
        console.log("building",graph)
        graph.children.forEach(ch => {
            if(ch.type === 'scene') return this.initScene(ch)
            if(ch.type === 'actions') return this.initActions(ch)
        })
    }

    initScene(def) {
        console.log("making a scene",def)
        const scene = new SceneDef().makeNode(def)
        this.three_map[def.id] = scene
        this.scenes.add(scene)
        this.title_map[def.title] = def
        def.children.forEach(ch => {
            this.title_map[ch.title] = ch
            const child = get3DObjectDef(ch.type).makeNode(ch)
            this.three_map[ch.id] = child
            on(child,'click',()=>{
                if(ch.action) this.performAction(ch, TRIGGERS.CLICK)
            })
            scene.add(child)
        })
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
        this.renderer.render( this.scene, this.camera );
    }


    initActions(acts) {
        acts.children.forEach(act => {
            this.action_map[act.id] = act
        })
    }




    findGraphObjectByTitle(title) {
        return this.title_map[title]
    }

    findThreeObject(obj) {
        return this.three_map[obj.id]
    }
}