import TreeItemProvider, {getDocsURL, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {setQuery, toQueryString} from '../utils'
import {UndoQueue} from './UndoQueue'
import {EventCoalescer} from '../metadoc/EventCoalescer'
import SelectionManager from '../SelectionManager'
import {PubnubSyncWrapper} from './PubnubSyncWrapper'
import {propToArray} from "./utils";
import * as ToasterMananager from '../vr/ToasterManager'
import {DialogManager} from 'appy-comps'
import {MissingDocDialog} from './MissingDocDialog'
import React from 'react'
import {AuthModule} from '../vr/AuthModule'

const {DocGraph, CommandGenerator} = require("syncing_protocol");


function DocGraphToObjectGraph(doc, id) {
    const props = doc.getPropertiesForObject(id)
    const obj = {}
    props.forEach(name => {
        obj[name] = doc.getPropertyValue(id,name)
        if(name === 'children') {
            obj.children = propToArray(doc,obj[name]).map(child => {
                return DocGraphToObjectGraph(doc,child)
            })
        }
    })
    obj.id = id
    return obj
}


export default class SyncGraphProvider extends TreeItemProvider {
    constructor(options) {
        super(options)
        this.options = options || {}
        this.mode = options.mode || 'edit'
        this.datalisteners = []
        this.rawlisteners = []
        this.expanded = {}

        if(options.doc) this.loadDoc(options.doc)
    }
    getDocTitle = () => "untitled"
    getDocHistory = () => this.getDataGraph().getHistory()
    getDocGraph = () => {
        const root = this.getDataGraph().getObjectByProperty('type','root')
        return DocGraphToObjectGraph(this.getDataGraph(),root)
    }
    onRawChange = cb => this.rawlisteners.push(cb)
    getRawGraph = () => this.coalescer
    getDataGraph = () => this.syncdoc
    getSceneRoot = () => this.getDataGraph().getObjectByProperty('type','root')
    hasChildren = (item) => item && this.getDataGraph().hasPropertyValue(item,'children')
    getChildren = (item) => {
        const doc = this.getDataGraph()
        return propToArray(doc,doc.getPropertyValue(item,'children'))
    }
    isExpanded = (item) => {
        if (typeof this.expanded[item] === 'undefined') this.expanded[item] = true;
        return this.expanded[item]
    }
    toggleItemCollapsed(item) {
        const current = this.isExpanded(item);
        this.expanded[item] = !current;
        this.fire(TREE_ITEM_PROVIDER.EXPANDED_CHANGED,item);
    }

    setPropertyValue(item, def, value) {
        const op = this.cmd.setProperty(item,def.key,value)
        op.prevValue = def.value
        this.getRawGraph().process(op)
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,{
            provider: this,
            child:item,
            propKey:def.key,
            oldValue:def.value,
            newValue:value
        })
    }

    save = (e) => {
        if(e) e.preventDefault()
        const payload_obj = {
            history:this.getDocHistory(),
            type:this.getDocType(),
            id:this.getDocId(),
            graph:this.getDocGraph(),
            title:this.getDocTitle(),
        }
        const payload_string = JSON.stringify(payload_obj)
        ToasterMananager.add('saving')
        const opts = {
            type:this.getDocType(),
            title:this.getDocTitle(),
        }
        const url = getDocsURL()+this.getDocId()+'?'+toQueryString(opts)
        console.log(`saving ${payload_string.length} chars to ${url}`, payload_obj)
        return AuthModule.fetch(url,{
            method:'POST',
            body:payload_string,
            headers: {
                "Content-Type": "application/json"
            },
        })
            .then(res=>res.json())
            .then(res => {
                console.log("got back result",res)
                setQuery({mode:this.mode,doc:this.getDocId(), doctype:this.getDocType()})
                ToasterMananager.add(res.message)
                this.fire(TREE_ITEM_PROVIDER.SAVED,true)
            }).catch((e)=> console.log("error",e))
    }

    loadDoc(docid) {
        return AuthModule.getJSON(getDocsURL()+docid)
            .then((payload)=>{
                console.log("got the payload",payload)
                if(!payload.id) return this.showMissingDocDialog(docid)
                const doc = this.makeDocFromServerHistory(payload.history)
                this.setupDocFlow(doc,docid)
            })
            .catch((e)=> {
                console.error("there was an error loading doc",docid,e)
                const doc = new DocGraph()
                this.makeEmptyRoot(doc)
                this.setupDocFlow(doc,this.genID('doc'))
            })
    }

    createNewDocument(docid) {
        const doc = new DocGraph()
        this.makeEmptyRoot(doc)
        this.setupDocFlow(doc,docid)
    }

    setupDocFlow(doc,docid) {
        //shut down old network connection
        if(this.pubnub) this.pubnub.shutdown()
        this.pubnub = null

        this.syncdoc = doc
        this.cmd = new CommandGenerator(this.syncdoc)
        this.root = this.getSceneRoot()
        this.docid = docid
        this.undoqueue = new UndoQueue(doc)
        this.coalescer = new EventCoalescer(this.syncdoc) //sends calls on to sync doc, and fires change event
        this.coalescer.onChange((op) => this.undoqueue.submit(op))

        this.coalescer.onRawChange(op =>this.rawlisteners.forEach(cb => cb(op)))
        this.syncdoc.onChange(op => this.rawlisteners.forEach(cb => cb(op)))
        this.syncdoc.onChange((op)=>{
            this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, { provider:this });
            this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, { provider:this });
        })
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, { provider:this });
        this.fire(TREE_ITEM_PROVIDER.CLEAR_DIRTY,true)
        SelectionManager.clearSelection()
        this.pubnub = new PubnubSyncWrapper(this,this.syncdoc)
        this.pubnub.unpause()
        this.pubnub.start()
        this.docLoaded().then(()=>{
            this.fire(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED,{provider:this})
            setQuery({mode:this.mode,doc:this.getDocId(), doctype:this.getDocType()})
            this.connected = true
            this.fire("CONNECTED",this.connected)
        })
    }

    reloadDocument() {
        return AuthModule.getJSON(getDocsURL()+this.docid).then((payload)=>{
            if(payload.type !== this.getDocType()) throw new Error("incorrect doctype for this provider",payload.type)
            const doc = this.makeDocFromServerHistory(payload.history)
            this.setupDocFlow(doc,this.docid)
        }).catch((e)=>{
            console.error("couldn't reload the doc",e)
            const doc = new DocGraph()
            this.makeEmptyRoot(doc)
            this.setupDocFlow(doc,this.genID('doc'))
        })

    }

    docLoaded = () => {
        return Promise.resolve()
    }

    toggleConnected = () => {
        this.connected = !this.connected
        if(this.pubnub) {
            if(this.connected) {
                this.pubnub.unpause()
            } else {
                this.pubnub.pause()
            }
        }
        this.fire("CONNECTED",this.connected)
    }

    isConnected = () => this.connected

    pauseQueue = () => this.coalescer.pause()
    unpauseQueue = () => this.coalescer.unpause()

    performUndo = (e) => {
        if(e && e.preventDefault) e.preventDefault()

        if(this.undoqueue.canUndo()) {
            this.undoqueue.undo()
        } else {
            console.warn("at beginnning of the undo queue")
        }
    }
    performRedo = (e) => {
        if(e && e.preventDefault) e.preventDefault()
        if(this.undoqueue.canRedo()) this.undoqueue.redo()
    }

    makeDocFromServerHistory(history) {
        const doc = new DocGraph()
        history.forEach(op => doc.process(op))
        return doc
    }


    showMissingDocDialog(docid) {
        DialogManager.show(<MissingDocDialog docid={docid} provider={this}/>)
    }
}
