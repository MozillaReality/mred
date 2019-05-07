import React, {Component} from 'react'
import * as THREE from 'three'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import TransformControls from './TransformControls.js'
import {fetchGraphObject} from '../syncgraph/utils'
import SceneDef from "./defs/SceneDef"
import {ASSET_TYPES, get3DObjectDef, is3DObjectType, OBJ_TYPES, TOTAL_OBJ_TYPES} from './Common'
import {ToasterNotification} from './ToasterNotification'
import ScriptManager, {SceneGraphProvider} from './ScriptManager'
import {TweenManager} from '../common/tween'

const {SET_PROPERTY, INSERT_ELEMENT, DELETE_ELEMENT} = require("syncing_protocol");




class XRSupport {

    static supportsARKit() {
        if(navigator.xr && navigator.xr._mozillaXRViewer) {
            console.error("found mozilla xr viewer")
            return true
        }
        if(typeof window.webkit === 'undefined' || !navigator.xr) return false
        return true
    }

    getContext(canvas=0) {
        this.device = 0
        this.session = 0
        this.xrCanvas = 0
        this.xrContext = 0
        this.canvas = canvas
        this.context = 0
        this.xrCanvas = document.createElement('canvas')
        this.xrContext = this.xrCanvas.getContext('xrpresent')
        let p = new Promise((resolve, reject) => {
            // document.body.insertBefore(this.xrCanvas, document.body.firstChild) <- not needed?
            navigator.xr.requestDevice().then((xrDevice)=>{
                this.device = xrDevice
                this.device.requestSession({ outputContext: this.xrContext }).then((xrSession)=>{
                    this.session = xrSession
                    if(!this.canvas) this.canvas = document.createElement('canvas')
                    if(!this.context) this.context = this.canvas.getContext('webgl', { compatibleXRDevice: this.device })
                    this.session.baseLayer = new window.XRWebGLLayer(this.session, this.context)
                    resolve(this.context)
                }).catch(err => {
                    console.error('Session setup error', err)
                    reject()
                })
            }).catch(err => {
                console.error('Error', err)
                reject()
            })
        })
        return p
    }

    setAnimationLoop(userAnimationCallback) {
        this.userAnimationCallback = userAnimationCallback
        this.__handleAnimationFrame = this._handleAnimationFrame.bind(this)

        // head-model is the coordinate system that tracks the position of the display
        this.session.requestFrameOfReference('head-model').then(frameOfReference =>{
            this.headFrameOfReference = frameOfReference

            // get eye level which is somehow different from head level?
            this.session.requestFrameOfReference('eye-level').then(frameOfReference => {
                this.eyeLevelFrameOfReference = frameOfReference
                this.session.requestAnimationFrame(this.__handleAnimationFrame)
            }).catch(err => {
                console.error('Error finding eye frame of reference', err)
            })

        }).catch(err => {
            console.error('Error finding head frame of reference', err)
        })

    }

    _handleAnimationFrame(time=0, frame=0){

        if(!this.session || this.session.ended) return

        this.session.requestAnimationFrame(this.__handleAnimationFrame)

        let pose = frame.getDevicePose(this.eyeLevelFrameOfReference)
        if(!pose){
            console.log('No pose')
            return
        }

        for (let view of frame.views) {
            this.userAnimationCallback(
                this.session.baseLayer.getViewport(view),
                view.projectionMatrix,
                pose.getViewMatrix(view),
            )
            break
        }
    }

    getAnchor(xyz) {
        // returns a promise
        return this.session.addAnchor(xyz, this.headFrameOfReference)
    }

}


// ================  SGP implementation =====================
class Adapter extends SceneGraphProvider {
    constructor(canvas) {
        super()
        this.canvas = canvas
    }

    getAllBehaviors() {
        return this.canvas.props.provider.accessObject(this.canvas.props.provider.getSceneRoot())
            .find((obj)=> obj.type === TOTAL_OBJ_TYPES.BEHAVIOR)
    }

