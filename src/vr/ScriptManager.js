import * as ToasterMananager from './ToasterManager'

export default class ScriptManager {
    constructor(provider, sceneGraphProvider) {
        this.prov = provider
        this.sgp = sceneGraphProvider
    }

    getThreeObject(id) {
        return this.sgp.findThreeObjectByGraphId(id)
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
                const obj = prov.getDataGraph().getObjectByProperty('title',name)
                if(!obj) throw new Error(`object '${name}' not found`)
                console.log("found the obj",obj)
                const realobj = prov.accessObject(obj)
                return new ThreeObjectFacade(realobj,manager,obj)
            },
            getAsset(name) {
                const obj = prov.getDataGraph().getObjectByProperty('title',name)
                const realobj = prov.accessObject(obj)
                return new AssetFacade(realobj,manager)
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
}


class AssetFacade {
    constructor(obj,manager) {
        this.obj = obj
        this.manager = manager
    }
    play() {
        this.manager.playAudioAsset(this.obj,'somethign')
    }
}
class ThreeObjectFacade {
    constructor(obj,manager,id) {
        this.obj = obj
        this.manager = manager
        this.id = id
    }
    setPosition(x,y,z) {
        const threeobj = this.manager.getThreeObject(this.id)
        threeobj.position.set(x,y,z)
    }
    setVisible(visible) {
        const threeobj = this.manager.getThreeObject(this.id)
        threeobj.visible = visible
    }
    isVisible() {
        const threeobj = this.manager.getThreeObject(this.id)
        return threeobj.visible
    }
}
