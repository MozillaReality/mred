import React, {Component} from 'react'
import * as THREE from 'three'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import TransformControls from './TransformControls.js'
import {fetchGraphObject} from '../syncgraph/utils'
import SceneDef from "./SceneDef"
import {get3DObjectDef, is3DObjectType, OBJ_TYPES, TOTAL_OBJ_TYPES} from './Common'
import {ToasterNotification} from './ToasterNotification'
import ScriptManager from './ScriptManager'

const {SET_PROPERTY, INSERT_ELEMENT, DELETE_ELEMENT} = require("syncing_protocol");



export class VRCanvas extends Component {
    moveCameraFoward = () => {
        this.camera.position.z += -0.5
    }
    moveCameraBackward = () => {
        this.camera.position.z += 0.5
    }

    constructor(props) {
        super(props)
        console.info("CREATED VR Canvas")
        this.obj_node_map = {}
        this.scenes = []
        this.state = {
            scene: -1,
            running:props.running
        }
        this.scriptManager = new ScriptManager(this)
        this.playing_audio = []
    }

    componentDidMount() {
        const canvas = this.canvas

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, canvas.width / canvas.height, 0.1, 50);
        this.renderer = new THREE.WebGLRenderer({antialias: false, canvas: canvas});
        // this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.gammaOutput = true
        this.audioListener = new THREE.AudioListener()
        this.camera.add(this.audioListener)

        this.scene.background = new THREE.Color(0xff00ff);
        this.camera.position.y = 1.5
        this.camera.position.x = 0
        this.camera.position.z = 0
        this.scene.add(this.camera)

