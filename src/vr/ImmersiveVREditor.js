import React, {Component} from 'react'
import * as THREE from 'three'

import './VREditor.css'

// for pointer (mouse, controller, touch) support
import {POINTER_CLICK, POINTER_ENTER, POINTER_EXIT, Pointer} from 'webxr-boilerplate/pointer'
import VRStats from "webxr-boilerplate/vrstats"
// enter and exit VR
import VRManager, {VR_DETECTED} from "webxr-boilerplate/vrmanager"
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import TransformControls from './TransformControls'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'

const {DocGraph, CommandGenerator, SET_PROPERTY, INSERT_ELEMENT} = require("syncing_protocol");

function fetchGraphObject(graph, child) {
    const obj = {}
    graph.getPropertiesForObject(child).forEach(key => {
        obj[key] = graph.getPropertyValue(child,key)
    })
    return obj
}


export default class ImmersiveVREditor extends Component {


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
            <div ref={c => this.wrapper = c}></div>
        </div>
    }


    componentDidMount() {
        this.initScene()
        this.renderer.setAnimationLoop(this.render3.bind(this))
    }

    render3(time) {
        //update the pointer and stats, if configured
        if(this.pointer) this.pointer.tick(time)
        if(this.stats) this.stats.update(time)
        this.renderer.render( this.scene, this.camera );
    }


    initScene() {

        const $ = (sel) => document.querySelector(sel)
        const on = (elem, type, cb) => elem.addEventListener(type,cb)

        const container = this.wrapper
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 50 );
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        const renderer = this.renderer
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.gammaOutput = true
        renderer.vr.enabled = true;
        container.appendChild( renderer.domElement );
        this.vrmanager = new VRManager(renderer)

        this.initContent()

        window.addEventListener( 'resize', ()=>{
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( window.innerWidth, window.innerHeight );
        }, false );


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

        this.props.provider.onRawChange(this.updateScene.bind(this))
        this.props.provider.on(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED, this.documentSwapped.bind(this))
        SelectionManager.on(SELECTION_MANAGER.CHANGED, this.selectionChanged.bind(this))

        this.loadScene()
    }

    selectionChanged() {
        const sel = SelectionManager.getSelection()
        if (sel === null) return
        const graph = this.props.provider.getDataGraph()
        const obj = fetchGraphObject(graph, sel)
        console.log(obj)
        const node = this.findNode(sel)
        console.log(node)
        if (node) {
            this.controls.attach(node)
        }
    }


    initContent() {
        const $ = (sel) => document.querySelector(sel)
        const on = (elem, type, cb) => elem.addEventListener(type,cb)
        this.scene.background = new THREE.Color( 0xcccccc );
        //a standard light
        const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
        light.position.set( 1, 1, 1 ).normalize();
        this.scene.add( light );

        this.scene.add(new THREE.AmbientLight(0xffffff,0.2))





        // enable stats visible inside VR
        this.stats = new VRStats(this.renderer)
        //this.stats.position.x = 0
        // this.stats.position.y = -1
        this.camera.add(this.stats)
        this.scene.add(this.camera)

        //class which handles mouse and VR controller
        this.pointer = new Pointer(this.scene,this.renderer,this.camera, {

            //Pointer searches everything in the scene by default
            //override this to match just certain things
            intersectionFilter: ((o) => o.userData.clickable),

            //make the camera pan when moving the mouse. good for simulating head turning on desktop
            cameraFollowMouse:false,

            // set to true to move the controller node forward and tilt with the mouse.
            // good for testing VR controls on desktop
            mouseSimulatesController:false,

            //turn this off if you provide your own pointer model
            enableLaser: true,
        })


        const STICK_HEIGHT = 1.0
        const stick = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.1,0.1,STICK_HEIGHT),
            new THREE.MeshLambertMaterial({color:'aqua'})
        )
        const toRad = (degrees) => degrees*Math.PI/180
        stick.position.z = -STICK_HEIGHT/2;
        stick.rotation.x = toRad(-90)
        this.pointer.controller1.add(stick)


        this.controls = new TransformControls(this.camera, this.renderer.domElement)
        this.controls.addEventListener('change',(e)=>{
            const sel = SelectionManager.getSelection()
            if(sel) {
                const node = this.findNode(sel)
                const prov = this.props.provider
                prov.quick_setPropertyValue(sel,'tx',node.position.x)
                prov.quick_setPropertyValue(sel,'ty',node.position.y)
                prov.quick_setPropertyValue(sel,'tz',node.position.z)
            }
        })
        this.scene.add(this.controls)


    }


    updateScene(op) {
        const graph = this.props.provider.getDataGraph()
        if (op.type === INSERT_ELEMENT) {
            console.log('running', op.type)
            const objid = op.value
            const obj = fetchGraphObject(graph, objid)
            if (obj.type === 'scene') {
                const scene = this.populateNode(objid)
                this.setCurrentSceneId(objid)
                return
            }
            if (obj.type === 'cube') {
                const cube = this.populateNode(objid)
                this.sceneWrapper.add(cube)
                return
            }
            console.warn("unknown object type", obj)
            return
        }
        if (op.type === SET_PROPERTY) {
            console.log('running', op.type)
            const node = this.findNode(op.object)
            if (node) {
                if (op.name === 'tx') node.position.x = parseFloat(op.value)
                if (op.name === 'ty') node.position.y = parseFloat(op.value)
                if (op.name === 'tz') node.position.z = parseFloat(op.value)
            } else {
                console.log("could not find the node for object id:", op)
            }
            return
        }
        console.log('skipping', op.type)
    }
    documentSwapped() {
        console.log("totally new document!")
        //nuke all the old stuff
        if (this.sceneWrapper) {
            this.scene.remove(this.sceneWrapper)
            this.sceneWrapper = null
        }
        this.obj_node_map = {}
        this.setState({scene: -1})
        //make new stuff
        const hist = this.props.provider.getDocHistory()
        console.log("==== replaying history")
        hist.forEach(op => this.updateScene(op))
    }

    setCurrentSceneId(sceneid) {
        if (this.sceneWrapper) {
            this.scene.remove(this.sceneWrapper)
            this.sceneWrapper = null
        }
        this.setState({scene: sceneid})
        this.sceneWrapper = this.findNode(sceneid)
        this.scene.add(this.sceneWrapper)
    }

    loadScene() {
        console.log("loading the final scene")
        const graph = this.props.provider.getDataGraph()
        console.log("history is",this.props.provider.getDocHistory())
    }

    insertNodeMapping(id, node) {
        if (typeof id !== 'string') throw new Error("cannot map an object to an object. invalid call in insertNodeMapping")
        this.obj_node_map[id] = node
        node.userData.graphid = id
    }

    findNode(id) {
        if (!this.obj_node_map[id]) console.warn("could not find node for id", id)
        return this.obj_node_map[id]
    }

    populateNode(nodeid) {
        const graph = this.props.provider.getDataGraph()
        const obj = fetchGraphObject(graph, nodeid)
        if (obj.type === 'cube') {
            const cube = new THREE.Mesh(
                new THREE.BoxGeometry(obj.width, obj.height, obj.depth),
                new THREE.MeshLambertMaterial({color: 'red'})
            )
            cube.userData.clickable = true
            cube.addEventListener('click',(e)=>{
                console.log('clicked on it',cube.userData.graphid)
                SelectionManager.setSelection(cube.userData.graphid)
            })
            cube.position.set(obj.tx, obj.ty, obj.tz)
            this.insertNodeMapping(nodeid, cube)
            return cube
        }
        if (obj.type === 'scene') {
            const scene = new THREE.Group()
            this.insertNodeMapping(nodeid, scene)
            return scene
        }

        console.warn("cannot populate node for type", obj.type)
    }

}
