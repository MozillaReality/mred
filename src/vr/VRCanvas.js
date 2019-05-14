import React, {Component} from 'react'
import * as THREE from 'three'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import TransformControls from './TransformControls.js'
import SceneDef from "./defs/SceneDef"
import {ASSET_TYPES, get3DObjectDef, is3DObjectType, OBJ_TYPES, TOTAL_OBJ_TYPES} from './Common'
import {ToasterNotification} from './ToasterNotification'
import ScriptManager, {SceneGraphProvider} from './ScriptManager'
import {TweenManager} from '../common/tween'
import * as ToasterManager from './ToasterManager'
import {toFlatString} from '../utils'

const {SET_PROPERTY, INSERT_ELEMENT, DELETE_ELEMENT} = require("syncing_protocol");


let Cesium = document.Cesium
let XRGeospatialAnchor = document.XRGeospatialAnchor


class XRSupport {

    static supportsARKit() {
        if(navigator.xr && navigator.xr._mozillaXRViewer) {
            console.log("*** Found mozilla xr viewer")
            return true
        }
        console.log("*** Did not find WebXR")
        return false
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
        this._anchoredNodes = new Map() // { XRAnchorOffset, Three.js Object3D }
        let prom = new Promise((resolve, reject) => {
            // document.body.insertBefore(this.xrCanvas, document.body.firstChild) <- not needed?
            navigator.xr.requestDevice().then((xrDevice)=>{
                this.device = xrDevice
                this.device.requestSession({
                    outputContext: this.xrContext,
                    alignEUS: true,
                    geolocation: true,
                    worldSensing: true
                }).then((xrSession)=>{
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
        return prom
    }

    setAnimationLoop(userAnimationCallback) {

        if(!userAnimationCallback) {
            console.error("Supply a callback")
            return
        }

        // head-model is the coordinate system that tracks the position of the display
        this.session.requestFrameOfReference('head-model').then(frameOfReference =>{
            this.headFrameOfReference = frameOfReference
        }).catch(err => {
            console.error('Error finding head frame of reference', err)
        })

        // get eye level which is somehow different from head level?
        this.session.requestFrameOfReference('eye-level').then(frameOfReference => {
            this.eyeLevelFrameOfReference = frameOfReference
        }).catch(err => {
            console.error('Error finding eye frame of reference', err)
        })

        // setup callback
        this.userAnimationCallback = userAnimationCallback
        this.__handleAnimationFrame = this._handleAnimationFrame.bind(this)
        this.session.requestAnimationFrame(this.__handleAnimationFrame)
    }

    _handleAnimationFrame(time=0, frame=0){

        if(!this.session || this.session.ended) return

        this.session.requestAnimationFrame(this.__handleAnimationFrame)

        if(!this.headFrameOfReference || !this.eyeLevelFrameOfReference) return

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

    addAnchoredNode(anchor, node, logger){
        if (!anchor || !anchor.uid) {
            console.error("not a valid anchor", anchor)
            logger.error(`not a valid anchor ${toFlatString(anchor)}`)
            return;
        }
        this._anchoredNodes.set(anchor.uid, {
            anchor: anchor,
            node: node
        })
        node.anchor = anchor
        node.matrixAutoUpdate = false
        node.matrix.fromArray(anchor.modelMatrix)
        node.updateMatrixWorld(true)
        //this._scene.add(node) -> presumably this is already done
        anchor.addEventListener("update", (e) => this._handleAnchorUpdate(e,logger))
        anchor.addEventListener("removed",(e)=>  this._handleAnchorDelete(e,logger))
        logger.log("done adding anchored node")
        return node
    }

    addImageAnchoredNode(info, image, logger) {

        logger.log("addImageAnchoredNode")

        if(!info.image || !info.node) {
            logger.log("missing image or threejs node")
            return
        }

        if(!this.session) {
            logger.log("no session")
            return
        }

        //info contains
        // * callback: to call when the image is found
        // * image: info about the image to recognize. src is at image.src
        // * imageRealworldWidth: width of the image in meters
        // * object: the anchor object
        // * node: the ThreeJS group which represents the anchor. It should be updated as the scene changes
        // * recType: current set to SCENE_START, meaning we should recognize as soon as the scene starts up

        let callback = info.callback
        // let image = info.image
        let imageRealworldWidth = info.imageRealworldWidth || 1
        let object = info.object // object that represents anchor variables that users can edit in general-editor
        let node = info.node
        let recType = 0 // unused. currently set to SCENE_START -> meaning we should recognize as soon as the scene starts up

        // random name from https://gist.github.com/6174/6062387
        let name = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join('')

        // Get ImageData
        let canvas = document.createElement('canvas')
        let context = canvas.getContext('2d')
        canvas.width = image.width
        canvas.height = image.height
        logger.log(`looking for image ${toFlatString(image)} ${image.src}`)

        context.drawImage(image, 0, 0)
        let idata
        try {
            idata = context.getImageData(0,0,image.width,image.height)
        } catch(e) {
            logger.log(`error drawing image ${toFlatString(e)}`)
            logger.log(`name ${e.name}`)
            logger.log(`name ${e.message}`)
            logger.log("local url is " + document.documentURI)
            logger.log("image url from " + image.src)
            ToasterManager.add("error drawing image",e.toString())
            throw new Error("foo")
        }
        logger.log(`calling createDetectionImage with image width and height ${image.width} ${image.height}`)

        // Attach image observer handler
        this.session.nonStandard_createDetectionImage(name, idata.data, image.width, image.height, imageRealworldWidth ).then(() => {
            logger.log("created a createdetectionimage")
            this.session.nonStandard_activateDetectionImage(name).then(anchor => {
                logger.log("started activate detection image")
                // this gets invoked after the image is seen for the first time
                node.anchorName = name
                this.addAnchoredNode(anchor,node,logger)
                if(callback) {
                    callback(info)
                }
            }).catch(error => {
                logger.error(`error activating detection image: ${error}`)
            })
        }).catch(error => {
            logger.error(`error creating detection image: ${error}`)
        })
    }

    addGeoAnchoredNode(info) {

        console.log("adding a geo recognizer")

        if(!info.node) {
            console.error("Missing threejs node")
            return
        }

        if(!this.session) {
            console.error("no session")
            return
        }

        /*
        info contains
         location:  a geo location asset, has properties for latitude, longitude, altitude, useAltitude
         recType: the recognition type. for now always SCENE_START
         object: the anchor object. It reresents the anchor in the 3D scene. has tx,ty,tz, rotation, etc.
         node: the actual ThreeJS object that mirrors the propertites of the `object` above
         callback: a function to be called once the geo anchor is recognized. By default this callback will fire a 'recognized' event and make the anchor visible in the scene
         */

        let callback = info.callback
        let object = info.object // object that represents anchor variables that users can edit in general-editor
        let node = info.node
        let recType = 0 // unused. currently set to SCENE_START -> meaning we should recognize as soon as the scene starts up

        // Preferentially use a supplied place if any

        if(info.hasOwnProperty("latitude") && info.hasOwnProperty("longitude")) {

            // use supplied altitude?

            if(info.hasOwnProperty("useAltitude") && info.useAltitude) {
                let lla = new Cesium.Cartographic(info.longitude, info.latitude, info.altitude )
                XRGeospatialAnchor.createGeoAnchor(lla).then(anchor => {
                    this.addAnchoredNode(anchor,node)
                })
            } else {
                XRGeospatialAnchor.getDeviceElevation().then(altitude => {
                    console.log("device elevation: ", altitude)
                    let lla = new Cesium.Cartographic(info.longitude, info.latitude, altitude )
                    XRGeospatialAnchor.createGeoAnchor(lla).then(anchor => {
                        this.addAnchoredNode(anchor,node)
                    })
                })
            }
        }

        // else find current position

        else {
            XRGeospatialAnchor.getDeviceCartographic().then(cartographic => {
                XRGeospatialAnchor.getDeviceElevation().then(altitude => {
                    console.log("device elevation: ", altitude)
                    let lla = new Cesium.Cartographic(cartographic.longitude, cartographic.latitude, altitude )
                    XRGeospatialAnchor.createGeoAnchor(lla).then(anchor => {
                        this.addAnchoredNode(anchor,node)
                    })
                })
            })
        }
    }

    _handleAnchorDelete(details, logger) {
        logger.log("delete anchor")
        let anchor = details.source
        const anchoredNode = this._anchoredNodes.get(anchor.uid)
        if (anchoredNode) {
            const node = anchoredNode.node
            // NOTIFY SOMEBODY? TODO
            this._anchoredNodes.delete(anchor.uid)
        }
    }

    _handleAnchorUpdate(details, logger) {
        logger.log("anchor update")
        const anchor = details.source
        const anchoredNode = this._anchoredNodes.get(anchor.uid)
        if (anchoredNode) {
            const node = anchoredNode.node
            node.matrixAutoUpdate = false
            node.matrix.fromArray(anchor.modelMatrix)
            node.updateMatrixWorld(true)
        }
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
        return this.canvas.props.provider.getSelectedSceneObject()
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
    stopImageRecognizer(info) {
        return this.canvas.stopImageRecognizer(info)
    }
    startGeoRecognizer(info) {
        return this.canvas.startGeoRecognizer(info)
    }
    stopGeoRecognizer(info) {
        return this.canvas.stopGeoRecognizer(info)
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
            const obj = this.props.provider.accessObject(sel)
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
        const graph = this.props.provider.getDocGraph()
        this.rebuildNode(graph,"")
    }
    rebuildNode(obj, inset) {
        // console.log(inset,"rebuilding",obj.type)
        if(obj.type === TOTAL_OBJ_TYPES.SCENE) {
            const node = new SceneDef().makeNode(obj)
            this.insertNodeMapping(obj.id,node)
            this.addSceneWrapper(node)
            this.setCurrentSceneWrapper(node)
        }
        if(is3DObjectType(obj.type)) {
            const node = get3DObjectDef(obj.type).makeNode(obj)
            this.insertNodeMapping(obj.id,node)
            const parent = this.findNode(obj.parent)
            parent.add(node)
        }
        if(obj.children) {
            obj.children.forEach(ch => {
                this.rebuildNode(ch,inset+"   ")
            })
        }
    }
    selectionChanged = () => {
        this.controls.detach()
        const sel = SelectionManager.getSelection()
        if(!sel) return
        const obj = this.props.provider.accessObject(sel)

        if(obj.type === TOTAL_OBJ_TYPES.SCENE) return this.setCurrentSceneWrapper(this.findNode(sel))

        if(is3DObjectType(obj.type)) {
            const sc = this.props.provider.findSceneObjectParent(obj)
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
        this.camera.matrixAutoUpdate = false
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
        this.docSwapped()
    }

    animationLoop(time, frame) {
        if(this.state.running) this.scriptManager.tick(time, this.session, frame)
        if(this.tweenManager) this.tweenManager.update(time)
        this.previewUpdateNodes.forEach(n => n.previewUpdate())
        this.renderer.render(this.scene, this.camera)
    }

    animationLoopWithCamera(bounds,projectionMatrix,viewMatrix) {
        if(!this.scene || !this.camera) return
        this.camera.matrix.fromArray(viewMatrix)
        this.camera.matrixWorldNeedsUpdate = true
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

    updateScene(op) {
        const prov = this.props.provider
        if (op.type === INSERT_ELEMENT) {
            const objid = op.value
            const obj = prov.accessObject(op.value)
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
            const node = this.findNode(op.object)
            if (node) {
                const obj = prov.accessObject(op.object)
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
            const node = this.findNode(op.value)
            if(node) {
                this.removeNodeMapping(op.value,node)
                const obj = prov.accessObject(op.value)
                if(is3DObjectType(obj.type)) node.parent.remove(node)
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
                    this.stopImageRecognizer()
                    this.stopGeoRecognizer()
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
            />
            <br/>
            <button onClick={this.moveCameraForward}>forward</button>
            <button onClick={this.moveCameraBackward}>backward</button>
            <ToasterNotification/>
        </div>
    }

    populateNode(nodeid) {
        const obj = this.props.provider.accessObject(nodeid)
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
            const graphObj = this.props.provider.accessObject(id)
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
        const logger = this.props.provider.pubnub.getLogger()
        return new Promise((res,rej) => {
            const img = new Image()
            img.crossOrigin = "Anonymous"
            img.src = info.image.src
            logger.log("Loading image",img.src)
            img.onload = () => {
                res(img)
            }
        }).then(img => {
            logger.log("got the image",toFlatString(img))
            //called when an anchor is started that wants to recognize an image
            // WebXR loaded?
            if(!this.xr || !this.xr.session) {
                logger.log("XR is not active?")
                return
            }

            // decorate the info.node with an xr anchor
            this.xr.addImageAnchoredNode(info, img, logger)
        })
    }

    stopImageRecognizer() {
        //TODO: @ahook
        console.log("WE NEED TO STOP ALL image recognizers here")
    }

    startGeoRecognizer(info) {

        // WebXR loaded?
        if(!this.xr || !this.xr.session) {
            console.error("XR is not active?")
            return
        }

        // decorate the info.node with an xr anchor
        this.xr.addGeoAnchoredNode(info)
    }

    stopGeoRecognizer() {
        //TODO: @ahook
        console.log("WE NEED TO STOP ALL geo recognizers here")
    }

}
