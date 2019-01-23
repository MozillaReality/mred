import React, {Component} from 'react'
import * as THREE from 'three'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import TransformControls from './TransformControls.js'
import {SceneAccessor} from './SceneAccessor'
import {fetchGraphObject} from '../syncgraph/utils'
import BoxAccessor from './BoxAccessor'
import CubeDef from "./CubeDef"
import SceneDef from "./SceneDef"

const {SET_PROPERTY, INSERT_ELEMENT, DELETE_ELEMENT} = require("syncing_protocol");

export class VRCanvas extends Component {
    constructor(props) {
        super(props)
        console.info("CREATED VR Canvas")
        this.obj_node_map = {}
        this.state = {
            scene: -1
        }
    }

    componentDidMount() {
        console.log('mounting the canvas',this.props.provider.getDataGraph())
        const canvas = this.canvas

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, canvas.width / canvas.height, 0.1, 50);
        this.renderer = new THREE.WebGLRenderer({antialias: false, canvas: canvas});
        // this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.gammaOutput = true

        this.scene.background = new THREE.Color(0xff00ff);
        this.camera.position.y = 1.5
        this.camera.position.x = 0
        this.camera.position.z = 0
        this.scene.add(this.camera)

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

        const light = new THREE.DirectionalLight(0xffffff, 1.0);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        this.renderer.setAnimationLoop(() => this.renderer.render(this.scene, this.camera))

        this.props.provider.onRawChange(op => this.updateScene(op))
        this.props.provider.on(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED, () => {
            //nuke all the old stuff
            if (this.sceneWrapper) {
                this.scene.remove(this.sceneWrapper)
                this.sceneWrapper = null
            }
            this.obj_node_map = {}
            this.setState({scene: -1})
            //make new stuff
            const hist = this.props.provider.getDocHistory()
            hist.forEach(op => this.updateScene(op))
        })

        SelectionManager.on(SELECTION_MANAGER.CHANGED, () => {
            const sel = SelectionManager.getSelection()
            if(!sel) return
            const node = this.findNode(sel)
            if(!node) return
            this.controls.attach(node)
        })

        window.addEventListener('resize', () => {
            this.camera.aspect = this.canvas.width / this.canvas.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.canvas.width, this.canvas.height);
        }, false);

        this.props.provider.getDocHistory().forEach(op => this.updateScene(op))
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

    insertNodeMapping(id, node) {
        if (typeof id !== 'string') throw new Error("cannot map an object to an object. invalid call in insertNodeMapping")
        this.obj_node_map[id] = node
        node.userData.graphid = id
    }

    findNode(id) {
        if (!this.obj_node_map[id]) console.warn("could not find node for id", id)
        return this.obj_node_map[id]
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
                const obj = fetchGraphObject(graph, op.object)
                if(obj.type === 'scene') {
                    if (op.name === 'defaultFloor') {
                        const acc = new SceneAccessor(node)
                        acc.setDefaultFloor(op.value)
                        return
                    }
                }
                if(obj.type === 'cube') return new BoxAccessor(node, obj).updateProperty(op)
            } else {
                console.log("could not find the node for object id:", op)
            }
            return
        }
        if (op.type === DELETE_ELEMENT) {
            console.log("doing delete")
            const node = this.findNode(op.value)
            console.log("removing the node",node)
            if(node) {
                const obj = fetchGraphObject(graph,op.value)
                console.log('the objcect is',obj)
                if(obj.type === 'cube') {
                    this.sceneWrapper.remove(node)
                }
            }

            return
        }
        console.log('skipping', op.type)
    }
    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return false
    }

    render() {
        return <canvas ref={c => this.canvas = c} width={600} height={400}></canvas>
    }

    populateNode(nodeid) {
        const graph = this.props.provider.getDataGraph()
        const obj = fetchGraphObject(graph, nodeid)
        if (obj.type === 'cube') {
            const cube = new CubeDef().makeNode(obj)
            this.insertNodeMapping(nodeid, cube)
            return cube
        }
        if (obj.type === 'scene') {
            const scene = new SceneDef().makeNode(obj)
            this.insertNodeMapping(nodeid, scene)
            return scene
        }

        console.warn("cannot populate node for type", obj.type)
    }
}
