import {setQuery, toQueryString} from './utils'
import Selection from './SelectionManager'
import {AuthModule} from './vr/AuthModule'

export const TREE_ITEM_PROVIDER = {
    EXPANDED_CHANGED:'EXPANDED_CHANGED',
    STRUCTURE_CHANGED:'STRUCTURE_CHANGED',
    STRUCTURE_ADDED:'STRUCTURE_ADDED',
    STRUCTURE_REMOVED:'STRUCTURE_REMOVED',
    PROPERTY_CHANGED:'PROPERTY_CHANGED',
    CLEAR_DIRTY:'CLEAR_DIRTY',
    SAVED:'SAVED',
    DOCUMENT_SWAPPED:'DOCUMENT_SWAPPED',
}

const URLS = {
    BASE:'https://vr.josh.earth/generaled/api/'
    // BASE:'https://buttered-elk.glitch.me/'
    // BASE:'http://localhost:1234/'
}
export function getDocsURL() {
    return URLS.BASE + 'doc/'
}
export function getAssetsURL() {
    return URLS.BASE + 'asset/'
}
export function getScriptsURL() {
    return URLS.BASE + 'scripts/'
}
export function getLoginURL() {
    return URLS.BASE + 'auth/github/login'
}
export function getInfoURL() {
    return URLS.BASE +'info'
}
export function getUserURL() {
    return URLS.BASE + 'userinfo'
}

// export const SERVER_URL = "http://localhost:30065/doc/"
// export const SERVER_URL_ASSETS = "http://localhost:30065/asset/"
// export const SERVER_URL = "http://localhost:55555/doc/"
// export const SERVER_URL = "https://vr.josh.earth/generaled/api/doc/"
// export const BASE_URL = "http://localhost:55555/"
// export const BASE_URL = "https://vr.josh.earth:55555/"
// export const SERVER_URL_ASSETS = "http://localhost:55555/asset/"
// export const SERVER_URL_ASSETS = "https://vr.josh.earth/generaled/api/asset/"
// export const SERVER_URL_ASSETS = "http://josh.earth:30068/asset/"
// export const LOGIN_URL = "http://localhost:55555/auth/github/login"
// export const LOGIN_URL = "https://vr.josh.earth/generaled/api/auth/github/login"

class TreeItemProviderInterface {
    /** register a listener */
    on(type, cb) {
        throw new Error(`interface 'on' not implemented`)
    }

    /** un-register a listener */
    off(type, cb) {
        throw  new Error("interface 'off' not implemented")
    }

    /** fire an event. internal use */
    fire(type, value) {
        throw  new Error("interface 'fire' not implemented")
    }

    // ============== tree interface
    /** returns the root of the tree structure */
    getSceneRoot() {
        throw new Error("interface 'getSceneRoot' not implemented")
    }
    /** delete child node */
    deleteChild(child) { throw new Error("deleteChild not implemented yet")}
    /** append child to the parent */
    appendChild(parent,child) { throw new Error("appendChild not implemented yet")}
    /** insert child node before a particular other node */
    insertNodeBefore(node,sibling) { throw new Error("insertNodeBefore() not implemented yet")}
    /** find a given node by ID */
    findNodeById(id) { throw new Error("findNodeById() not implemented yet")}
    /** find the parent of the given node */
    findParent(node) { throw new Error("findParent() not implemented yet")}
    /** return true if the given node has children */
    hasChildren(node) { throw new Error("hasChildren() not implemented yet")}
    /** returns an array of children for the parent node */
    getChildren(node) { throw new Error("getChildren() not implemented yet")}

    // ========= Tree View support =========

    /** returns true if item is expanded */
    isExpanded(item) {
        throw  new Error("interface 'isExpanded' not implemented")
    }

    /** return a react component for the context menu of the item in the tree view */
    calculateContextMenu(item) {
        throw new Error("calculateContextMenu() not implemented yet")
    }
    /** toggles the collapsed state of the item */
    toggleItemCollapsed(item) {
        throw new Error("toggleItemCollapsed() not implemented yet")
    }
    /** returns a react component to display the item in the tree view */
    getRendererForItem(item) {
        throw new Error("getRendererForItem() not implemented yet")
    }



    // ================ properties ==================
    /** set the property value using a prop def */
    setPropertyValue(item, def, value) {
        throw new Error("interface setPropertyValue not implemented")
    }
    setPropertyValueByName(child,name,value) { throw new Error(`interface 'setPropertyValueByName() not implemented'`)}
    /** return an array of property definitions for the specified tree item */
    getProperties(item) { throw new Error(`interface 'getProperties()' not implemented`) }


    // ================ doc def stuff
    getDocId() {  throw new Error("getDocId() not implemented")  }
    getDocType() {  throw new Error("getDocType() not implemented")  }
    getApp() { throw new Error("getApp() not implemented")  }
    getTitle() { throw new Error("getTitle() not implemented") }
}

