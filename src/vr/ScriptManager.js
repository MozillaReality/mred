import * as ToasterMananager from './ToasterManager'
import {TOTAL_OBJ_TYPES} from './Common'

export default class ScriptManager {
    constructor(sceneGraphProvider) {
        this.sgp = sceneGraphProvider
        this.running = false
        this.storage = {}
    }

    getCurrentScene() {
        return this.sgp.getCurrentScene()
    }
    getSceneObjects(scene) {
        return this.sgp.getSceneObjects(scene)
    }
    getBehaviorsForObject(scene) {
        return this.sgp.getBehaviorsForObject(scene)
    }
    getGraphObjectByName(title) {
        return this.sgp.findGraphObjectByTitle(title)
    }
    getGraphObjectById(id) {
        return this.sgp.getGraphObjectById(id)
    }
    getThreeObject(id) {
        return this.sgp.findThreeObject(id)
    }
    playAudioAsset(obj) {
        return this.sgp.playAudioAsset(obj)
    }
    stopAudioAsset(obj) {
        return this.sgp.stopAudioAsset(obj)
    }
    navigateScene(id) {
        this.sgp.navigateScene(id)
    }
    getCamera() {
        return this.sgp.getCamera()
    }
    makeScriptContext() {
        return {

        }
    }

    makeSystemFacade(evt) {
        const prov = this.prov
        const manager = this
        return {
            getCurrentScene() {
                return manager.getCurrentScene()
            },
            getScene(name) {
                return null
            },
            getObject(name) {
                const obj = manager.getGraphObjectByName(name)
                if(!obj) throw new Error(`object '${name}' not found`)
                return new ThreeObjectFacade(manager,obj)
            },
            getAsset(name) {
                const obj = manager.getGraphObjectByName(name)
                if(!obj) throw new Error(`asset '${name}' not found`)
                return new AssetFacade(manager,obj)
            },
            getObjectById(id) {
                return manager.getGraphObjectById(id)
            },
            navigateScene(id) {
                manager.fireSceneExit(this.getCurrentScene())
                manager.navigateScene(id)
                manager.fireSceneEnter(this.getCurrentScene())
            },
            playSound(id) {
                const asset = manager.getGraphObjectById(id)
                manager.playAudioAsset(asset)
            },
            getCamera() {
                return manager.getCamera()
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
            }
        }
    }

    performClickAction(target) {
        if(!this.running) return
        if(!target || !target.exists())return
        const evt = {
            type:'click',
            target:target,
        }
        evt.system = this.makeSystemFacade(evt)
        const behaviors = this.getBehaviorsForObject(target)
        for(let i in behaviors) {
            let b = behaviors[i]
            evt.props = b.props()
            const asset = this.sgp.getParsedBehaviorAsset(b)
            if(asset.onClick) asset.onClick(evt)
        }
    }

    fireSceneExit(scene) {
        if(!scene) console.error("firing exit for a scene that is null")
        const evt = {
            type:'exit',
            target:scene,
        }
        evt.system = this.makeSystemFacade(evt)
        const behaviors = this.getBehaviorsForObject(scene)
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
        const behaviors = this.getBehaviorsForObject(scene)
        behaviors.forEach(b => {
            const asset = this.sgp.getParsedBehaviorAsset(b)
            if(asset.onEnter) asset.onEnter(evt)
        })
    }

    tick(time) {
        if(!this.running) return
        const scene = this.getCurrentScene()
        if (!scene) return console.log("no current scene?!")
        const evt = {
            type:'tick',
            time:time
        }
        evt.system = this.makeSystemFacade(evt)
        const behaviors = this.getBehaviorsForObject(scene)
        behaviors.forEach(b => {
            evt.target = new ThreeObjectFacade(this,b.parent)
            const asset = this.sgp.getParsedBehaviorAsset(b)
            evt.props = b.props()
            if(asset.onTick) asset.onTick(evt)
        })
        this.getSceneObjects(scene).forEach(child => {
            const behaviors = this.getBehaviorsForObject(child)
            behaviors.forEach(b => {
                evt.target = new ThreeObjectFacade(this,b.parent)
                evt.graphTarget = child
                const asset = this.sgp.getParsedBehaviorAsset(b)
                evt.props = b.props()
                if(asset.onTick) asset.onTick(evt)
            })
            const obj3 = this.getThreeObject(child.id)
            if(obj3 && obj3.update) obj3.update(time)
        })
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
        const behaviors = this.getBehaviorsForObject(target)
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
        this.manager.playAudioAsset(this.obj)
    }
    stop() {
        this.manager.stopAudioAsset(this.obj)
    }
}
class ThreeObjectFacade {
    constructor(manager,obj) {
        this.manager = manager
        this.obj = obj
    }
    getPosition() {
        return this.manager.getThreeObject(this.obj).position
    }
    setPosition(x,y,z) {
        this.manager.getThreeObject(this.obj).position.set(x,y,z)
    }
    getRotation() {
        return this.manager.getThreeObject(this.obj).rotation
    }
    setVisible(visible) {
        const threeobj = this.manager.getThreeObject(this.obj)
        threeobj.visible = visible
    }
    isVisible() {
        return this.manager.getThreeObject(this.obj).visible
    }
}
