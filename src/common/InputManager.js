
export default class InputManager {
    static KEYS = {
        S:83,
        Z:90,
        C:67,
        V:86,
        X:88,
        LEFT_ARROW:37,
        RIGHT_ARROW:39,
    }
    static MODIFIERS = {
        COMMAND:'COMMAND',
        SHIFT:'SHIFT'
    }

    constructor() {
        this.bindings = []
        this.listeners = {}
    }

    addKeyBinding(binding) {
        this.bindings.push(binding)
    }
    addListener(name,cb) {
        if(!this.listeners[name]) {
            this.listeners[name] = []
        }
        this.listeners[name].push(cb)
    }

    attachKeyEvents(document) {
        document.addEventListener('keydown',this.keyDown)
    }

    keyDown = (e)=>{
        // console.log("-------------")
        // console.log("got a key press",e.shiftKey, e.metaKey, e.key, e.keyCode)
        const matches = this.bindings.filter((b)=>b.key === e.keyCode)
        // console.log("got the bindings",matches)
        const m2 = matches.filter((b)=>{
            let valid = true
            b.modifiers.forEach((mod)=>{
                if(mod === InputManager.MODIFIERS.COMMAND && !e.metaKey) {
                    // console.log("missing the meta key");
                    valid = false
                }
                if(mod === InputManager.MODIFIERS.SHIFT && !e.shiftKey) {
                    // console.log("missing the shift key");
                    valid = false
                }
            })
            if(e.shiftKey && !b.modifiers.some(mod=>mod === InputManager.MODIFIERS.SHIFT)) {
                // console.log("shift is down, but missing shift in the def")
                valid = false
            }
            // console.log("still valid",valid)
            return valid
        })
        // console.log("final list is",m2.length)
        if(m2.length > 0) {
            // console.log("something matched")
            // e.preventDefault()
            this.dispatchEvents(m2,e)
        }
    }
    dispatchEvents(matches,e) {
        matches.forEach((bind)=>{
            if(this.listeners[bind.id]) this.listeners[bind.id].forEach((cb)=>cb?cb(e):null)
        })
    }
}
