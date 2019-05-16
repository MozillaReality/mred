import {canHaveBehavior, TOTAL_OBJ_TYPES} from './Common'
import * as THREE from "three"
import WebLayer3D from 'three-web-layer'
import GPUParticles from './defs/GPUParticles'
import GLTFLoader from './GLTFLoader'

export class SceneGraphProvider {
    //return the current scene. provider is in charge of tracking which scene is considered 'current'
    //including the default scene when the project loads
    getCurrentScene() { throw new Error("getCurrentScene not implemented")}
    getSceneObjects(scene) { throw new Error("getSceneObjects not implemented")}
    getBehaviorsForObject(obj) { throw new Error("getBehaviorsForObject(obj) not implemented")}
    //return threejs object for the id of the graph object
    getThreeObject(id) { throw new Error("getThreeObject(id) not implemented")}
    getParsedBehaviorAsset(beh) { throw new Error("getParsedBehaviorAsset(behavior) not implemented")}
    getAllBehaviors() { throw new Error("getAllBehaviors() not implemented")}
    getAllScenes() { throw new Error("getAllScenes not implemented")}

    //navigate to the specified scene
    navigateScene(id) { throw new Error("navigateScene(id) not implemented")}

    playMediaAsset(id) { throw new Error("playMediaAsset(id) not implemented")}
    stopMediaAsset(id) { throw new Error("stopMediaAsset(id) not implemented")}
    getGraphObjectByName(name) { throw new Error("getGraphObjectByName(name) not implemented")}
    getGraphObjectById(id) { throw new Error("getGraphObjectById(id) not implemented")}
    getCamera() { throw new Error("getCamera() not implemented")}
    getTweenManager() { throw new Error("getTweenManager() not implemented")}
    startImageRecognizer(info) { throw new Error("startImageRecognizer not implemented")}
    startGeoRecognizer(info) { throw new Error("startGeoRecognizer not implemented")}
}

export default class ScriptManager {
    constructor(sceneGraphProvider, logger) {
        this.sgp = sceneGraphProvider
        this.logger = logger
        this.running = false
        this.storage = {}
        this.logger = logger
        this.logger.log("ScriptManager created")

        if (!window.THREE) window.THREE = THREE
        if (!window.GLTFLoader) window.GLTFLoader = GLTFLoader
        if (!window.GPUParticles) window.GPUParticles = GPUParticles
        if (!window.WebLayer3D) window.WebLayer3D = WebLayer3D
    }

    makeSystemFacade(evt) {
        const manager = this
        const sgp = this.sgp
        return {
            globals() {
                return {
                    THREE:THREE,
                    GLTFLoader: GLTFLoader,
                    GPUParticles: GPUParticles,
                    WebLayer3D: WebLayer3D
                }
            },
            logger() {
                return manager.logger
            },
            getCurrentScene() {
                return sgp.getCurrentScene()
            },
            getScene(name) {
                return null
            },
            getObject(name) {
                const obj = sgp.getGraphObjectByName(name)
                if(!obj) throw new Error(`object '${name}' not found`)
                return sgp.getThreeObject(obj)
            },
            getAsset(name) {
                const obj = sgp.getGraphObjectByName(name)
                if(!obj) throw new Error(`asset '${name}' not found`)
                return new AssetFacade(manager,obj)
            },
            getObjectById(id) {
                return sgp.getGraphObjectById(id)
            },
            getThreeObjectById(id) {
                return sgp.getThreeObject(id)
            },
            navigateScene(id) {
                manager.fireSceneLifecycleEvent('exit',this.getCurrentScene())
                sgp.navigateScene(id)
                manager.fireSceneLifecycleEvent('enter',this.getCurrentScene())
            },
            playSound(id) {
                const asset = sgp.getGraphObjectById(id)
                manager.playMediaAsset(asset)
            },
            getCamera() {
                return sgp.getCamera()
            },
            setKeyValue(key, value) {
                manager.storage[key] = value
            },
            getKeyValue(key, defaultValue) {
                return manager.storage[key]
            },
            hasKeyValue(key) {
                return typeof manager.storage[key] !== 'undefined'
            },
            isAR() {
                return false
            },
            sendMessage(name,payload) {
                const target = evt.graphTarget
                if(target) {
                    manager.fireMessageAtTarget(name,payload,target)
                }
            },
            getTweenManager() {
                return sgp.getTweenManager()
            },
            on(target,type,cb) {
                manager.on(target,type,cb)
            },
            fireEvent(target,type, payload) {
                manager.fireEventFromTarget(target,type,payload)
            },
            startImageRecognizer(info) {
                return sgp.startImageRecognizer(info)
            },
            stopImageRecognizer(info) {
                return sgp.stopImageRecognizer(info)
            },
            startGeoRecognizer(info) {
                return sgp.startGeoRecognizer(info)
            },
            stopGeoRecognizer(info) {
                return sgp.stopGeoRecognizer(info)
            }
        }
    }

    performClickAction(target) {
        if(!this.running) return
        try {
            this.logger.log("script manager, got a click event",target)
            if (!target || !target.exists || !target.exists()) return
            const evt = {
                type: 'click',
                target: this.sgp.getThreeObject(target),
                graphTarget: target
            }
            evt.system = this.makeSystemFacade(evt)
            const behaviors = this.sgp.getBehaviorsForObject(target)
            for (let i in behaviors) {
                let b = behaviors[i]
                evt.props = b.props()
                const asset = this.sgp.getParsedBehaviorAsset(b)
                if (asset.click) asset.click(evt)
            }
        } catch (error) {
            this.logger.error("error in performClickAction",error.message)
            this.logger.error(error)
            this.stopRunning()
        }
    }

