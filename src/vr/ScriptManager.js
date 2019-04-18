import * as ToasterMananager from './ToasterManager'
import {TOTAL_OBJ_TYPES} from './Common'

export default class ScriptManager {
    constructor(sceneGraphProvider) {
        this.sgp = sceneGraphProvider
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
    navigateScene(id) {
        return this.sgp.navigateScene(id)
    }
    makeScriptContext() {
        return {

        }
    }

    makeSystemFacade() {
        const prov = this.prov
        const manager = this
        return {
            getCurrentScene() {
                return null
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
                return manager.navigateScene(id)
            },
            setKeyValue(key, value) {
            },
            getKeyValue(key, value) {
            },
            hasKeyValue(key, value) {
            },
            isAR() {
                return false
            },
        }
    }
    executeScriptAction(action,obj) {
        const type = obj.trigger
        const evt = {
            type:type,
            system:this.makeSystemFacade(),
        }
        const txt = `
            const toRadians = (deg) => deg*Math.PI/180 
            ${action.scriptBody}
            new MyScript()
        `;
        console.log("running the script",txt)
        const ctx = this.makeScriptContext()

        function doit(ctx) {
            const obj = eval(txt);
            console.log("returned",obj)
            obj.handle(evt)

        }

        try {
            doit(ctx);
        } catch (e) {
            ToasterMananager.add('ERROR: ' + e.message)
            console.error(e.message)
            console.log(e)
        }
    }
    performClickAction(target) {
        console.log("user clicked on",target)
        const evt = {
            type:'click',
            target:target,
            system:this.makeSystemFacade(),
        }
        const behaviors = target.find(o => o.type === TOTAL_OBJ_TYPES.BEHAVIOR)
        for(let i in behaviors) {
            let b = behaviors[i]
            evt.props = b.props()
            const asset = this.sgp.getParsedBehaviorAsset(b)
            if(asset.onClick) asset.onClick(evt)
        }
    }

    startRunning() {
        console.log("script manager starting")
        const nodes = this.sgp.getAllBehaviors()
        nodes.forEach(ref => {
            const asset = this.sgp.getParsedBehaviorAsset(ref)
            console.log("behavior asset",asset)
            if(asset.init) asset.init()
        })

    }
    stopRunning() {
        console.log("script manager stopping")
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
}
class ThreeObjectFacade {
    constructor(manager,obj) {
        this.manager = manager
        this.obj = obj
    }
    setPosition(x,y,z) {
        this.manager.getThreeObject(this.obj).position.set(x,y,z)
    }
    setVisible(visible) {
        const threeobj = this.manager.getThreeObject(this.obj)
        threeobj.visible = visible
    }
    isVisible() {
        return this.manager.getThreeObject(this.obj).visible
    }
}
