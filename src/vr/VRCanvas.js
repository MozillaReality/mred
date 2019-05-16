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
import {toFlatString} from '../utils'
import {XRSupport} from './XRSupport'
import OrbitControls from './OrbitControls'

const {SET_PROPERTY, INSERT_ELEMENT, DELETE_ELEMENT} = require("syncing_protocol");


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
    getAllScenes() {
        return this.canvas.props.provider.accessObject(this.canvas.props.provider.getSceneRoot())
            .find((obj)=>obj.type === TOTAL_OBJ_TYPES.SCENE)
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


const MOVE_SPEED = 0.1
export class VRCanvas extends Component {
    moveCameraForward = () => {
        this.camera.position.z += -MOVE_SPEED
    }
    moveCameraBackward = () => {
        this.camera.position.z += MOVE_SPEED
    }
    handleKeyPress = (e) => {
        if(e.key === 'ArrowUp') {
            this.camera.position.z -= MOVE_SPEED
        }
        if(e.key === 'ArrowDown') {
            this.camera.position.z += MOVE_SPEED
        }
        if(e.key === 'a') {
            this.camera.position.x -= MOVE_SPEED
        }
        if(e.key === 'd') {
            this.camera.position.x += MOVE_SPEED
        }
        if(e.key === 'ArrowLeft') {
            this.camera.rotation.y += 0.1
        }
        if(e.key === 'ArrowRight') {
            this.camera.rotation.y -= 0.1
        }
    }
    recenterOnSelection = () => {
        const sel = SelectionManager.getSelection()
        if(!sel) return
        const obj = this.props.provider.accessObject(sel)
        if(is3DObjectType(obj.type)) {
            const node = this.findNode(sel)
            this.orbitControls.target.copy(node.position)
        }
        if(obj.type === TOTAL_OBJ_TYPES.SCENE) {
            this.orbitControls.reset()
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
        this.scriptManager = new ScriptManager(new Adapter(this),this.props.provider.pubnub.getLogger())
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
    transformDraggingChanged = (e) => {
        this.orbitControls.enabled = ! e.value
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
            const node = new SceneDef().makeNode(obj,this.props.provider)
            this.insertNodeMapping(obj.id,node)
            this.addSceneWrapper(node)
            this.setCurrentSceneWrapper(node)
        }
        if(is3DObjectType(obj.type)) {
            const node = get3DObjectDef(obj.type).makeNode(obj,this.props.provider)
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
        this.transformControls.detach()
        const sel = SelectionManager.getSelection()
        if(!sel) return
        const obj = this.props.provider.accessObject(sel)

        if(obj.type === TOTAL_OBJ_TYPES.SCENE) return this.setCurrentSceneWrapper(this.findNode(sel))

        if(is3DObjectType(obj.type)) {
            const sc = this.props.provider.findSceneObjectParent(obj)
            this.setCurrentSceneWrapper(this.findNode(sc.id))
            const node = this.findNode(sel)
            if (!node) return
            this.transformControls.attach(node)
            return
        }
        console.log("selected something not an object or scene")
    }
    windowResized = () => {
        if(this.canvas) {
            let cw = this.canvas.clientWidth
            let ch = this.canvas.clientHeight
            this.camera.aspect = cw/ch;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(cw,ch);
        }
    }

    checkAspectRatio() {
        let cw = this.canvas.clientWidth
        let ch = this.canvas.clientHeight
        const aspect = cw/ch
        if(Math.abs(this.camera.aspect - aspect) > 0.01 ) {
            this.camera.aspect = aspect
            this.camera.updateProjectionMatrix()
            this.renderer.setSize(cw,ch);
        }
    }

    componentDidMount() {
        const canvas = this.canvas
        const logger = this.props.provider.pubnub.getLogger()
        logger.log("mounting VRCanvas")
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
        this.transformControls.removeEventListener('change',this.transformChanged)
        this.transformControls.removeEventListener('mouseDown',this.pauseQueue)
        this.transformControls.removeEventListener('mouseUp',this.unpauseQueue)
        this.props.provider.off(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED,this.docSwapped)
        SelectionManager.off(SELECTION_MANAGER.CHANGED,this.selectionChanged)
        window.removeEventListener('resize',this.windowResized)
    }

    setupRenderer(canvas,context) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({antialias: false, canvas: canvas, context:context});
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.gammaOutput = true
        this.audioListener = new THREE.AudioListener()
        this.camera.add(this.audioListener)
        //only set a background if there is no XR active
        if(!this.xr) this.scene.background = new THREE.Color(0x000000);
        // this.camera.matrixAutoUpdate = false
        this.scene.add(this.camera)
        this.camera.position.set(1,6,6)

        this.transformControls = new TransformControls(this.camera, this.renderer.domElement)
        this.transformControls.addEventListener('change',this.transformChanged)
        this.transformControls.addEventListener('dragging-changed', this.transformDraggingChanged)
        this.transformControls.addEventListener('mouseDown',this.pauseQueue)
        this.transformControls.addEventListener('mouseUp',this.unpauseQueue)
        this.scene.add(this.transformControls)

        this.orbitControls = new OrbitControls(this.camera,this.renderer.domElement)
        this.orbitControls.update()
        // this.orbitControls.autoRotate = true
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
        this.checkAspectRatio()
        let session = null
        if(this.xr) session = this.xr.session
        if(this.state.running) this.scriptManager.tick(time, session, frame)
        if(this.tweenManager) this.tweenManager.update(time)
        if(this.orbitControls) this.orbitControls.update()
        this.previewUpdateNodes.forEach(n => n.previewUpdate())
        this.renderer.render(this.scene, this.camera)
    }

    animationLoopWithCamera(bounds,projectionMatrix,viewMatrix, time,frame) {
        if(!this.scene || !this.camera) return
        this.camera.matrix.fromArray(viewMatrix)
        this.camera.matrixWorldNeedsUpdate = true
        this.camera.updateMatrixWorld()
        this.camera.projectionMatrix.fromArray(projectionMatrix)
        this.animationLoop(time,frame)
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
            this.transformControls.detach()
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
                    this.stopRecognizers()
                } else {
                    //start the script manager
                    this.startRecognizers()
                    this.scriptManager.startRunning()
                }
                return false
            }
        }
        return false
    }

    render() {
        return <div style={{}}>
            <button onClick={this.recenterOnSelection}>recenter on selection</button>
            <div style={{
                borderWidth:0,
                margin:0,
                padding:0,
                display:'flex',
                flexDirection:'column',
                height:'100%',
            }}>
                <canvas ref={c => this.canvas = c} width={'200px'} height={'200px'}
                        onClick={this.clickedCanvas}
                        className="editable-canvas"
                        onKeyDown={this.handleKeyPress}
                        tabIndex={0}
                />
                <ToasterNotification/>
            </div>
        </div>
    }

    populateNode(nodeid) {
        const obj = this.props.provider.accessObject(nodeid)
        if (is3DObjectType(obj.type)) {
            const obj3d = get3DObjectDef(obj.type).makeNode(obj,this.props.provider)
            this.insertNodeMapping(nodeid, obj3d)
            const parent = this.findNode(obj.parent)
            parent.add(obj3d)
            return obj3d
        }
        if (obj.type === TOTAL_OBJ_TYPES.SCENE) {
            const scene = new SceneDef().makeNode(obj,this.props.provider)
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

    startRecognizers() {
        //called when script running is started
    }

    stopRecognizers() {
        //called when script running is started
    }

    startImageRecognizer(info) {
        const logger = this.provider.pubnub.getLogger()
        
        logger.log("NOTHING DONE TO start image recognizer")
    }

    stopImageRecognizer(info) {
        const logger = this.provider.pubnub.getLogger()
        
        logger.log("NOTHING DONE TO stop image recognizer")
    }

    startGeoRecognizer(info) {
        const logger = this.provider.pubnub.getLogger()
        
        logger.log("NOTHING DONE TO start geo recognizer")
    }

    stopGeoRecognizer(info) {
        const logger = this.provider.pubnub.getLogger()
        
        logger.log("NOTHING DONE TO stop geo recognizer")
    }

}
