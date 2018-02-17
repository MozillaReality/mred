import PubNub from 'pubnub'
import {GET_JSON, POST_JSON, setQuery} from './utils'
import Selection from './SelectionManager'

export const TREE_ITEM_PROVIDER = {
    EXPANDED_CHANGED:'EXPANDED_CHANGED',
    STRUCTURE_CHANGED:'STRUCTURE_CHANGED',
    STRUCTURE_ADDED:'STRUCTURE_ADDED',
    STRUCTURE_REMOVED:'STRUCTURE_REMOVED',
    PROPERTY_CHANGED:'PROPERTY_CHANGED',
    CLEAR_DIRTY:'CLEAR_DIRTY',
    SAVED:'SAVED'
}

// export const SERVER_URL = "http://localhost:30065/doc/"
// export const SERVER_URL_ASSETS = "http://localhost:30065/asset/"
export const SERVER_URL = "http://josh.earth:30068/doc/"
export const SERVER_URL_ASSETS = "http://josh.earth:30068/asset/"


export default class TreeItemProvider {
    constructor() {
        console.log('created a tree item Provider')
        this.listeners = {};
        this.expanded_map = {};
        this.docid = null
        this.pubnub = new PubNub({
            // publishKey:"pub-c-1cba58da-c59a-4b8b-b756-09e9b33b1edd",
            subscribeKey:"sub-c-39263f3a-f6fb-11e7-847e-5ef6eb1f4733"
        })
        this.pubnub.addListener({
            status: (status)=> console.log(status),
            message: (msg) => {
                console.log(msg)
                if(msg.channel === this.docid) {
                    console.log("got a message for my doc. reloading")
                    this.reloadDocument()
                }
            }
        })
    }

    on(type, cb) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(cb);
    }

    fire(type, value) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].forEach((cb) => cb(value));
    }

    off(type, cb) {
        if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter(list => list !== cb)
    }

    isExpanded(item) {
        if (!item.id) item.id = "" + Math.random();
        if (typeof this.expanded_map[item.id] === 'undefined') this.expanded_map[item.id] = true;
        return this.expanded_map[item.id];
    }

    setPropertyValue(item, def, value) {
        throw new Error("subclass of TreeItemProvider must implement setPropertyValue")
    }

    getTreeActions() {
        return []
    }

    getTools = () => []

    genID = (prefix) => {
        return `${prefix}_${Math.floor(Math.random() * 10000)}`
    }

    setDocument(doc, docid) {
        this.root = doc
        this.docid = docid
        this.pubnub.subscribe({channels: [docid]})
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, {
            provider:this
        });
    }

    getDocId() {
        return this.docid
    }

    save = () => {
        console.log("saving")
        const payload_obj = {
            doc:this.getSceneRoot(),
            type:this.getDocType(),
            id:this.getDocId()
        }
        const payload_string = JSON.stringify(payload_obj,(key,value)=>{
            if(key === 'parent') return undefined
            return value
        })
        console.log("doc is",payload_string)
        return POST_JSON(SERVER_URL+this.docid,payload_string).then((res)=>{
            console.log("Success result is",res)
            setQuery({mode:'edit',doc:this.docid, doctype:this.getDocType()})
            this.fire(TREE_ITEM_PROVIDER.SAVED,true)
        }).catch((e)=> console.log("error",e))
    }
    loadDoc(docid) {
        console.log("need to load the doc",docid)
        GET_JSON(SERVER_URL+docid).then((payload)=>{
            console.log("got the doc",payload)
            if(payload.type !== this.getDocType()) throw new Error("incorrect doctype for this provider",payload.type)
            this.setDocument(payload.doc,payload.id)
        }).catch((e)=>{
            console.log("missing doc",e)
            this.setDocument(this.makeEmptyRoot(),this.genID('doc'))
            setQuery({mode:'edit',doc:this.docid, doctype:this.getDocType()})
        })
    }
    reloadDocument() {
        const spath = this.generateSelectionPath(Selection.getSelection());
        console.log("got the path",spath)
        GET_JSON(SERVER_URL+this.docid).then((payload)=>{
            if(payload.type !== this.getDocType()) throw new Error("incorrect doctype for this provider",payload.type)
            this.setDocument(payload.doc,payload.id)
            this.fire(TREE_ITEM_PROVIDER.CLEAR_DIRTY,true)
            const newsel = this.findNodeFromSelectionPath(this.getSceneRoot(),spath)
            console.log("set new selection to ", newsel)
            Selection.setSelection(newsel)
        }).catch((e)=>{
            console.log("couldn't reload the doc",e)
        })

    }

    /* required functions for subclasses */

    generateSelectionPath() {
        throw new Error("generateSelectionPath not implemented")
    }
    findNodeFromSelectionPath() {
        throw new Error("findNodeFromSelectionPath not implemented")
    }
    getSceneRoot() {
        return this.root;
    }
    getDocType() {
        throw new Error("getDocType() not implemented")
    }
    makeEmptyRoot() {
        throw new Error("makeEmptyRoot() not implemented")
    }
    getApp() { throw new Error("getApp() not implemented") }
    getTitle() { throw new Error("getTitle() not implemented") }
    getDocType() { throw new Error("getDocType() not implemented") }

    getSceneRoot() {
        return this.root;
    }
    // getSceneRoot() { throw new Error("getSceneRoot() not implemented") }

    deleteChild() { throw new Error("deleteChild not implemented yet")}
    findParent() { throw new Error("findParent() not implemented yet")}
    findNodeById() { throw new Error("findNodeById() not implemented yet")}
    insertNodeBefore() { throw new Error("insertNodeBefore() not implemented yet")}
    uploadFile(file) {
        return new Promise((res,rej)=>{
            const fd = new FormData()
            fd.append('file',file)
            console.log("filesize is",file.size);
            const xml = new XMLHttpRequest()
            xml.onreadystatechange = () => console.log(`ready state = ${xml.readyState} status ${xml.status}`)
            xml.addEventListener('progress',(e)=>console.log(`progress`))
            xml.addEventListener('load',(e)=>res(xml.response))
            xml.addEventListener('error',(e)=>console.log(`error`))
            xml.addEventListener('abort',(e)=>console.log(`abort`))
            const url = SERVER_URL_ASSETS+file.name;
            console.log("uploading to ", url)
            xml.responseType = 'json'
            xml.open('POST',url)
            xml.send(file)
        })
    }



}
