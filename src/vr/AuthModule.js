import {getAssetsURL, getInfoURL, getUserURL, genID} from 'react-visual-editor-framework'
import * as ToasterMananager from './ToasterManager'

export const USER_CHANGE = 'USER_CHANGE'
export const CONNECTED = "CONNECTED"
class AuthModuleSingleton {
    constructor() {
        this.listeners = {}
        this.supported = false
        this.doclistSupported = false
        this.docDeleteSupported = false
        this.assetUploadSupported = false
        this.scriptEditingSupported = false
        this.passwordSupported = false
        this.connected = false
        this.serverID = genID("serverid")
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
                console.info("Server Info:",info)
                if(info.authentication === true)      this.supported = true
                if(info.passwordSupported === true)   this.passwordSupported = true
                if(info.assetUpload === true)         this.assetUploadSupported = true
                if(info.scriptEditing === true)       this.scriptEditingSupported = true
                if(info.docDeleteSupported === true)  this.docDeleteSupported = true
                this.serverID = getInfoURL().replace(/[.:/]/g,"")


                this.getJSON(getUserURL()).then(res=>{
                    if(!res.success) {
                        this.logout()
                    } else {
                        this.fire(USER_CHANGE)
                        this.doclistSupported = true
                    }
                    this.connected = true
                    this.fire(CONNECTED)
                }).then(()=>{
                    this.connected = true
                    this.fire(CONNECTED)
                })
            })
    }
    isConnected() {
        return this.connected
    }

    isLoggedIn() {
        if(localStorage.getItem('access-token')) return true
        return false
    }
    supportsPassword() {
        return this.passwordSupported
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
    supportsDocDelete() {
        return this.docDeleteSupported
    }

    login = (res) => {
        this.win = window.open(res.url,'_blank')
        window.addEventListener('message',this.authCallback)
        if(this.win) this.win.focus()
    }
    logout = () => {
        localStorage.clear()
        this.doclistSupported = false
        this.fire(USER_CHANGE)
    }
    doPasswordLogin (password) {
        localStorage.setItem('access-token',password)
        return this.getJSON(getUserURL()).then(res=>{
            if(res.success === true) {
                console.log("the logged in response is", res)
                this.doclistSupported = true
                ToasterMananager.add("login succeeded")
                this.fire(USER_CHANGE)
            } else {
                ToasterMananager.add("login failed")
                localStorage.clear()
                this.doclistSupported = false
                this.fire(USER_CHANGE)
            }
        })

    }
    authCallback = (msg) => {
        this.setUserData(msg.data.payload)
        this.win.close()
        window.removeEventListener('message',this.authCallback)
        this.doclistSupported = true
        this.fire(USER_CHANGE)
        ToasterMananager.add("login succeeded")
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

    getServerID() {
        return this.serverID
    }

    fetch(url, options) {
        options.mode = 'cors'
        options.cache = 'no-cache'
        if(!options.headers) options.headers = {}
        options.headers["access-key"] =  AuthModule.getAccessToken()
        console.log("fetching",url,'with options',options)
        return fetch(url,options)
            .then(res => {
                if(res.status === 404) throw new Error(res.statusText + " " + res.url)
                return res
            })
    }
    getJSON(url) {
        return this.fetch(url,{
            method:'GET',
            headers: {
                "Content-Type": "application/json",
            }
        }).then(res => res.json())
    }

    uploadFile(file) {
        const url = getAssetsURL()+file.name
        return this.fetch(url,{
            method:'POST',
            body:file
        }).then(res => res.json())
    }

}

export const AuthModule = new AuthModuleSingleton()