const AUTO_DETECT_GLITCH = true
function calculateServerUrl(SERVER_URL) {
    if(SERVER_URL) {
        return `https://${SERVER_URL}/`
    }

    if(AUTO_DETECT_GLITCH) {
        console.log("no server url, checking the document")
        const host = document.location.host
        if (host.endsWith(".glitch.me")) {
            console.log("this is a glitch. using autodetected server")
            return host
        }
    }
    return URLS.BASE
}

export default class TreeItemProvider extends TreeItemProviderInterface {
    constructor(options) {
        super()
        this.listeners = {};
        this.expanded_map = {};
        this.docid = null
        URLS.BASE = calculateServerUrl(options.SERVER_URL)
        console.log("using server",URLS.BASE)
        AuthModule.init()
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
    toggleItemCollapsed(item) {
        const current = this.isExpanded(item);
        this.expanded_map[item.id] = !current;
        this.fire(TREE_ITEM_PROVIDER.EXPANDED_CHANGED,item);
    }


    setPropertyValue(item, def, value) {
        throw new Error("subclass of TreeItemProvider must implement setPropertyValue")
    }

    genID = (prefix) => {
        return `${prefix}_${Math.floor(Math.random() * 1000*1000*1000)}`
    }

    setDocument(doc, docid) {
        this.root = doc
        this.docid = docid
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, {
            provider:this
        });
    }

    getDocId() {
        return this.docid
    }

    save = () => {
        console.info("saving",this.getSceneRoot())
        const payload_obj = {
            doc:this.getSceneRoot(),
            type:this.getDocType(),
            id:this.getDocId()
        }
        const payload_string = JSON.stringify(payload_obj,(key,value)=>{
            if(key === 'parent') return undefined
            return value
        })
        console.info("doc is",payload_string)
        return AuthModule.fetch(getDocsURL()+this.docid, {
            method:'POST',
            body: payload_string,
            headers: {
                "Content-Type": "application/json"
            },
        })
            .then(res => res.json())
            .then((res)=>{
            console.log("Success result is",res)
            setQuery({mode:'edit',doc:this.docid, doctype:this.getDocType()})
            this.fire(TREE_ITEM_PROVIDER.SAVED,true)
        }).catch((e)=> console.log("error",e))
    }
    loadDoc(docid) {
        console.log("need to load the doc",docid)
        AuthModule.getJSON(getDocsURL()+docid).then((payload)=>{
            console.log("got the doc",payload)
            if(payload.type !== this.getDocType()) throw new Error("incorrect doctype for this provider",payload.type)
            this.setDocument(payload.doc,payload.id)
        }).catch((e)=>{
            console.warn("missing doc",e)
            this.setDocument(this.makeEmptyRoot(),this.genID('doc'))
            setQuery({mode:'edit',doc:this.docid, doctype:this.getDocType()})
        })
    }
    reloadDocument() {
        const spath = this.generateSelectionPath(Selection.getSelection());
        console.log("got the path",spath)
        AuthModule.getJSON(getDocsURL()+this.docid).then((payload)=>{
            if(payload.type !== this.getDocType()) throw new Error("incorrect doctype for this provider",payload.type)
            this.setDocument(payload.doc,payload.id)
            this.fire(TREE_ITEM_PROVIDER.CLEAR_DIRTY,true)
            const newsel = this.findNodeFromSelectionPath(this.getSceneRoot(),spath)
            console.log("set new selection to ", newsel)
            Selection.setSelection(newsel)
        }).catch((e)=>{
            console.warn("couldn't reload the doc",e)
        })

    }

    /* required functions for subclasses */

    generateSelectionPath() {
        throw new Error("generateSelectionPath not implemented")
    }
    findNodeFromSelectionPath() {
        throw new Error("findNodeFromSelectionPath not implemented")
    }
    makeEmptyRoot() {
        throw new Error("makeEmptyRoot() not implemented")
    }

    getSceneRoot() {
        return this.root;
    }

    uploadFile(file) {
        return new Promise((res,rej)=>{
            const fd = new FormData()
            fd.append('file',file)
            console.info("filesize is",file.size, file.name);
            const xml = new XMLHttpRequest()
            xml.onreadystatechange = () => console.log(`ready state = ${xml.readyState} status ${xml.status}`)
            xml.addEventListener('progress',(e)=>console.log(`progress`))
            xml.addEventListener('load',(e)=> res(xml.response))
            xml.addEventListener('error',(e)=>console.log(`error`))
            xml.addEventListener('abort',(e)=>console.log(`abort`))
            const url = getAssetsURL()+file.name;
            console.info("uploading to ", url)
            xml.responseType = 'json'
            xml.open('POST',url)
            xml.setRequestHeader('access-key',AuthModule.getAccessToken())
            xml.send(file)
        })
    }


    hasChildren = (item) => item && item.children && item.children.length
    getChildren = (item) => item.children

}
