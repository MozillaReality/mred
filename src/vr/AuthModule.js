import {} from '../TreeItemProvider'
import {getLoginURL} from '../TreeItemProvider'
import {getInfoURL} from '../TreeItemProvider'
import {getUserURL} from '../TreeItemProvider'
import * as ToasterMananager from './ToasterManager'

export const USER_CHANGE = 'USER_CHANGE'
class AuthModuleSingleton {
    constructor() {
        this.listeners = {}
        this.supported = false
        this.doclistSupported = false
        this.docDeleteSupported = false
        this.assetUploadSupported = false
        this.scriptEditingSupported = false
        this.passwordSupported = false
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
                if(info.passwordSupported === true) {
                    this.passwordSupported = true
                }
                if(info.assetUpload === true) {
                    this.assetUploadSupported = true
                }
                if(info.scriptEditing === true)  this.scriptEditingSupported = true
                if(info.docDeleteSupported === true) this.docDeleteSupported = true


                this.getJSON(getUserURL()).then(res=>{
                    console.log("user info is",res)
                    if(!res.success) {
                        console.log("user not logged in")
                        this.logout()
                    } else {
                        this.fire(USER_CHANGE)
                        this.doclistSupported = true
                    }
                })
            })
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
        // console.log("getting",getLoginURL())
        // fetch(`${getLoginURL()}`)
        //     .then((res)=>res.json())
        //     .then((res)=>{
        this.win = window.open(res.url,'_blank')
        window.addEventListener('message',this.authCallback)
        if(this.win) this.win.focus()
            // })
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
                this.fire(USER_CHANGE)
            }
        })

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

    fetch(url, options) {
        options.mode = 'cors'
        options.cache = 'no-cache'
        if(!options.headers) options.headers = {}
        options.headers["access-key"] =  AuthModule.getAccessToken()
        console.log("fetching",url,'with options',options)
        return fetch(url,options).then(res => {
            console.log("got a response to",url)
            console.log(res)
            return res
        })
    }
    getJSON(url) {
        return this.fetch(url,{method:'GET', headers: {
                "Content-Type": "application/json",
            }
        }).then(res => res.json())
            .then(res => {
                console.log("got response to",url)
                console.log(res)
                return res
            })
    }

}

export const AuthModule = new AuthModuleSingleton()
