import React, {Component} from 'react'
import * as THREE from 'three'

import './VREditor.css'
// for pointer (mouse, controller, touch) support
import {Pointer, POINTER_CLICK, POINTER_MOVE} from 'webxr-boilerplate/pointer'
import VRStats from "webxr-boilerplate/vrstats"
// enter and exit VR
import VRManager, {VR_DETECTED} from "webxr-boilerplate/vrmanager"
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import {fetchGraphObject} from '../syncgraph/utils'
import {TranslateControl} from './TranslateControl'
import panel2d from "./panel2d/panel2d";
import button2d from "./panel2d/button2d";
import group2d from "./panel2d/group2d"
import SceneDef from "./SceneDef"
import {on} from "../utils"
import {get3DObjectDef, is3DObjectType, SIMPLE_COLORS, toRad} from './Common'

const {SET_PROPERTY, INSERT_ELEMENT, DELETE_ELEMENT} = require("syncing_protocol");





export default class ImmersiveVREditor extends Component {

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return false
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
        //clear selection when click on the bg
        on(this.pointer,POINTER_CLICK,()=> SelectionManager.clearSelection())

        this.loadScene()
    }

    selectionChanged() {
        const sel = SelectionManager.getSelection()
        if (sel === null) return this.controls.detach(this.selectedNode)
        const node = this.findNode(sel)
        if(this.selectedNode !== node) this.controls.detach(this.selectedNode)
        this.selectedNode = node
        if (this.selectedNode) this.controls.attach(this.selectedNode, this.pointer)
    }

    initContent() {
        this.scene.background = new THREE.Color( 0xcccccc );
        const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
        light.position.set( 1, 1, 1 ).normalize();
        this.scene.add( light );
        this.scene.add(new THREE.AmbientLight(0xffffff,0.2))

        // enable stats visible inside VR
        this.stats = new VRStats(this.renderer)
        this.camera.add(this.stats)
        this.scene.add(this.camera)

        //class which handles mouse and VR controller
        this.pointer = new Pointer(this.scene,this.renderer,this.camera, {
            intersectionFilter: ((o) => o.userData.clickable),
            cameraFollowMouse:false,
            mouseSimulatesController:false,
            enableLaser: true,
        })


        const STICK_HEIGHT = 1.0
        const stick = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.1,0.1,STICK_HEIGHT),
            new THREE.MeshLambertMaterial({color:'aqua'})
        )
        stick.position.z = -STICK_HEIGHT/2;
        stick.rotation.x = toRad(-90)
        this.pointer.controller1.add(stick)


        this.controls = new TranslateControl()
        on(this.controls,'change',(e)=>{
            const sel = SelectionManager.getSelection()
            if(sel) {
                const node = this.findNode(sel)
                const prov = this.props.provider
                prov.quick_setPropertyValue(sel,'tx',node.position.x)
                prov.quick_setPropertyValue(sel,'ty',node.position.y)
                prov.quick_setPropertyValue(sel,'tz',node.position.z)
            }
        })

        this.navcursor = new THREE.Mesh(
            new THREE.RingBufferGeometry(0.2,0.3,32),
            new THREE.MeshLambertMaterial({color:'yellow'})
        )
        this.navcursor.rotation.x = toRad(-90)
        this.navcursor.position.y = 0.1
        this.scene.add(this.navcursor)


        this.tools = new panel2d(this.scene,this.camera)
        this.tools.position.set(-1,1,-3)
        this.scene.add(this.tools)



        this.tools.add(new button2d()
            .setAll({ x:5, y:5, text:'add box'})
            .on(POINTER_CLICK, this.props.provider.addCube))
        this.tools.add(new button2d()
            .setAll({ x:5, y:5+30, text:'add sphere'})
            .on(POINTER_CLICK, this.props.provider.addSphere))
        this.tools.add(new button2d()
            .setAll({ x:5, y:5+30+30, text:'delete'})
            .on(POINTER_CLICK, this.props.provider.deleteObject))
        this.tools.add(new button2d()
            .setAll({ x:5, y:5+30+30+30, text:'save'})
            .on(POINTER_CLICK, this.props.provider.save))

        const rowLayout = (panel)=>{
            let x = 0
            panel.comps.forEach((c)=>{
                c.x=x
                c.y=0
                x += c.w+panel.padding
            })
        }

        const color_group = new group2d().setAll({ x:5, y:5+30+30+30+30, w:235, h:35, layout:rowLayout})
        SIMPLE_COLORS.forEach(c => {
            color_group.add(new button2d()
                .setAll({text:' ', normalBg:c })
                .on(POINTER_CLICK,()=>this.props.provider.setColor(c))
            )
        })

        this.tools.add(color_group)

        this.tools.redraw()

    }


    updateScene(op) {
        const graph = this.props.provider.getDataGraph()
        if (op.type === INSERT_ELEMENT) {
            const objid = op.value
            const obj = fetchGraphObject(graph, objid)
            if (obj.type === 'scene') {
                this.populateNode(objid)
                this.setCurrentSceneId(objid)
                return
            }
            if(is3DObjectType(obj.type)) return this.sceneWrapper.add(this.populateNode(objid))
            console.warn("unknown object type", obj)
            return
        }
        if (op.type === SET_PROPERTY) {
            const node = this.findNode(op.object)
            if (node) {
                const obj = fetchGraphObject(graph, op.object)
                if(obj.type === 'scene') return new SceneDef().updateProperty(node,obj,op,this.props.provider)
                if(is3DObjectType(obj.type)) return get3DObjectDef(obj.type).updateProperty(node,obj,op, this.props.provider)
            } else {
                console.log("could not find the node for object id:", op)
            }
            return
        }
        if(op.type === DELETE_ELEMENT) {
            console.log("processing delerte",op)
            const node = this.findNode(op.value)
            console.log("the node iss",node)
            const obj = fetchGraphObject(graph,op.value)
            console.log('the objcect is',obj)
            if(is3DObjectType(obj.type)) this.sceneWrapper.remove(node)
            return
        }
        console.log('skipping', op.type)
    }
    documentSwapped() {
        console.log("totally new document!")
        //nuke all the old stuff
        if (this.sceneWrapper) {
            this.sceneWrapper.remove(this.controls)
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
            this.scene.remove(this.controls)
            this.sceneWrapper = null
        }
        this.setState({scene: sceneid})
        this.sceneWrapper = this.findNode(sceneid)
        this.scene.add(this.sceneWrapper)
        this.sceneWrapper.add(this.controls)
        const floor = new SceneDef().getFloorPart(this.sceneWrapper)
        if(floor) {
            floor.userData.clickable = true
            on(floor, POINTER_MOVE, (e) => {
                this.navcursor.position.x = e.point.x
                this.navcursor.position.z = e.point.z
            })
            on(floor, POINTER_CLICK, (e) => {
                this.sceneWrapper.position.x -= e.point.x
                this.sceneWrapper.position.z -= e.point.z + 3
            })
        }
    }

    loadScene() {
        console.log("loading the final scene")
        // const graph = this.props.provider.getDataGraph()
        // console.log("history is",this.props.provider.getDocHistory())
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
        if(is3DObjectType(obj.type)) {
            const nodeobj = get3DObjectDef(obj.type).makeNode(obj)
            this.insertNodeMapping(nodeid, nodeobj)
            return nodeobj
        }
        if (obj.type === 'scene') {
            const scene = new SceneDef().makeNode(obj)
            this.insertNodeMapping(nodeid, scene)
            return scene
        }
        console.warn("cannot populate node for type", obj.type)
    }

}


