import React, {Component} from 'react'
import * as THREE from 'three'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import TransformControls from './TransformControls.js'
import {SceneAccessor} from './SceneAccessor'
import {fetchGraphObject} from '../syncgraph/utils'
import CubeDef from "./CubeDef"
import SceneDef from "./SceneDef"
import SphereDef from "./SphereDef";
import PlaneDef from './PlaneDef'
import {is3DObjectType} from './Common'

const {SET_PROPERTY, INSERT_ELEMENT, DELETE_ELEMENT} = require("syncing_protocol");


function get3DObjectDef(type) {
    if(type === 'cube') return new CubeDef()
    if(type === 'sphere') return new SphereDef()
    if(type === 'plane') return new PlaneDef()
    throw new Error(`unknown 3d object type ${type}`)
}

export class VRCanvas extends Component {
    constructor(props) {
        super(props)
        console.info("CREATED VR Canvas")
        this.obj_node_map = {}
        this.scenes = []
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
                if(!node) return
                const prov = this.props.provider
                prov.quick_setPropertyValue(sel,'tx',node.position.x)
                prov.quick_setPropertyValue(sel,'ty',node.position.y)
                prov.quick_setPropertyValue(sel,'tz',node.position.z)
            }
        })
        this.controls.addEventListener('mouseDown',(e)=>{
            this.props.provider.pauseQueue()
        })
        this.controls.addEventListener('mouseUp',(e)=>{
            this.props.provider.unpauseQueue()
        })
        this.scene.add(this.controls)
        this.raycaster = new THREE.Raycaster();

        const light = new THREE.DirectionalLight(0xffffff, 1.0);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        this.renderer.setAnimationLoop(() => this.renderer.render(this.scene, this.camera))

        this.props.provider.onRawChange(op => this.updateScene(op))
        this.props.provider.on(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED, () => {
            //nuke all the old stuff
            this.scenes.forEach(sc => this.scene.remove(sc))
            this.scenes = []
            this.obj_node_map = {}
            this.setState({scene: -1})
            //make new stuff
            const hist = this.props.provider.getDocHistory()
            hist.forEach(op => this.updateScene(op))
        })

        SelectionManager.on(SELECTION_MANAGER.CHANGED, () => {
            this.controls.detach()
            const sel = SelectionManager.getSelection()
            if(!sel) return
            const graph = this.props.provider.getDataGraph()
            const obj = fetchGraphObject(graph, sel)

            if(obj.type === 'scene') return this.setCurrentSceneWrapper(this.findNode(sel))

            if(is3DObjectType(obj.type)) {
                this.setCurrentSceneWrapper(this.findNode(obj.parent))
                const node = this.findNode(sel)
                if (!node) return
                this.controls.attach(node)
            }

        })

        window.addEventListener('resize', () => {
            this.camera.aspect = this.canvas.width / this.canvas.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.canvas.width, this.canvas.height);
        }, false);

        this.props.provider.getDocHistory().forEach(op => this.updateScene(op))
    }

    insertNodeMapping(id, node) {
        if (typeof id !== 'string') throw new Error("cannot map an object to an object. invalid call in insertNodeMapping")
        this.obj_node_map[id] = node
        node.userData.graphid = id
    }
    removeNodeMapping(id,node) {
        delete this.obj_node_map[id]
        delete node.userData.graphid
    }

    findNode(id) {
        if (!this.obj_node_map[id]) console.warn("could not find node for id", id)
        return this.obj_node_map[id]
    }

    updateScene(op) {
        const graph = this.props.provider.getDataGraph()
        if (op.type === INSERT_ELEMENT) {
            const objid = op.value
            const obj = fetchGraphObject(graph, objid)
            console.log('inserting element', op.value, obj.type)
            if (obj.type === 'scene') return this.populateNode(objid)
            if (is3DObjectType(obj.type)) return this.populateNode(objid)
            console.warn("unknown object type", obj)
            return
        }
        if (op.type === SET_PROPERTY) {
            // console.log('setting property', op.object, op.name, '=',op.value)
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
                if(is3DObjectType(obj.type)) return get3DObjectDef(obj.type).updateProperty(node,obj,op, this.props.provider)
            } else {
                console.log("could not find the node for object id:", op)
            }
            return
        }
        if (op.type === DELETE_ELEMENT) {
            this.controls.detach()
            console.log("doing delete for object", op.value)
            const node = this.findNode(op.value)
            console.log("removing the node",node)
            if(node) {
                this.removeNodeMapping(op.value,node)
                const obj = fetchGraphObject(graph,op.value)
                if(is3DObjectType(obj.type)) {
                    node.parent.remove(node)
                    // this.dumpScenes()
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
        return <canvas ref={c => this.canvas = c} width={600} height={400} onClick={this.clickedCanvas}></canvas>
    }

    populateNode(nodeid) {
        const graph = this.props.provider.getDataGraph()
        const obj = fetchGraphObject(graph, nodeid)
        if (is3DObjectType(obj.type)) {
            const obj3d = get3DObjectDef(obj.type).makeNode(obj)
            this.insertNodeMapping(nodeid, obj3d)
            const parent = this.findNode(obj.parent)
            parent.add(obj3d)
            return obj3d
        }
        if (obj.type === 'scene') {
            const scene = new SceneDef().makeNode(obj)
            this.insertNodeMapping(nodeid, scene)
            this.addSceneWrapper(scene)
            this.setCurrentSceneWrapper(scene)
            return scene
        }

        console.warn("cannot populate node for type", obj.type)
    }


    addSceneWrapper(scene) {
        this.scenes.push(scene)
        this.scene.add(scene)
    }

    setCurrentSceneWrapper(scene) {
        this.scenes.forEach(sc => {
            if(sc === scene) {
                sc.visible = true
            } else {
                sc.visible = false
            }
        })
        // this.dumpScenes()
    }

    dumpScenes() {
        this.scenes.forEach(sc => {
            console.log("scene")
            this.dump(sc,'')
        })
    }
    dump(sc,inset) {
        console.log(inset+"",sc.type,sc.id,  'vis', sc.visible)
        if(sc.type === 'Mesh') console.log(inset+'  ',sc.geometry.type)
        // console.log(sc)
        if(sc.children) {
            sc.children.forEach((ch) => this.dump(ch, inset + '  '))
        }
    }

    getCurrentSceneWrapper() {
        return this.scenes.find(sc => sc.visible)
    }

    clickedCanvas = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const pointer = {
            x: ( e.clientX - rect.left ) / rect.width * 2 - 1,
            y: - ( e.clientY - rect.top ) / rect.height * 2 + 1,
        }

        this.raycaster.setFromCamera(pointer, this.camera);
        const intersect = this.raycaster.intersectObjects(this.getCurrentSceneWrapper().children, true)
        if(intersect && intersect.length >= 1) {
            const obj = intersect[0].object
            SelectionManager.setSelection(obj.userData.graphid)
        } else {
            SelectionManager.clearSelection()
        }
    }

}
