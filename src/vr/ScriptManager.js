export default class ScriptManager {
    constructor(provider) {
        this.prov = provider
    }
    makeScriptContext() {
        return {

        }
    }

    makeSystemFacade() {
        const prov = this.prov
        const master = this
        return {
            getCurrentScene() {
                return null
            },
            getScene(name) {
                return null
            },
            getObject(name) {
                return null
            },
            getAsset(name) {
                const obj = prov.getDataGraph().getObjectByProperty('title',name)
                const realobj = prov.accessObject(obj)
                return new AssetFacade(realobj,master)
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

        doit(ctx);
    }
}


class AssetFacade {
    constructor(obj,master) {
        this.obj = obj
        this.master = master
    }
    play() {
        this.master.playAudioAsset(this.obj,'somethign')
    }
}