        this.controls = new TransformControls(this.camera, this.renderer.domElement)
        this.controls.addEventListener('change',(e)=>{
            const sel = SelectionManager.getSelection()
            if(sel) {
                const obj = fetchGraphObject(this.props.provider.getDataGraph(),sel)
                if(!is3DObjectType(obj.type)) return
                if(obj.type === OBJ_TYPES.bg360) return
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

        this.scene.add(new THREE.AmbientLight(0xffffff,0.4))

        this.renderer.setAnimationLoop((time) => {
            if(this.state.running) this.scriptManager.tick(time)
            this.renderer.render(this.scene, this.camera)
        })

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
            const obj = this.props.provider.accessObject(sel)

            if(obj.type === TOTAL_OBJ_TYPES.SCENE) return this.setCurrentSceneWrapper(this.findNode(sel))

            if(is3DObjectType(obj.type)) {
                const sc = this.findSceneObjectParent(obj)
                this.setCurrentSceneWrapper(this.findNode(sc.id))
                const node = this.findNode(sel)
                if (!node) return
                this.controls.attach(node)
                return
            }
            console.log("selected something not an object or scene")

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
    findSceneObjectParent(obj) {
        if(obj === null) return null
        if(!obj.exists()) return null
        if(obj.type === TOTAL_OBJ_TYPES.SCENE) return obj
        obj = this.props.provider.accessObject(obj.parent)
        return this.findSceneObjectParent(obj)
    }

    updateScene(op) {
        const graph = this.props.provider.getDataGraph()
        if (op.type === INSERT_ELEMENT) {
            const objid = op.value
            const obj = fetchGraphObject(graph, objid)
            if(obj.type === TOTAL_OBJ_TYPES.SCENE) return this.populateNode(objid)
            if (is3DObjectType(obj.type)) return this.populateNode(objid)
            if(obj.type === TOTAL_OBJ_TYPES.ASSET) return
            if(obj.type === TOTAL_OBJ_TYPES.ASSETS_LIST) return
            if(obj.type === TOTAL_OBJ_TYPES.BEHAVIORS_LIST) return
            console.warn("unknown object type", obj)
            return
        }
        if (op.type === SET_PROPERTY) {
            //skip setting parents. done through insert_element
            if(op.name === 'parent') return
            // console.log('setting property', op.object, op.name, '=',op.value)
            // console.log('real graph', fetchGraphObject(graph,op.object))
            const node = this.findNode(op.object)
            if (node) {
                const obj = fetchGraphObject(graph, op.object)
                if(obj.type === 'scene') {
                    new SceneDef().updateProperty(node,obj,op,this.props.provider)
                    return
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
        // console.log('skipping', op.type)
    }
    shouldComponentUpdate(nextProps, nextState, nextContext) {
        if('running' in nextProps) {
            if(nextProps.running !== this.props.running) {
                this.setState({running:nextProps.running})
                if(nextProps.running === false) {
                    this.scriptManager.stopRunning()
                    this.resetSceneGraph()
                } else {
                    //start the script manager
                    this.scriptManager.startRunning()
                }
                return false
            }
        }
        return false
    }

    render() {
        return <div>
            <canvas ref={c => this.canvas = c} width={600} height={400} onClick={this.clickedCanvas}></canvas>
            <button onClick={this.moveCameraFoward}>forward</button>
            <button onClick={this.moveCameraBackward}>backward</button>
            <ToasterNotification/>
        </div>
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
        if (obj.type === TOTAL_OBJ_TYPES.SCENE) {
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
            if(this.state.running) {
                this.scriptManager.performClickAction(this.props.provider.accessObject(obj.userData.graphid))
            } else {
                SelectionManager.setSelection(obj.userData.graphid)
            }
        } else {
            SelectionManager.clearSelection()
        }
    }

    playAudioAsset(audio) {
        const sound = new THREE.Audio(this.audioListener)
        const audioLoader = new THREE.AudioLoader()
        audioLoader.load(audio.src, function( buffer ) {
            sound.setBuffer( buffer );
            sound.setLoop( false );
            sound.setVolume( 0.5 );
            sound.play();
        });
        this.playing_audio[audio.id] = sound
    }

    stopAudioAsset(audio) {
        if(this.playing_audio[audio.id]) {
            this.playing_audio[audio.id].stop()
            delete this.playing_audio[audio.id]
        }
    }

    resetSceneGraph() {
        Object.keys(this.obj_node_map).forEach(id => {
            const graphObj = fetchGraphObject(this.props.provider.getDataGraph(),id)
            const threeObj = this.obj_node_map[id]
            if(graphObj.type === 'scene') {
                // new SceneDef().updateProperty(node,obj,op,this.props.provider)
                return
            }
            if(is3DObjectType(graphObj.type)) {
                const def = get3DObjectDef(graphObj.type)
                if(def.reset) {
                    def.reset(threeObj,graphObj,this.props.provider.getDataGraph())
                }
            }
        })
    }


    // ================  SGP implementation
    getAllBehaviors() {
        return this.props.provider.accessObject(this.props.provider.getSceneRoot())
            .find((obj)=> obj.type === TOTAL_OBJ_TYPES.BEHAVIOR)
    }

    getParsedBehaviorAsset(beh) {
        const prov = this.props.provider
        const asset = prov.accessObject(beh.behavior)
        return prov.getCachedBehaviorAsset(asset.id)
    }
    getGraphObjectById(id) {
        return this.props.provider.accessObject(id)
    }
    findGraphObjectByTitle(title) {
        const list = this.props.provider.accessObject(this.props.provider.getSceneRoot()).find((o)=>o.title === title)
        if(!list || list.length<1) return null
        return list[0]
    }
    navigateScene(id) {
        SelectionManager.setSelection(id)
    }
    getCurrentScene() {
        const sel = SelectionManager.getSelection()
        const obj = this.props.provider.accessObject(sel)
        return this.findSceneObjectParent(obj)
    }
    getSceneObjects(scene) {
        return scene.getChildren().filter(ch => is3DObjectType(ch.type))
    }
    findThreeObject(id) {
        return this.findNode(id)
    }
    getBehaviorsForObject(scene) {
        return scene.getChildren().filter(ch => ch.type === TOTAL_OBJ_TYPES.BEHAVIOR)
    }
    getCamera() {
        return this.camera
    }
}
