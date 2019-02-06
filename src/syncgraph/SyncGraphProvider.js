import TreeItemProvider, {SERVER_URL, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {GET_JSON, POST_JSON, setQuery} from '../utils'
import {UndoQueue} from '../metadoc/UndoQueue'
import {EventCoalescer} from '../metadoc/EventCoalescer'
import SelectionManager from '../SelectionManager'
import {PubnubSyncWrapper} from '../metadoc/PubnubSyncWrapper'
import {propToArray} from "./utils";

const {DocGraph, CommandGenerator} = require("syncing_protocol");

export default class SyncGraphProvider extends TreeItemProvider {
    constructor(options) {
        super()
        this.options = options || {}
        this.mode = options.mode || 'edit'
        this.datalisteners = []
        this.rawlisteners = []
        this.expanded = {}

        const doc = new DocGraph()
        this.makeEmptyRoot(doc)
        this.setupDocFlow(doc,this.genID('doc'))
        if(options.doc) this.loadDoc(options.doc)
    }
    getDocHistory = () => this.getDataGraph().getHistory()
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
        this.getDataGraph().setProperty(item,def.key,value)
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,{
            provider: this,
            child:item,
            propKey:def.key,
            oldValue:def.value,
            newValue:value
        })
    }

    save = () => {
        const payload_obj = {
            history:this.getDocHistory(),
            type:this.getDocType(),
            id:this.getDocId()
        }
        const payload_string = JSON.stringify(payload_obj)
        return POST_JSON(SERVER_URL+this.getDocId(),payload_string).then((res)=>{
            console.log("got back result",res)
            setQuery({mode:this.mode,doc:this.getDocId(), doctype:this.getDocType()})
            this.fire(TREE_ITEM_PROVIDER.SAVED,true)
        }).catch((e)=> console.log("error",e))
    }

    loadDoc(docid) {
        return GET_JSON(SERVER_URL+docid).then((payload)=>{
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
        this.connected = true
        this.fire("CONNECTED",this.connected)
        this.fire(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED,{provider:this})
        setQuery({mode:this.mode,doc:this.getDocId(), doctype:this.getDocType()})
    }

    reloadDocument() {
        return GET_JSON(SERVER_URL+this.docid).then((payload)=>{
            if(payload.type !== this.getDocType()) throw new Error("incorrect doctype for this provider",payload.type)
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

    pauseQueue = () => this.coalescer.pause()
    unpauseQueue = () => this.coalescer.unpause()

    performUndo = () => {
        if(this.undoqueue.canUndo()) this.undoqueue.undo()
    }
    performRedo = () => {
        if(this.undoqueue.canRedo()) this.undoqueue.redo()
    }

    makeDocFromServerHistory(history) {
        const doc = new DocGraph()
        history.forEach(op => doc.process(op))
        return doc
    }


}