    getParsedBehaviorAsset(beh) {
        const prov = this.canvas.props.provider
        const asset = prov.accessObject(beh.behavior)
        return prov.getCachedBehaviorAsset(asset.id)
    }
    getGraphObjectById(id) {
        return this.canvas.props.provider.accessObject(id)
    }
    getGraphObjectByName(title) {
        const list = this.canvas.props.provider.accessObject(this.canvas.props.provider.getSceneRoot()).find((o)=>o.title === title)
        if(!list || list.length<1) return null
        return list[0]
    }
    navigateScene(id) {
        SelectionManager.setSelection(id)
    }
    getCurrentScene() {
        const obj = this.canvas.props.provider.getSelectedScene()
        return this.canvas.findSceneObjectParent(obj)
    }
    getSceneObjects(scene) {
        return scene.getChildren().filter(ch => is3DObjectType(ch.type))
    }
    getThreeObject(obj) {
        if(obj.id) return this.canvas.findNode(obj.id)
        return this.canvas.findNode(obj)
    }
    getBehaviorsForObject(scene) {
        return scene.getChildren().filter(ch => ch.type === TOTAL_OBJ_TYPES.BEHAVIOR)
    }
    getCamera() {
        return this.canvas.camera
    }
    playMediaAsset(asset) {
        if(asset.subtype === ASSET_TYPES.AUDIO) {
            const sound = new THREE.Audio(this.canvas.audioListener)
            const audioLoader = new THREE.AudioLoader()
            audioLoader.load(asset.src, function (buffer) {
                sound.setBuffer(buffer);
                sound.setLoop(false);
                sound.setVolume(0.5);
                sound.play();
            });
            this.canvas.playing_audio[asset.id] = sound
        }
        if(asset.subtype === ASSET_TYPES.VIDEO) {
            const cache = this.canvas.props.provider.videocache
            if(cache[asset.src]) cache[asset.src].play()
        }
    }

    stopAudioAsset(audio) {
        if(this.canvas.playing_audio[audio.id]) {
            this.canvas.playing_audio[audio.id].stop()
            delete this.canvas.playing_audio[audio.id]
        }
    }
    getTweenManager() {
        return this.canvas.tweenManager
    }
    startImageRecognizer(info) {
        return this.canvas.startImageRecognizer(info)
    }
}


export class VRCanvas extends Component {
    moveCameraForward = () => {
        this.camera.position.z += -0.5
    }
    moveCameraBackward = () => {
        this.camera.position.z += 0.5
    }
    handleKeyPress = (e) => {
        if(e.key === 'ArrowUp') {
            this.camera.position.z -= 0.5
        }
        if(e.key === 'ArrowDown') {
            this.camera.position.z += 0.5
        }
        if(e.key === 'a') {
            this.camera.position.x -= 0.5
        }
        if(e.key === 'd') {
            this.camera.position.x += 0.5
        }
        if(e.key === 'ArrowLeft') {
            this.camera.rotation.y += 0.1
        }
        if(e.key === 'ArrowRight') {
            this.camera.rotation.y -= 0.1
        }
    }

    constructor(props) {
        super(props)
        console.info("CREATED VR Canvas")
        this.obj_node_map = {}
        this.previewUpdateNodes = []
        this.scenes = []
        this.state = {
            scene: -1,
            running:props.running
        }
        this.playing_audio = []
        this.scriptManager = new ScriptManager(new Adapter(this))
    }

