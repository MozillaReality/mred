export class SceneGraphProvider {
    //return the current scene. provider is in charge of tracking which scene is considered 'current'
    //including the default scene when the project loads
    getCurrentScene() { throw new Error("getCurrentScene not implemented")}
    getSceneObjects(scene) { throw new Error("getSceneObjects not implemented")}
    getBehaviorsForObject(obj) { throw new Error("getBehaviorsForObject(obj) not implemented")}
    getThreeObject(id) { throw new Error("getThreeObject(id) not implemented")}
    getParsedBehaviorAsset(beh) { throw new Error("getParsedBehaviorAsset(behavior) not implemented")}
    getAllBehaviors() { throw new Error("getAllBehaviors() not implemented")}

    //navigate to the specified scene
    navigateScene(id) { throw new Error("navigateScene(id) not implemented")}

    playMediaAsset(id) { throw new Error("playMediaAsset(id) not implemented")}
    stopMediaAsset(id) { throw new Error("stopMediaAsset(id) not implemented")}
    getGraphObjectByName(name) { throw new Error("getGraphObjectByName(name) not implemented")}
    getGraphObjectById(id) { throw new Error("getGraphObjectById(id) not implemented")}
    getCamera() { throw new Error("getCamera() not implemented")}
    getTweenManager() { throw new Error("getTweenManager() not implemented")}
}

export default class ScriptManager {
    constructor(sceneGraphProvider) {
        this.sgp = sceneGraphProvider
        this.running = false
        this.storage = {}
    }

    makeSystemFacade(evt) {
        const prov = this.prov
        const manager = this
        const sgp = this.sgp
        return {
            getCurrentScene() {
                return sgp.getCurrentScene()
            },
            getScene(name) {
                return null
            },
            getObject(name) {
                const obj = sgp.getGraphObjectByName(name)
                if(!obj) throw new Error(`object '${name}' not found`)
                return new ThreeObjectFacade(manager,obj)
            },
            getAsset(name) {
                const obj = sgp.getGraphObjectByName(name)
                if(!obj) throw new Error(`asset '${name}' not found`)
                return new AssetFacade(manager,obj)
            },
            getObjectById(id) {
                return sgp.getGraphObjectById(id)
            },
            navigateScene(id) {
                manager.fireSceneExit(this.getCurrentScene())
                sgp.navigateScene(id)
                manager.fireSceneEnter(this.getCurrentScene())
            },
            playSound(id) {
                const asset = sgp.getGraphObjectById(id)
                manager.playAudioAsset(asset)
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
            hasKeyValue(key, value) {
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
            }
        }
    }

    performClickAction(target) {
        if(!this.running) return
        try {
            if (!target || !target.exists || !target.exists()) return
            const evt = {
                type: 'click',
                target: target,
            }
            evt.system = this.makeSystemFacade(evt)
            const behaviors = this.sgp.getBehaviorsForObject(target)
            for (let i in behaviors) {
                let b = behaviors[i]
                evt.props = b.props()
                const asset = this.sgp.getParsedBehaviorAsset(b)
                if (asset.onClick) asset.onClick(evt)
            }
        } catch (error) {
            console.error("error in script",error.message)
            console.info(error)
            this.stopRunning()
        }
    }

    fireSceneExit(scene) {
        if(!scene) console.error("firing exit for a scene that is null")
        const evt = {
            type:'exit',
            target:scene,
        }
        evt.system = this.makeSystemFacade(evt)
        const behaviors = this.sgp.getBehaviorsForObject(scene)
        behaviors.forEach(b => {
            const asset = this.sgp.getParsedBehaviorAsset(b)
            if(asset.onExit) asset.onExit(evt)
        })
    }
    fireSceneEnter(scene) {
        const evt = {
            type:'enter',
            target:scene,
        }
        evt.system = this.makeSystemFacade(evt)
        const behaviors = this.sgp.getBehaviorsForObject(scene)
        behaviors.forEach(b => {
            const asset = this.sgp.getParsedBehaviorAsset(b)
            if(asset.onEnter) asset.onEnter(evt)
        })
    }

    tick(time) {
        if(!this.running) return
        try {
            const scene = this.sgp.getCurrentScene()
            if (!scene) return console.log("no current scene?!")
            const evt = {
                type:'tick',
                time:time
            }
            evt.system = this.makeSystemFacade(evt)
            const behaviors = this.sgp.getBehaviorsForObject(scene)
            behaviors.forEach(b => {
                evt.target = new ThreeObjectFacade(this,b.parent)
                const asset = this.sgp.getParsedBehaviorAsset(b)
                evt.props = b.props()
                if(asset.onTick) asset.onTick(evt)
            })
            this.sgp.getSceneObjects(scene).forEach(child => {
                const behaviors = this.sgp.getBehaviorsForObject(child)
                behaviors.forEach(b => {
                    evt.target = new ThreeObjectFacade(this,b.parent)
                    evt.graphTarget = child
                    const asset = this.sgp.getParsedBehaviorAsset(b)
                    evt.props = b.props()
                    if(asset.onTick) asset.onTick(evt)
                })
                const obj3 = this.sgp.getThreeObject(child.id)
                if(obj3 && obj3.update) obj3.update(time)
            })
        } catch (err) {
            console.error("error in script",err.message)
            console.info(err)
            this.stopRunning()
        }
    }


    startRunning() {
        this.running = true
        this.storage = {}
        console.log("script manager starting")
        this.sgp.getAllBehaviors().forEach(ref => {
            const asset = this.sgp.getParsedBehaviorAsset(ref)
            if(asset.init) asset.init()
        })
    }
    stopRunning() {
        this.running = false
        this.storage = {}
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
            target: new ThreeObjectFacade(this,target),
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
}
