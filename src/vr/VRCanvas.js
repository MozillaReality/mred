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
    logger() {
        return this.canvas.props.provider.getLogger()
    }

    getCurrentScene() {
        const scene = this.canvas.props.provider.getSelectedSceneObject()
        if(!scene || !scene.exists()) {
            this.logger.error("the current scene is null")
            return null
        }
        return scene
    }
    getSceneObjects(scene) {
        return scene.getChildren().filter(ch => is3DObjectType(ch.type))
    }
    getBehaviorsForObject(scene) {
        return scene.getChildren().filter(ch => ch.type === TOTAL_OBJ_TYPES.BEHAVIOR)
    }
    getThreeObject(obj) {
        if(obj.id) return this.canvas.findNode(obj.id)
        return this.canvas.findNode(obj)
    }
    getParsedBehaviorAsset(beh) {
        const prov = this.canvas.props.provider
        const asset = prov.accessObject(beh.behavior)
        return prov.getCachedBehaviorAsset(asset.id)
    }

    getAllBehaviors() {
        return this.canvas.props.provider.accessObject(this.canvas.props.provider.getSceneRoot())
            .find((obj)=> obj.type === TOTAL_OBJ_TYPES.BEHAVIOR)
    }
    getAllScenes() {
        return this.canvas.props.provider.accessObject(this.canvas.props.provider.getSceneRoot())
            .find((obj)=>obj.type === TOTAL_OBJ_TYPES.SCENE)
    }

    navigateScene(id) {
        const obj = this.canvas.props.provider.accessObject(id)
        if(obj.exists()) {
            SelectionManager.setSelection(id)
        } else {
            const logger = this.canvas.props.provider.getLogger()
            logger.error("cannot navigate to a scene that doesn't exist",id)
        }
    }


    playMediaAsset(asset, trusted=false) {
        this.canvas.props.provider.assetsManager.playMediaAsset(asset, trusted)
    }

    stopMediaAsset(asset) {
        this.canvas.props.provider.assetsManager.stopMediaAsset(asset)
    }
    getGraphObjectByName(title) {
        const list = this.canvas.props.provider.accessObject(this.canvas.props.provider.getSceneRoot()).find((o)=>o.title === title)
        if(!list || list.length<1) return null
        return list[0]
    }

    getGraphObjectById(id) {
        return this.canvas.props.provider.accessObject(id)
    }


    getCamera() {
        return this.canvas.camera
    }
    
    getTweenManager() {
        return this.canvas.tweenManager
    }
    startLocalAnchor(info) {
        return this.canvas.startLocalAnchor(info)
    }
    stopLocalAnchor(info) {
        return this.canvas.stopLocalAnchor(info)
    }
    startImageRecognizer(info) {
        return this.canvas.startImageRecognizer(info)
    }
    stopImageRecognizer(info) {
        return this.canvas.stopImageRecognizer(info)
    }
    startGeoTracker(info) {
        return this.canvas.startGeoTracker(info)
    }
    stopGeoTracker(info) {
        return this.canvas.stopGeoTracker(info)
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
            if(!node) return
            this.orbitControls.target0.copy(node.position)
            const cam = node.position.clone().sub(new THREE.Vector3(0,0,-2))
            this.orbitControls.position0.copy(cam)
            this.orbitControls.reset()
        }
        if(obj.type === TOTAL_OBJ_TYPES.SCENE) {
            this.orbitControls.saveState()
            this.orbitControls.target0.set(0,0,0)
            this.orbitControls.position0.set(1,6,6)
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
        this.current_scene_wrapper = null
        this.scriptManager = new ScriptManager(new Adapter(this),this.props.provider.getLogger())
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

        const sceneObj = this.props.provider.getSelectedSceneObject()
        if(!sceneObj.exists()) return this.props.provider.getLogger().error("no selected scene found")
        const sceneNode = this.findNode(sceneObj.id)
        this.setCurrentSceneWrapper(sceneNode, false)
    }
    rebuildNode(obj, inset) {
        // console.log(inset,"rebuilding",obj.type)
        if(obj.type === TOTAL_OBJ_TYPES.SCENE) {
            const node = new SceneDef().makeNode(obj,this.props.provider)
            this.insertNodeMapping(obj.id,node)
            this.addSceneWrapper(node)
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

        if(obj.type === TOTAL_OBJ_TYPES.SCENE) return this.setCurrentSceneWrapper(this.findNode(sel),true)

        if(is3DObjectType(obj.type)) {
            const sc = this.props.provider.findSceneObjectParent(obj)
            this.setCurrentSceneWrapper(this.findNode(sc.id),true)
            const node = this.findNode(sel)
            if (!node) return
            this.transformControls.attach(node)
            return
        }
        console.log("selected something not an object or scene")
    }

    checkAspectRatio() {
        if(!this.canvas) return
        const w = this.wrapper.clientWidth
        const h = this.wrapper.clientHeight
        const aspect = w/h
        if(Math.abs(this.camera.aspect - aspect) > 0.001 ) {
            this.camera.aspect = aspect
            this.camera.updateProjectionMatrix()
            this.renderer.setSize(w-4,h-4)
        }
    }

    componentDidMount() {
        const canvas = this.canvas
        const logger = this.props.provider.getLogger()
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
        this.saveOrbitControlsState()
        this.transformControls.removeEventListener('change',this.transformChanged)
        this.transformControls.removeEventListener('mouseDown',this.pauseQueue)
        this.transformControls.removeEventListener('mouseUp',this.unpauseQueue)
        this.props.provider.off(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED,this.docSwapped)
        SelectionManager.off(SELECTION_MANAGER.CHANGED,this.selectionChanged)
    }

    setupRenderer(canvas,context) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({antialias: false, canvas: canvas, context:context});
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.gammaOutput = true
        this.audioListener = new THREE.AudioListener()
        this.props.provider.setAudioListener(this.audioListener)
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

        this.docSwapped()
    }

    animationLoop(time, frame) {
        this.checkAspectRatio()
        let session = null
        if(this.xr) session = this.xr.session
        if(this.state.running) this.scriptManager.tick(time, session)
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
            if(obj.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT) return
            if(obj.type === TOTAL_OBJ_TYPES.BEHAVIOR) return
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
                    this.stopAllMedia()
                    this.resetSceneGraph()
                    this.stopRecognizers()
                } else {
                    //start the script manager
                    this.startRecognizers()
                    this.scriptManager.startRunning()
                    this.scriptManager.startFirstScene();
                }
                return false
            }
        }
        return false
    }

    render() {
        return <div style={{
            borderWidth:0,
            boxSizing:'border-box',
            height:'100%',
            display:'flex',
            flexDirection:'column'
        }}>
            <button onClick={this.recenterOnSelection}>recenter on selection</button>
            <div style={{
                boxSizing:'border-box',
                borderWidth:0,
                margin:0,
                padding:0,
                flex:1.0,
                overflow:'auto',
            }}
                 ref={c => this.wrapper = c}
            >
                <canvas ref={c => this.canvas = c}
                        style={{
                            boxSizing:'border-box',
                            margin:0,
                            padding:0,
                            width:'100px',
                            height:'100px',
                            borderWidth:0,
                        }}
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
            if(!parent) {
                //this must be a nested pasted child. we can fix the parent links later
                return null
            }
            parent.add(obj3d)
            this.rebuildParentLink(obj)
            return obj3d
        }
        if (obj.type === TOTAL_OBJ_TYPES.SCENE) {
            const scene = new SceneDef().makeNode(obj,this.props.provider)
            this.insertNodeMapping(nodeid, scene)
            this.addSceneWrapper(scene)
            this.setCurrentSceneWrapper(scene,true)
            return scene
        }

        console.warn("cannot populate node for type", obj.type)
    }

    rebuildParentLink(obj) {
        obj.getChildren().forEach((ch)=>{
            const ch3 = this.findNode(ch.id)
            if(!ch3.parent) this.findNode(obj.id).add(ch3)
            this.rebuildParentLink(ch)
        })
    }

    addSceneWrapper(scene) {
        this.scenes.push(scene)
        this.scene.add(scene)
    }

    saveOrbitControlsState() {
        const scene = this.scenes.find(sc => sc.visible)
        this.orbitControls.saveState()
        const id = scene.userData.graphid
        this.props.provider.orbit_state[id] = {
            target: this.orbitControls.target0.clone(),
            position:this.orbitControls.position0.clone(),
        }
    }
    restoreOrbitControlsState(scene) {
        const id = scene.userData.graphid
        if(this.props.provider.orbit_state[id]) {
            const state = this.props.provider.orbit_state[id]
            this.orbitControls.target0.copy(state.target)
            this.orbitControls.position0.copy(state.position)
            this.orbitControls.reset()
        }
    }
    setCurrentSceneWrapper(scene, saveState) {
        if(!scene) return this.props.provider.getLogger().error("invalid scene. cannot setCurrentSceneWrapper")
        const cur = this.getCurrentSceneWrapper()
        const changed = (scene !== cur)
        if(changed && saveState) this.saveOrbitControlsState()
        this.current_scene_wrapper = scene
        this.scenes.forEach(sc => {
            if(sc === scene) {
                sc.visible = true
            } else {
                sc.visible = false
            }
        })
        if(changed) this.restoreOrbitControlsState(scene)
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
        return this.current_scene_wrapper
    }

    clickedCanvas = (e) => {
        this.canvas.focus()
        const rect = this.canvas.getBoundingClientRect();
        const pointer = {
            x: ( e.clientX - rect.left ) / rect.width * 2 - 1,
            y: - ( e.clientY - rect.top ) / rect.height * 2 + 1,
        }

        function findKnownParent(node) {
            if(!node) return null
            if(node.userData.graphid) return node
            return findKnownParent(node.parent)
        }

        this.raycaster.setFromCamera(pointer, this.camera);
        const intersect = this.raycaster.intersectObjects(this.getCurrentSceneWrapper().children, true)
        if(intersect && intersect.length >= 1) {
            let obj = findKnownParent(intersect[0].object)
            if(this.state.running) {
                this.scriptManager.performClickAction(this.props.provider.accessObject(obj.userData.graphid), e)
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

    stopAllMedia() {
        this.props.provider.assetsManager.stopAllMedia()
    }

    startRecognizers() {
        //called when script running is started
    }

    stopRecognizers() {
        //called when script running is started
    }

    startLocalAnchor(info) {
        this.props.provider.getLogger().log("NOTHING DONE TO start local anchor")
    }

    stopLocalAnchor(info) {
        this.props.provider.getLogger().log("NOTHING DONE TO stop local anchor")
    }

    startImageRecognizer(info) {
        this.props.provider.getLogger().log("NOTHING DONE TO start image recognizer")
    }

    stopImageRecognizer(info) {
        this.props.provider.getLogger().log("NOTHING DONE TO stop image recognizer")
    }

    startGeoTracker(info) {
        this.props.provider.getLogger().log("NOTHING DONE TO start geo recognizer")
    }

    stopGeoTracker(info) {
        this.props.provider.getLogger().log("NOTHING DONE TO stop geo recognizer")
    }

    startWorldInfo(info) {
        this.props.provider.getLogger().log("NOTHING DONE TO start world info")
    }

    stopWorldInfo(info) {
        this.props.provider.getLogger().log("NOTHING DONE TO stop world info")
    }

}
