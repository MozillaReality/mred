import {} from '../TreeItemProvider'
import {getLoginURL} from '../TreeItemProvider'
import {getInfoURL} from '../TreeItemProvider'

export const USER_CHANGE = 'USER_CHANGE'
class AuthModuleSingleton {
    constructor() {
        this.listeners = {}
        this.supported = false
        this.doclistSupported = false
        this.assetUploadSupported = false
        this.scriptEditingSupported = false
    }
    on(type,cb) {
        if(!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(cb)
    }
    fire(type,payload) {
        if(!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].forEach(cb => cb(payload))
    }

    init() {
        if(this.isLoggedIn()) this.doclistSupported = true
        fetch(getInfoURL()).then(res => res.json())
            .then(info => {
                console.log("got the info",info)
                if(info.authentication === true) {
                    this.supported = true
                }
                if(info.assetUpload === true) {
                    this.assetUploadSupported = true
                }
                if(info.scriptEditing === true)  this.scriptEditingSupported = true

                this.fire(USER_CHANGE)
            })
    }

    isLoggedIn() {
        if(localStorage.getItem('access-token')) return true
        return false
    }
    supportsAuth() {
        return this.supported
    }
    supportsDocList() {
        return this.doclistSupported
    }
    supportsAssetUpload() {
        return this.assetUploadSupported
    }
    supportsScriptEdit() {
        return this.scriptEditingSupported
    }

    login = () => {
        console.log("getting",getLoginURL())
        fetch(`${getLoginURL()}`)
            .then((res)=>res.json())
            .then((res)=>{
                this.win = window.open(res.url,'_blank')
                window.addEventListener('message',this.authCallback)
                this.win.focus()
            })
    }
    logout = () => {
        localStorage.clear()
        this.doclistSupported = false
        this.fire(USER_CHANGE)
    }
    authCallback = (msg) => {
        console.log("got an event from the external window",msg)
        console.log("origin = ", msg.origin)
        if(!msg.origin === 'http://localhost:39176') {
            console.log("message is not from the expected origin. what do we do?")
        }
        console.log("data is",msg.data.payload)
        console.log("hello user", msg.data.payload.id)
        console.log("your access token is",msg.data.payload.accessToken)
        this.setUserData(msg.data.payload)
        //close the window
        this.win.close()
        window.removeEventListener('message',this.authCallback)
        this.doclistSupported = true
        this.fire(USER_CHANGE)
    }
    setUserData(data) {
        localStorage.setItem('access-token',data.accessToken)
    }
    getAccessToken() {
        return localStorage.getItem('access-token')
    }

    getUsername() {
        return this.getAccessToken()
    }


}

export const AuthModule = new AuthModuleSingleton()
