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
import {TweenManager} from "../common/tween"
import {
    ACTIONS,
    get3DObjectDef,
    is3DObjectType,
    OBJ_TYPES,
    SIMPLE_COLORS,
    toRad,
    TOTAL_OBJ_TYPES,
    TRIGGERS
} from './Common'
//use the oculus go controller
import ThreeDOFController from "./3dof.js"

const {SET_PROPERTY, CREATE_OBJECT, INSERT_ELEMENT, DELETE_ELEMENT} = require("syncing_protocol");


export default class ImmersiveVREditor extends Component {
    constructor(props) {
        super(props)
        this.obj_node_map = {}
    }

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
        this.sceneWrappers = {}
        this.initScene()
        this.renderer.setAnimationLoop(this.render3.bind(this))
    }

    render3(time) {
        //update the pointer and stats, if configured
        if(this.tweenManager) this.tweenManager.update(time)
        if(this.pointer) this.pointer.tick(time)
        if(this.stats) this.stats.update(time)
        if(this.controller) this.controller.update(time)
        this.renderer.render( this.scene, this.camera );
    }

    initScene() {

        const $ = (sel) => document.querySelector(sel)
        const on = (elem, type, cb) => elem.addEventListener(type,cb)

        const container = this.wrapper
        this.tweenManager = new TweenManager()
        this.scene = new THREE.Scene();
        this.stageRot = new THREE.Group()
        this.scene.add(this.stageRot)
        this.stagePos = new THREE.Group()
        this.stageRot.add(this.stagePos)
        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 50 );
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        const renderer = this.renderer
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.gammaOutput = true
        renderer.vr.enabled = true;
        container.appendChild( renderer.domElement );
        this.vrmanager = new VRManager(renderer)

        this.audioListener = new THREE.AudioListener()
        this.camera.add(this.audioListener)

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

        this.props.provider.onRawChange(this.updateSceneOp.bind(this))
        this.props.provider.on(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED, this.documentSwapped.bind(this))
        SelectionManager.on(SELECTION_MANAGER.CHANGED, this.selectionChanged.bind(this))
        //clear selection when click on the bg
        on(this.pointer,POINTER_CLICK,()=> SelectionManager.clearSelection())

        this.controller = new ThreeDOFController(this.stagePos, this.stageRot)
        on(this.controller,'move', this.standardProximityHandler)

        this.loadScene()
    }

    selectionChanged() {
        const sel = SelectionManager.getSelection()
        if (sel === null && this.controls) return this.controls.detach(this.selectedNode)
        const node = this.findNode(sel)
        if(this.selectedNode !== node && this.controls) this.controls.detach(this.selectedNode)
        this.selectedNode = node
        if (this.selectedNode && this.controls) this.controls.attach(this.selectedNode, this.pointer)
    }

    performAction(action, target) {
        //old style, navigate to a scene
        if(action.type === 'scene') return this.swapScene(action.id)
        if (action.subtype === ACTIONS.ANIMATE) return this.animateTargetObject(action, target)
        if (action.subtype === ACTIONS.SOUND) return this.playAudioAsset(action, target)
        if (action.subtype === ACTIONS.SCRIPT) return this.executeScriptAction(action, target)
        if (action.subtype === 'asset' && action.subtype === 'audio') return this.playAudioAsset(action, target)
    }

    performClickOnSelection = () => {
        const sel = SelectionManager.getSelection()
        if(!sel) return
        const obj = fetchGraphObject(this.props.provider.getDataGraph(),sel)
        if(!obj) return
        if(obj.trigger !== TRIGGERS.CLICK) return console.log("not the right trigger type")
        const actionObj = this.props.provider.accessObject(obj.action)
        if(!actionObj) return
        if(actionObj.type === TOTAL_OBJ_TYPES.SCENE) return this.swapScene(actionObj.id)
        this.performAction(actionObj, obj)
    }

    performProximityOnSelection = () => {
        const sel = SelectionManager.getSelection()
        if(!sel) return
        const obj = fetchGraphObject(this.props.provider.getDataGraph(),sel)
        if(!obj) return
        if(obj.trigger !== TRIGGERS.PROXIMITY) return console.log("not the right trigger type")
        const actionObj = this.props.provider.accessObject(obj.action)
        if(!actionObj) return
        this.performAction(actionObj, obj)
    }

    standardViewClickHandler = (e)  => {
        const id = e.target.userData.graphid
        const obj = fetchGraphObject(this.props.provider.getDataGraph(),id)
        if(!obj) return
        if(obj.trigger !== TRIGGERS.CLICK) return console.log("not the right trigger type")
        const actionObj = this.props.provider.accessObject(obj.action)
        if(!actionObj) return
        if(actionObj.type === TOTAL_OBJ_TYPES.SCENE) return this.swapScene(actionObj.id)
        this.performAction(actionObj, obj)
    }

    standardProximityHandler = (pos) => {
        //JOSH: for now only do proxmity check in view mode, not edit mode
        if(this.props.editable) return

        const scene_id = Object.keys(this.sceneWrappers).find(key => this.sceneWrappers[key].visible)
        const scene = this.sceneWrappers[scene_id]
        // const scene = this.props.provider.accessObject(scene_id)
        const closest = scene.children.filter(ch => {
            const pos = this.stagePos.position.clone()
            pos.x = -pos.x
            pos.z = -pos.z
            if(ch.userData.clickable && ch.position.distanceTo(pos) < 2.5) return true
            return false
        })
        if(closest.length > 0) {
            const obj = fetchGraphObject(this.props.provider.getDataGraph(),closest[0].userData.graphid)
            if(!obj) return
            const actionObj = this.props.provider.accessObject(obj.action)
            if(!actionObj) return
            if(actionObj.trigger !== TRIGGERS.PROXIMITY) return
            this.performAction(actionObj, obj)
        }

    }


    initContent() {
        this.scene.background = new THREE.Color( 0xcccccc );
        const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
        light.position.set( 1, 1, 1 ).normalize();
        this.scene.add( light );
        this.scene.add(new THREE.AmbientLight(0xffffff,0.2))

        // enable stats visible inside VR
        this.stats = new VRStats(this.renderer)
        if(this.props.editable) {
            this.camera.add(this.stats)
        }
        this.scene.add(this.camera)

        //class which handles mouse and VR controller
        this.pointer = new Pointer(this.scene,this.renderer,this.camera, {
            intersectionFilter: ((o) => o.userData.clickable),
            cameraFollowMouse:false,
            mouseSimulatesController:false,
            enableLaser: true,
            laserLength: 20,
        })


        const STICK_HEIGHT = 1.0
        const stick = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.1,0.1,STICK_HEIGHT),
            new THREE.MeshLambertMaterial({color:'aqua'})
        )
        stick.position.z = -STICK_HEIGHT/2;
        stick.rotation.x = toRad(-90)
        this.pointer.controller1.add(stick)


        if(this.props.editable) {
            this.controls = new TranslateControl()
            this.controls.name = 'Controls'
            on(this.controls, 'change', (e) => {
                const sel = SelectionManager.getSelection()
                if (sel) {
                    const node = this.findNode(sel)
                    const prov = this.props.provider
                    prov.quick_setPropertyValue(sel, 'tx', node.position.x)
                    prov.quick_setPropertyValue(sel, 'ty', node.position.y)
                    prov.quick_setPropertyValue(sel, 'tz', node.position.z)
                }
            })
        }

        // this.navcursor = new THREE.Mesh(
        //     new THREE.RingBufferGeometry(0.2,0.3,32),
        //     new THREE.MeshLambertMaterial({color:'yellow'})
        // )
        // this.navcursor.rotation.x = toRad(-90)
        // this.navcursor.position.y = 0.1
        // this.scene.add(this.navcursor)


        if(this.props.editable) {
            this.tools = new panel2d(this.scene, this.camera)
            this.tools.position.set(-1, 1, -3)
            this.scene.add(this.tools)


            this.tools.add(new button2d()
                .setAll({x: 5, y: 5, text: 'add box'})
                .on(POINTER_CLICK, () => this.props.provider.add3DObject(OBJ_TYPES.cube)))
            this.tools.add(new button2d()
                .setAll({x: 5, y: 5 + 30, text: 'add sphere'})
                .on(POINTER_CLICK, () => this.props.provider.add3DObject(OBJ_TYPES.sphere)))
            this.tools.add(new button2d()
                .setAll({x: 5, y: 5 + 30 + 30, text: 'delete'})
                .on(POINTER_CLICK, this.props.provider.deleteObject))
            this.tools.add(new button2d()
                .setAll({x: 5, y: 5 + 30 + 30 + 30, text: 'save'})
                .on(POINTER_CLICK, this.props.provider.save))
            this.tools.add(new button2d()
                .setAll({x: 5, y: 5 + 30 * 4, text: 'click'})
                .on(POINTER_CLICK, this.performClickOnSelection)
            )
            this.tools.add(new button2d()
                .setAll({x: 60, y: 5 + 30 * 4, text: 'proximity'})
                .on(POINTER_CLICK, this.performProximityOnSelection)
            )

            const rowLayout = (panel) => {
                let x = 0
                panel.comps.forEach((c) => {
                    c.x = x
                    c.y = 0
                    x += c.w + panel.padding
                })
            }

            const color_group = new group2d().setAll({x: 5, y: 5 + 30 * 5, w: 235, h: 35, layout: rowLayout})
            SIMPLE_COLORS.forEach(c => {
                color_group.add(new button2d()
                    .setAll({text: ' ', normalBg: c})
                    .on(POINTER_CLICK, () => this.props.provider.setColor(c))
                )
            })

            this.tools.add(color_group)

            this.tools.redraw()
        }

    }


    updateSceneOp(op) {
        const graph = this.props.provider.getDataGraph()
        //only do scenes with create_object
        if (op.type === CREATE_OBJECT) {
            if(op.defaults) {
                //console.log("creating object with defaults",op.defaults)
                if(op.defaults.type === 'scene') {
                    let node =  this.findNode(op.id)
                    if(node) {
                        // console.log("scene already exists. skipping", node.name)
                    } else {
                        // console.log("Making a real scene", op)
                        const obj = fetchGraphObject(graph, op.id)
                        node = new SceneDef().makeNode(obj)
                        this.insertNodeMapping(op.id,node)
                        this.sceneWrappers[op.id] = node
                        this.stagePos.add(node)
                        // this.scene.add(node)
                        this.swapScene(op.id)
                    }
                }
            }
        }
        // other objects are done with insert_element
        if (op.type === INSERT_ELEMENT) {
            const objid = op.value
            const obj = fetchGraphObject(graph, objid)
            if (obj.type === 'scene') return // console.log("skipping insert scene")
            if(is3DObjectType(obj.type)) {
                const nodeObj = get3DObjectDef(obj.type).makeNode(obj)
                if(this.props.editable) {
                    on(nodeObj, POINTER_CLICK, e => SelectionManager.setSelection(nodeObj.userData.graphid))
                } else {
                    on(nodeObj, POINTER_CLICK, this.standardViewClickHandler)
                }
                this.insertNodeMapping(objid, nodeObj)
                this.sceneWrappers[obj.parent].add(nodeObj)
                return
            }
            if(obj.type === 'assets') return
            if(obj.type === 'asset') return
            console.warn("unknown object type", obj)
            return
        }
        if (op.type === SET_PROPERTY) {
            const obj = fetchGraphObject(graph, op.object)
            if(obj.type === 'asset') return
            if(obj.type === 'assets') return
            const node = this.findNode(op.object)
            if (node) {
                if(op.name === 'parent') return
                if(obj.type === 'scene') return new SceneDef().updateProperty(node,obj,op,this.props.provider)
                if(is3DObjectType(obj.type)) return get3DObjectDef(obj.type).updateProperty(node,obj,op, this.props.provider)
            } else {
                console.log("could not find the node for object id:", op)
                console.log("objects are",this.obj_node_map)
            }
            return
        }
        if(op.type === DELETE_ELEMENT) {
            const obj = fetchGraphObject(graph,op.value)
            if(is3DObjectType(obj.type)) {
                const node = this.findNode(op.value)
                this.sceneWrappers[obj.parent].remove(node)
            }
            return
        }
        // console.log('skipping', op.type)
    }
    documentSwapped() {
        console.log("totally new document!")
        //nuke all the old stuff
        Object.keys(this.sceneWrappers).forEach(key => {
            const scene = this.sceneWrappers[key]
            if(this.controls) scene.remove(this.controls)
            this.stagePos.remove(scene)
        })
        this.sceneWrappers = {}
        this.obj_node_map = {}
        // this.setState({scene: -1})
        //make new stuff
        const hist = this.props.provider.getDocHistory()
        hist.forEach(op => this.updateSceneOp(op))
    }

    swapScene(id) {
        console.log("swapping to the scene",id)
        //make all scenes invisible except the right one
        Object.keys(this.sceneWrappers).forEach(key => {
            const scene = this.sceneWrappers[key]
            scene.visible = (key === id)
            if(this.controls) scene.remove(this.controls)
        })
        if(this.controls) this.sceneWrappers[id].add(this.controls)
        this.sceneWrappers[id].position.x = 0
        this.sceneWrappers[id].position.z = 0
        // const floor = new SceneDef().getFloorPart(this.sceneWrappers[id])
        // if(floor) {
        //     floor.userData.clickable = true
        //     on(floor, POINTER_MOVE, (e) => {
        //         this.navcursor.position.x = e.point.x
        //         this.navcursor.position.z = e.point.z
        //     })
        //     on(floor, POINTER_CLICK, (e) => {
        //         this.sceneWrappers[id].position.x -= e.point.x
        //         this.sceneWrappers[id].position.z -= e.point.z + 3
        //     })
        // }
    }


    loadScene() {
        // console.log("loading the final scene")
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

    playAudioAsset(audio, target) {
        console.log("playing the audio",audio,'on the target',target)
        const sound = new THREE.Audio(this.audioListener)
        const audioLoader = new THREE.AudioLoader()
        audioLoader.load(audio.src, function( buffer ) {
            sound.setBuffer( buffer );
            sound.setLoop( true );
            sound.setVolume( 0.5 );
            sound.play();
        });
    }


    animateTargetObject(action, obj) {
        const node = this.findNode(obj.id)
        const pos = node.position
        this.tweenManager.prop({
            target: pos,
            property: 'y',
            from: pos.y,
            to: pos.y + 1.0,
            autoReverse: true,
            duration: 0.25,
            loop: 8,
        }).start()
    }

    makeScriptContext() {
        return {

        }
    }

    makeSystemFacade() {
        return {
            getCurrentScene() {
                return null
            },
            getScene(name) {
                return null
            },
            getObject(name) {
                return null
            },
            getAsset(name) {
                return null
            },
            setKeyValue(key, value) {
            },
            getKeyValue(key, value) {
            },
            hasKeyValue(key, value) {
            },
            isAR() {
                return false
            },
        }
    }

    executeScriptAction(action,obj) {
        const type = obj.trigger
        const evt = {
            type:type,
            system:this.makeSystemFacade(),
        }
        const txt = `${action.scriptBody}
            new MyScript()
        `;
        console.log("running the script",txt)
        const ctx = this.makeScriptContext()

        function doit(ctx) {
            const obj = eval(txt);
            console.log("returned",obj)
            obj.handle(evt)

        }

        doit(ctx);
    }
}