    fireLifecycleEvent(type) {
        this.logger.log(`doing ${type} event`)
        const evt = {
            type:type,
        }
        evt.system = this.makeSystemFacade(evt)
        this.sgp.getAllScenes().forEach(scene => {
            scene.find(child => {
                // this.logger.log(`calling ${type} on ${child.type} ${child.id}`)
                if(child.type === TOTAL_OBJ_TYPES.BEHAVIOR) {
                    evt.target = this.sgp.getThreeObject(child.parent)
                    evt.graphTarget = this.sgp.getGraphObjectById(child.parent)
                    evt.props = child.props()
                    const asset = this.sgp.getParsedBehaviorAsset(child)
                    if(asset[type]) asset[type](evt)
                } else {
                    evt.target = this.sgp.getThreeObject(child)
                    evt.graphTarget = child
                    if(evt.target && evt.target[type]) evt.target[type](evt)
                }
            })
        })
    }

    fireSceneLifecycleEvent(type, scene, time) {
        if(type!=='tick') this.logger.log(`doing ${type} event`)
        const evt = {
            type:type,
            time:time-this.startTime,
            session: this.session,
            frame: this.frame,
        }
        evt.system = this.makeSystemFacade(evt)

        scene.find(child => {
            if(type!=='tick') this.logger.log(`calling ${type} on ${child.type} ${child.id}`)
            if(child.type === TOTAL_OBJ_TYPES.BEHAVIOR) {
                evt.target = this.sgp.getThreeObject(child.parent)
                evt.graphTarget = this.sgp.getGraphObjectById(child.parent)
                evt.props = child.props()
                const asset = this.sgp.getParsedBehaviorAsset(child)
                if(asset[type]) asset[type](evt)
            } else {
                evt.target = this.sgp.getThreeObject(child)
                evt.graphTarget = child
                if(evt.target && evt.target[type]) {
                    // this.logger.log(`we are readly doing ${type}`,type,'on',child.type)
                    evt.target[type](evt)
                }
            }
        })
    }

    tick(time, session, frame) {
        if(!this.running) return
        if(this.startTime ===0) this.startTime = time
        try {
            this.session = session
            this.frame = frame
            this.fireSceneLifecycleEvent('tick',this.sgp.getCurrentScene(),time)
        } catch (err) {
            console.error("error in script",err.message)
            console.info(err)
            this.stopRunning()
        }
    }


    startRunning() {
        this.running = true
        this.startTime = 0
        this.storage = {}
        this.logger.log("ScriptManager starting")
        try {
            this.fireLifecycleEvent('start')
            this.fireSceneLifecycleEvent('enter',this.sgp.getCurrentScene())
        } catch(err) {
            this.logger.error("error in script",err.message)
            this.logger.error(err)
            this.stopRunning()
        }
    }
    stopRunning() {
        try {
            this.fireSceneLifecycleEvent('exit',this.sgp.getCurrentScene())
            this.fireLifecycleEvent('stop')
            this.running = false
            this.storage = {}
            this.destroyListeners()
        } catch(err) {
            this.running = false
            this.logger.error("error stopping scripts",err.message)
            this.logger.error(err)
        }
        console.log("script manager stopping")
    }
    isRunning() {
        return this.running
    }

    fireMessageAtTarget(name, payload, target) {
        const evt = {
            type:'message',
            name:name,
            message:payload,
            time:Date.now(),
            target: this.sgp.getThreeObject(target),
            graphTarget:target,
        }
        evt.system = this.makeSystemFacade(evt)
        const behaviors = this.sgp.getBehaviorsForObject(target)
        behaviors.forEach(b => {
            evt.props = b.props()
            const asset = this.sgp.getParsedBehaviorAsset(b)
            if(asset.onMessage) asset.onMessage(evt)
        })
    }

    destroyListeners() {
        this.listeners = {}
    }
    on(target,type,cb) {
        if(!this.listeners) this.listeners = {}
        if(!this.listeners[target.id]) this.listeners[target.id] = {}
        if(!this.listeners[target.id][type]) this.listeners[target.id][type] = []
        this.listeners[target.id][type].push(cb)
    }

    fireEventFromTarget(target, type, payload) {
        if(!this.listeners) return
        if(!this.listeners[target.id]) return
        if(!this.listeners[target.id][type]) return
        this.listeners[target.id][type].forEach(cb => cb(payload))
    }
}


class AssetFacade {
    constructor(manager,obj) {
        this.manager = manager
        this.obj = obj
    }
    play() {
        this.manager.sgp.playMediaAsset(this.obj)
    }
    stop() {
        this.manager.sgp.stopMediaAsset(this.obj)
    }
}
class ThreeObjectFacade {
    constructor(manager,obj) {
        this.manager = manager
        this._TYPE = 'ThreeObjectFacade'
        this.obj = obj
    }
    get position() {
        return this.manager.sgp.getThreeObject(this.obj).position
    }
    set position(val) {
        this.manager.sgp.getThreeObject(this.obj).position.copy(val)
    }

    get rotation() {
        return this.manager.sgp.getThreeObject(this.obj).rotation
    }
    get visible() {
        return this.manager.sgp.getThreeObject(this.obj).visible
    }
    set visible(val) {
        return this.manager.sgp.getThreeObject(this.obj).visible = val
    }
    lookAt(vec) {
        return this.manager.sgp.getThreeObject(this.obj).lookAt(vec)
    }
}
