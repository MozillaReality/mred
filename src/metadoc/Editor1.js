import React, {Component} from 'react'
import TreeItemProvider, {SERVER_URL, TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import PropSheet from '../PropSheet'
import TreeTable from '../TreeTable'
import SelectionManager from '../SelectionManager'
import {GET_JSON, POST_JSON, setQuery} from '../utils'
import {MetadocCanvas} from "./MetadocCanvas";
import {UndoQueue} from "./UndoQueue";
import {EventCoalescer} from "./EventCoalescer";
import {PubnubSyncWrapper} from "./PubnubSyncWrapper";

const {DocGraph, CommandGenerator} = require("syncing_protocol");

function short(op) {
    let str = op.type + ' '
    if(op.name) {
        str += op.name + "=" + op.value + " prev = " + op.prevValue
    }
    return str
}



export default class MetadocEditor extends  TreeItemProvider {
    constructor() {
        super()
        this.datalisteners = []
        this.rawlisteners = []

        const doc = new DocGraph()
        this.makeEmptyRoot(doc)
        this.setupDocFlow(doc,this.genID('doc'))
    }
    onRawChange = cb => this.rawlisteners.push(cb)

    getRawGraph = () => this.coalescer
    getDataGraph = () => this.syncdoc

    getSceneRoot() {
        return this.root
    }

    setDocGraph(graph,docid) {
        if(!docid) docid = this.genID('doc')
        if(this.syncdoc) {
            this.graphListeners.forEach(cb => this.syncdoc.offChange(cb))
        }
        this.syncdoc = graph
        this.docid = docid
        if(this.syncdoc) {
            this.graphListeners.forEach(cb => this.syncdoc.onChange(cb))
        }
    }

    makeEmptyRoot(syncdoc) {
        const CH = syncdoc.createArray()
        const root = syncdoc.createObject()
        syncdoc.createProperty(root,'type','root')
        syncdoc.createProperty(root,'title','root')
        syncdoc.createProperty(root,'children',CH)


        const d = syncdoc
        const rect1 = syncdoc.createObject()
        d.createProperty(rect1,'title','first rect')
        d.createProperty(rect1,'x',100)
        d.createProperty(rect1,'y',100)
        d.createProperty(rect1,'width',100)
        d.createProperty(rect1,'height',100)
        syncdoc.insertElement(CH,0,rect1)
    }

    getRootList() {
        if (this.getDataGraph().hasPropertyValue(this.root, 'children')) {
            return this.getDataGraph().getPropertyValue(this.root, 'children')
        } else {
            return null
        }
    }

    getDocType = () => "metadoc"
    getApp = () => <MetadocApp provider={this}/>
    getTitle = () => "MetaDoc"

    getRendererForItem = (item) => {
        if(!this.getDataGraph().getObjectById(item)) return <div>???</div>
        const title = this.getDataGraph().getPropertyValue(item,'title')
        return <div>{title}</div>
    }

    isExpanded = (item) => true

    hasChildren = (item) => item && this.getDataGraph().hasPropertyValue(item,'children')
    getChildren = (item) => {
        const CH = this.getDataGraph().getPropertyValue(item,'children')
        const len = this.getDataGraph().getArrayLength(CH)
        const ch = []
        for(let i=0; i<len; i++) {
            ch.push(this.getDataGraph().getElementAt(CH,i))
        }
        return ch
    }

    getProperties(item) {

        const PROP_DEFS = {
            title: {
                key:'title',
                name:'Title',
                type:'string'
            },
            x: {
                key:'x',
                name:'X',
                type:'number',
            },
            y: {
                key:'y',
                name:'Y',
                type:'number',
            },
            width: {
                key:'width',
                name:'Width',
                type:'number',
            },
            height: {
                key:'height',
                name:'Height',
                type:'number',
            },
        }

        function copyPropDef(def,value) {
            const out = {};
            Object.keys(def).forEach((key) => out[key] = def[key])
            out.value = value
            return out;
        }
        let defs = []
        if(!item) return defs

        const props = this.syncdoc.getPropertiesForObject(item)
        if(props) {
            props.forEach(key => {
                if(key === 'type') return
                if(key === 'children') return
                const value = this.syncdoc.getPropertyValue(item,key)
                if(PROP_DEFS[key]) return defs.push(copyPropDef(PROP_DEFS[key],value))
                console.log("unknown property",key)
            })
        }

        return defs
    }

    setPropertyValue(item, def, value) {
        console.log('setting',item,def,value)
        this.syncdoc.setProperty(item,def.key,value)
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,{
            provider: this,
            child:item,
            propKey:def.key,
            oldValue:def.value,
            newValue:value
        })
    }

    getDocHistory() {
        return this.syncdoc.getHistory()
    }

    save = () => {
        const payload_obj = {
            history:this.getDocHistory(),
            type:this.getDocType(),
            id:this.getDocId()
        }
        console.log("doing a save",payload_obj)
        const payload_string = JSON.stringify(payload_obj)
        return POST_JSON(SERVER_URL+this.getDocId(),payload_string).then((res)=>{
            console.log("Success result is",res)
            setQuery({mode:'edit',doc:this.getDocId(), doctype:this.getDocType()})
            this.fire(TREE_ITEM_PROVIDER.SAVED,true)
        }).catch((e)=> console.log("error",e))
    }

    loadDoc(docid) {
        GET_JSON(SERVER_URL+docid).then((payload)=>{
            console.log("got the payload",payload)
            const doc = this.makeDocFromServerHistory(payload.history)
            this.setupDocFlow(doc,docid)
        }).catch((e)=>{
            console.log("missing doc. create a new doc",e)
            const doc = new DocGraph()
            this.makeEmptyRoot(doc)
            this.setupDocFlow(doc,this.genID('doc'))
        })
    }

    setupDocFlow(doc,docid) {
        if(this.pubnub) this.pubnub.shutdown()
        this.pubnub = null


        this.syncdoc = doc
        this.cmd = new CommandGenerator(this.syncdoc)
        this.root = this.syncdoc.getObjectByProperty('type','root')
        this.docid = docid
        this.undoqueue = new UndoQueue(doc)
        this.coalescer = new EventCoalescer(this.syncdoc) //sends calls on to sync doc, and fires change event
        this.coalescer.onChange((op) => {
            this.undoqueue.submit(op)
        })
        this.coalescer.onRawChange(op => {
            this.rawlisteners.forEach(cb => cb(op))
        })
        this.syncdoc.onChange(op => {
            this.rawlisteners.forEach(cb => cb(op))
        })
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
        this.connected = true
        this.fire("CONNECTED",this.connected)

        setQuery({mode:'edit',doc:this.getDocId(), doctype:this.getDocType()})

    }

    reloadDocument() {
        GET_JSON(SERVER_URL+this.docid).then((payload)=>{
            if(payload.type !== this.getDocType()) throw new Error("incorrect doctype for this provider",payload.type)
            console.log("got the payload",payload)
            const doc = this.makeDocFromServerHistory(payload.history)
            this.setupDocFlow(doc,this.docid)
        }).catch((e)=>{
            console.log("couldn't reload the doc",e)
        })

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

    pauseQueue() {
        this.coalescer.pause()
    }
    unpauseQueue() {
        this.coalescer.unpause()
    }

    performUndo = () => {
        if(this.undoqueue.canUndo()) this.undoqueue.undo()
    }
    performRedo = () => {
        if(this.undoqueue.canRedo()) this.undoqueue.redo()
    }

    makeDocFromServerHistory(history) {
        const doc = new DocGraph()
        console.log(history)

        history.forEach(op => {
            console.log("loading",short(op))
            doc.process(op)
        })

        return doc
    }
}


class MetadocApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            connected:false
        }
    }

    componentDidMount() {
        this.props.provider.on('CONNECTED',()=>{
            console.log("connection status",this.props.provider.isConnected())
            this.setState({connected: this.props.provider.isConnected()})
        })
    }


    canvasSelected = (rect) => {
        SelectionManager.setSelection(rect)
    }

    addBlock = () => {
        const graph = this.props.provider.getDataGraph()
        const rect1 = graph.createObject()
        graph.createProperty(rect1,'title','first rect')
        graph.createProperty(rect1,'x',100)
        graph.createProperty(rect1,'y',100)
        graph.createProperty(rect1,'width',100)
        graph.createProperty(rect1,'height',100)
        graph.insertElement(this.props.provider.getRootList(),0,rect1)
    }

    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle>
                <TreeTable root={prov.getSceneRoot()} provider={prov}/>
            </Panel>

            <Toolbar left bottom>
                <button onClick={this.addBlock}>add</button>
            </Toolbar>


            <Toolbar center top>
                <button className="fa fa-save" onClick={prov.save}/>
                <button onClick={prov.toggleConnected}>{this.state.connected?"disconnect":"connect"}</button>
                <button onClick={prov.performUndo}>undo</button>
                <button onClick={prov.performRedo}>redo</button>
            </Toolbar>


            <Panel center middle scroll>
                <MetadocCanvas
                    prov={prov}
                    onSelect={this.canvasSelected}
                />
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>


            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }
}