    pauseQueue = (e) => {
        this.props.provider.pauseQueue()
    }
    unpauseQueue = (e) => {
        this.props.provider.unpauseQueue()
    }
    transformChanged = (e) => {
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
    }
    docSwapped = (e) => {
        //nuke all the old stuff
        this.scenes.forEach(sc => this.scene.remove(sc))
        this.scenes = []
        this.obj_node_map = {}
        this.setState({scene: -1})
        //make new stuff
        const hist = this.props.provider.getDocHistory()
        hist.forEach(op => this.updateScene(op))
    }
    selectionChanged = () => {
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
    }
    windowResized = () => {
        if(this.canvas) {
            this.camera.aspect = this.canvas.width / this.canvas.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.canvas.width, this.canvas.height);
        }
    }

    componentDidMount() {
        const canvas = this.canvas
        if(XRSupport.supportsARKit()) {
            this.xr = new XRSupport()
            this.xr.getContext(canvas).then((context) => {
                this.setupRenderer(canvas,context)
                this.xr.setAnimationLoop( this.animationLoopWithCamera.bind(this) )
            }).catch(err => {
                console.error('Error', err)
            })
        } else {
            this.setupRenderer(canvas,0)
            this.renderer.setAnimationLoop( this.animationLoop.bind(this) )
        }
    }

    componentWillUnmount() {
        this.controls.removeEventListener('change',this.transformChanged)
        this.controls.removeEventListener('mouseDown',this.pauseQueue)
        this.controls.removeEventListener('mouseUp',this.unpauseQueue)
        this.props.provider.off(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED,this.docSwapped)
        SelectionManager.off(SELECTION_MANAGER.CHANGED,this.selectionChanged)
        window.removeEventListener('resize',this.windowResized)
    }

    setupRenderer(canvas,context) {

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, canvas.width / canvas.height, 0.1, 50);
        this.renderer = new THREE.WebGLRenderer({antialias: false, canvas: canvas, context:context});
        // this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.gammaOutput = true
        this.audioListener = new THREE.AudioListener()
        this.camera.add(this.audioListener)
        //only set a background if there is no XR active
        if(!this.xr) this.scene.background = new THREE.Color(0x000000);
        this.camera.position.y = 1.5
        this.camera.position.x = 0
        this.camera.position.z = 0
        this.scene.add(this.camera)

        this.controls = new TransformControls(this.camera, this.renderer.domElement)
        this.controls.addEventListener('change',this.transformChanged)
        this.controls.addEventListener('mouseDown',this.pauseQueue)
        this.controls.addEventListener('mouseUp',this.unpauseQueue)
        this.scene.add(this.controls)
        this.raycaster = new THREE.Raycaster();

        const light = new THREE.DirectionalLight(0xffffff, 1.0);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        this.scene.add(new THREE.AmbientLight(0xffffff,0.4))

        this.tweenManager = new TweenManager()

        this.props.provider.onRawChange(op => this.updateScene(op))
        this.props.provider.on(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED, this.docSwapped)
        SelectionManager.on(SELECTION_MANAGER.CHANGED, this.selectionChanged)

        window.addEventListener('resize', this.windowResized,false)
        this.props.provider.getDocHistory().forEach(op => this.updateScene(op))
    }

    animationLoop(time) {
        if(this.state.running) this.scriptManager.tick(time)
        if(this.tweenManager) this.tweenManager.update(time)
        this.previewUpdateNodes.forEach(n => n.previewUpdate())
        this.renderer.render(this.scene, this.camera)
    }

    animationLoopWithCamera(bounds,projectionMatrix,viewMatrix) {
        if(!this.scene || !this.camera) return
        this.camera.matrixAutoUpdate = false
        this.camera.matrix.fromArray(viewMatrix)
        this.camera.updateMatrixWorld()
        this.camera.projectionMatrix.fromArray(projectionMatrix)
        this.animationLoop()
    }

    insertNodeMapping(id, node) {
        if (typeof id !== 'string') throw new Error("cannot map an object to an object. invalid call in insertNodeMapping")
        this.obj_node_map[id] = node
        node.userData.graphid = id
        if(node.previewUpdate) this.previewUpdateNodes.push(node)
    }
    removeNodeMapping(id,node) {
        delete this.obj_node_map[id]
        delete node.userData.graphid
        this.previewUpdateNodes = this.previewUpdateNodes.filter(n => n !== node)
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
                    this.stopRecognizer()
                } else {
                    //start the script manager
                    this.startRecognizer()
                    this.scriptManager.startRunning()
                }
                return false
            }
        }
        return false
    }

    render() {
        return <div>
            <canvas ref={c => this.canvas = c} width={600} height={400} onClick={this.clickedCanvas}
                    className="editable-canvas"
                    onKeyDown={this.handleKeyPress}
                    tabIndex={0}
            ></canvas>
            <br/>
            <button onClick={this.moveCameraForward}>forward</button>
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
        console.log("clicked on the canvas")
        this.canvas.focus()
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


    startRecognizer() {
        //called when script running is started
    }

    startImageRecognizer(info) {
        //TODO: Anselm
        //called when an anchor is started that wants to recognize an image
        //info contains
        // * callback: to call when the image is found
        // * image: info about the image to recognize. src is at image.src
        // * imageRealworldWidth: width of the image in meters
        // * object: the anchor object
        // * node: the ThreeJS group which represents the anchor. It should be updated as the scene changes
        // * recType: current set to SCENE_START, meaning we should recognize as soon as the scene starts up

        console.log("start recognizing with this image",info)
        setTimeout(()=>{
            info.callback({message:'found an anchor image'})
        },2000)
    }

    stopRecognizer() {

    }
}
