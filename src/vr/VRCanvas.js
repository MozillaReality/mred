import React, {Component} from 'react'
import * as THREE from 'three'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import TransformControls from './TransformControls.js'
import {SceneAccessor} from './SceneAccessor'
import {fetchGraphObject} from '../syncgraph/utils'
import BoxAccessor from './BoxAccessor'

const {SET_PROPERTY, INSERT_ELEMENT} = require("syncing_protocol");

export class VRCanvas extends Component {
    constructor(props) {
        super(props)
        this.obj_node_map = {}
        this.state = {
            scene: -1
        }
    }

    componentDidMount() {
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
        this.controls.addEventListener('dragging-changed',(e)=>{
            console.log("dragging changed",e)
        })
        this.scene.add(this.controls)


        const light = new THREE.DirectionalLight(0xffffff, 1.0);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);


        this.renderer.setAnimationLoop(() => {
            // cube.rotation.y  += 0.01
            this.renderer.render(this.scene, this.camera)
        })

        this.props.provider.onRawChange(op => this.updateScene(op))
        this.props.provider.on(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED, () => {
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
        })

        SelectionManager.on(SELECTION_MANAGER.CHANGED, () => {
            const sel = SelectionManager.getSelection()
            console.log("new selection is",sel)
            if(sel === null) return
            const graph = this.props.provider.getDataGraph()
            const obj = fetchGraphObject(graph,sel)
            console.log(obj)
            const node = this.findNode(sel)
            console.log(node)
            if(node) {
                this.controls.attach(node)
            }
            /*
            const scene = this.props.provider.getSelectedScene()
            console.log('checking for the scene',scene)
            if(this.findNode(scene) === null || this.findNode(scene) === undefined) {
                console.log("scene isn't in here yet.")
                const scene_node = this.populateNode(scene)
                // this.insertNodeMapping(scene,this.sceneWrapper)
                this.setState({scene:scene})
            }
            if(this.state.scene !== scene) {
                console.log("scene changed. must nuke it all")
                this.scene.remove(this.sceneWrapper)
                this.sceneWrapper = this.findNode(scene)
                console.log("new scene is",scene,this.sceneWrapper)
                this.scene.add(this.sceneWrapper)
                this.setState({scene:scene})
            }
            */
        })

        window.addEventListener('resize', () => {
            this.camera.aspect = this.canvas.width / this.canvas.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.canvas.width, this.canvas.height);
        }, false);

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
            const cube = new THREE.Mesh(
                new THREE.BoxGeometry(obj.width, obj.height, obj.depth),
                new THREE.MeshLambertMaterial({color: 'white'})
            )
            cube.position.set(obj.tx, obj.ty, obj.tz)
            this.insertNodeMapping(nodeid, cube)
            return cube
        }
        if (obj.type === 'scene') {
            const scene = new THREE.Group()
            const acc = new SceneAccessor(scene)
            acc.setDefaultFloor(obj.defaultFloor)
            this.insertNodeMapping(nodeid, scene)
            return scene
        }

        console.warn("cannot populate node for type", obj.type)
    }
}
