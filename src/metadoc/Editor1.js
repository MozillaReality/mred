import React, {Component} from 'react'
import PubNub from "pubnub"
import TreeItemProvider, {SERVER_URL, TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import PropSheet from '../PropSheet'
import TreeTable from '../TreeTable'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import {GET_JSON, POST_JSON, setQuery} from '../utils'

const {DocGraph, SET_PROPERTY} = require("syncing_protocol");

class PubnubSyncWrapper {
    constructor(provider) {
        this.paused = false
        this.buffer = []
        this.provider = provider
        this.provider.onGraphChange(this.handleGraphChange)

        const settings = {
            publishKey:'pub-c-1cba58da-c59a-4b8b-b756-09e9b33b1edd',
            subscribeKey:'sub-c-39263f3a-f6fb-11e7-847e-5ef6eb1f4733',
        }

        this.pubnub = new PubNub(settings)
    }
    calculateChannelName() {
        return "metadoc-docupdate-"+this.provider.getDocId()
    }
    start() {
        this.pubnub.addListener({
            status:(e) => {
                console.log(e)
                if(e.operation === 'PNSubscribeOperation' && e.category === 'PNConnectedCategory') {
                    this.sendHistoryRequest()
                }
            },
            message:this.handleMessage,
        })

        this.pubnub.subscribe({channels:[this.calculateChannelName()]})
    }
    pause() {
        this.paused = true
    }
    unpause() {
        this.paused = false
        console.log("we need to send the waiting messages", this.buffer)
        this.buffer.forEach(op => this.sendMessage(op))
        this.buffer = []
        //now request history from the network for anything we missed
        this.sendHistoryRequest()
    }
    shutdown() {
        this.pubnub.unsubscribe({channels:[this.calculateChannelName()]})
        this.pubnub.stop()
    }

    sendMessage(e) {
        console.log("PN_SEND:",e)
        this.pubnub.publish({
            channel:this.calculateChannelName(),
            message:e
        },(status,response)=>{
            // console.log("published",status,response)
        })

    }
    handleGraphChange = (e) => {
        console.log("graph changed",e)
        const host = this.provider.getGraph().getHostId()
        if(e.host !== host) return
        if(this.paused) return this.buffer.push(e)
        this.sendMessage(e)
    }

    sendHistoryRequest() {
        console.log("sending a history request")
        this.pubnub.publish({
            channel:this.calculateChannelName(),
            message: {
                type:'GET_HISTORY',
                host: this.provider.getGraph().getHostId()
            }
        })
    }

    handleGetHistory() {
        console.log("need to send out the history")
        const graph = this.provider.getGraph()
        const hist = graph.getHistory().slice()
        console.log(hist)
        const chunkSize = 30
        let count = 0
        while(hist.length > 0) {
            if(count>100){
                console.log("breaking out. possible infinite loop")
                break
            }
            count++
            const chunk = hist.splice(0,chunkSize)
            console.log("sending",chunk.length,chunk)
            this.pubnub.publish({
                channel:this.calculateChannelName(),
                message: {
                    type:'SEND_HISTORY',
                    host: graph.getHostId(),
                    history: chunk
                }
            },(status,response)=>{
                console.log("published",status,response)
            })
        }

    }

    handleReceiveHistory(msg) {
        console.log("got some history",msg.history.length)
        msg.history.forEach(op=>this.provider.getGraph().process(op))
    }



    handleMessage = (evt) => {
        if(this.paused) return
        const graph = this.provider.getGraph()
        // console.log('PN_REMOTE',evt)
        if(evt.message.type === 'GET_HISTORY') {
            // console.log("got a history request",evt.message.host, graph.getHostId())
            if(evt.message.host !== graph.getHostId()) {
                return this.handleGetHistory()
            }
            return
        }
        if(evt.message.type === 'SEND_HISTORY') {
            if(evt.message.host !== graph.getHostId()) {
                return this.handleReceiveHistory(evt.message)
            }
            return
        }
        const op = evt.message
        if(!op.host) return console.log("received a message without a host",op)
        if(!op.timestamp) return console.error("received a message without a timestamp",op)
        if(op.host && op.host === graph.getHostId()) {
            // console.log("SKIP: my own message came in. ignoring it")
            return
        }
        console.log("REMOTE",op)
        graph.process(op)
    }
}



export default class MetadocEditor extends  TreeItemProvider {
    constructor() {
        super()
        this.graphListeners = []
        this.setDocGraph(new DocGraph())
        this.onGraphChange(this.handleGraphChange)
        this.connected = false
    }

    getGraph() {
        return this.syncdoc
    }

    onGraphChange = (cb) => {
        this.graphListeners.push(cb)
        if(this.syncdoc) this.syncdoc.onChange(cb)
    }

    handleGraphChange = (op) => {
        if(op.type === SET_PROPERTY) {
            this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,op)
        }
    }

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

    makeEmptyRoot() {
        const CH = this.syncdoc.createArray()
        const root = this.syncdoc.createObject()
        this.syncdoc.createProperty(root,'type','root')
        this.syncdoc.createProperty(root,'title','root')
        this.syncdoc.createProperty(root,'children',CH)


        const d = this.syncdoc
        const rect1 = this.syncdoc.createObject()
        d.createProperty(rect1,'title','first rect')
        d.createProperty(rect1,'x',100)
        d.createProperty(rect1,'y',100)
        d.createProperty(rect1,'width',100)
        d.createProperty(rect1,'height',100)
        this.syncdoc.insertElement(CH,0,rect1)
        return root
    }

    getRootList() {
        if (this.syncdoc.hasPropertyValue(this.root, 'children')) {
            return this.syncdoc.getPropertyValue(this.root, 'children')
        } else {
            return null
        }
    }

    getDocType = () => "metadoc"
    getApp = () => <MetadocApp provider={this}/>
    getTitle = () => "MetaDoc"

    getRendererForItem = (item) => {
        if(!this.syncdoc.getObjectById(item)) return <div>???</div>
        const title = this.syncdoc.getPropertyValue(item,'title')
        return <div>{title}</div>
    }

    isExpanded = (item) => true

    hasChildren = (item) => item && this.syncdoc.hasPropertyValue(item,'children')
    getChildren = (item) => {
        const CH = this.syncdoc.getPropertyValue(item,'children')
        const len = this.syncdoc.getArrayLength(CH)
        const ch = []
        for(let i=0; i<len; i++) {
            ch.push(this.syncdoc.getElementAt(CH,i))
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
            if(this.pubnub) this.pubnub.shutdown()
            this.pubnub = null
            this.setDocGraph(new DocGraph(),docid)
            payload.history.forEach(op => {
                // console.log("loading",op)
                this.syncdoc.process(op)
            })
            this.pubnub = new PubnubSyncWrapper(this)
            this.pubnub.unpause()
            this.pubnub.start()
            this.connected = true
            this.fire("CONNECTED",this.connected)
            this.root = this.syncdoc.getObjectByProperty('type','root')
            this.fire(TREE_ITEM_PROVIDER.CLEAR_DIRTY,true)
            SelectionManager.clearSelection()
            this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, { provider:this });
            console.log(this.getGraph().dumpGraph())
        }).catch((e)=>{
            console.log("missing doc. do nothing",e)
            // this.setDocument(this.makeEmptyRoot(),this.genID('doc'))
            // setQuery({mode:'edit',doc:this.docid, doctype:this.getDocType()})
        })
    }

    reloadDocument() {
        GET_JSON(SERVER_URL+this.docid).then((payload)=>{
            if(payload.type !== this.getDocType()) throw new Error("incorrect doctype for this provider",payload.type)
            console.log("got the payload",payload)
            this.setDocGraph(new DocGraph(),this.docid)
            payload.history.forEach(op => {
                // console.log("loading",op)
                this.syncdoc.process(op)
            })
            this.fire(TREE_ITEM_PROVIDER.CLEAR_DIRTY,true)
            SelectionManager.clearSelection()
            this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, { provider:this });
            console.log(this.getGraph().dumpGraph())
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
        const graph = this.props.provider.getGraph()
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


export class MetadocCanvas extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed:false,
            scale:1,
            selection:null
        }
        props.prov.onGraphChange((e) => {
            if (this.props.list === -1) return
            this.redraw()
        })
    }

    componentDidMount() {
        this.sel_listener = SelectionManager.on(SELECTION_MANAGER.CHANGED, (sel)=> {
            this.setState({selection:sel})
        })
    }

    toCanvas(e) {
        const rect = e.target.getBoundingClientRect()
        // console.log("clicked at",e.clientX,rect)
        return {
            x: (e.clientX-rect.left)/this.state.scale,
            y: (e.clientY-rect.top)/this.state.scale,
        }
    }



    componentDidUpdate(prevProps) {
        this.redraw()
    }

    redraw() {
        let sel = -1
        if(this.state.selection) {
            sel = this.state.selection.getSelection()
        }
        const c = this.canvas.getContext('2d')
        c.fillStyle = 'blue'
        c.fillRect(0, 0, this.canvas.width, this.canvas.height)
        c.save()
        c.scale(this.state.scale, this.state.scale)
        const list = this.props.prov.getRootList()
        if(!list) return
        const graph = this.props.prov.getGraph()
        const len = graph.getArrayLength(list)
        for (let i = 0; i < len; i++) {
            const objid = graph.getElementAt(list, i)
            const x = graph.getPropertyValue(objid, 'x')
            const y = graph.getPropertyValue(objid, 'y')
            const w = graph.getPropertyValue(objid, 'width')
            const h = graph.getPropertyValue(objid, 'height')
            // console.log(objid,x,y,w,h)
            c.fillStyle = 'gray'
            if (sel === objid) {
                c.fillStyle = 'red'
            }
            c.fillRect(x, y, w, h)
        }
        c.restore()
    }

    isInside(pt,objid) {
        const graph = this.props.prov.getGraph()
        const x = graph.getPropertyValue(objid, 'x')
        const y = graph.getPropertyValue(objid, 'y')
        const w = graph.getPropertyValue(objid, 'width')
        const h = graph.getPropertyValue(objid, 'height')
        if(pt.x < x) return false
        if(pt.x > x + w) return false
        if(pt.y < y) return false
        if(pt.y > y + h) return false
        return true
    }


    onClick = (e) => {
        const pt = this.toCanvas(e)
        const rect = this.findRect(pt)
        if(rect) this.props.onSelect(rect)
    }

    findRect(pt) {
        const graph = this.props.prov.getGraph()
        const list = this.props.prov.getRootList()
        if(!list) return null
        const len = graph.getArrayLength(list)
        for (let i = 0; i < len; i++) {
            const objid = graph.getElementAt(list, i)
            if(this.isInside(pt,objid)) return objid
        }
        return null
    }

    mouseDown = (e) =>{
        // this.props.onPauseQueue()
        const pt = this.toCanvas(e)
        const rect = this.findRect(pt)
        if(rect) {
            this.setState({
                pressed: true,
                start: pt,
                rect:rect,
            })
        }
    }
    mouseMove = (e) => {
        if(!this.state.pressed) return
        const pt = this.toCanvas(e)
        const graph = this.props.prov.getGraph()
        graph.setProperty(this.state.rect,'x',pt.x)
        graph.setProperty(this.state.rect,'y',pt.y)
    }
    mouseUp = (e) => {
        this.setState({pressed:false})
        // this.props.onUnpauseQueue()
    }

    render() {
        return <div className="panel">
            <h3>Canvas</h3>
            <canvas style={{border:'1px solid red'}}
                    width={500} height={300} ref={(e) => this.canvas = e}
                    onClick={this.onClick}
                    onMouseDown={this.mouseDown}
                    onMouseUp={this.mouseUp}
                    onMouseMove={this.mouseMove}
            ></canvas>
        </div>
    }
}
