import React, {Component} from 'react'
import GridEditorApp, {MenuPopup, Panel, Spacer, Toolbar} from '../GridEditorApp'
import PropSheet, {TYPES} from '../common/PropSheet'
import TreeTable from '../common/TreeTable'
import SelectionManager from '../SelectionManager'
import {MetadocCanvas} from "./MetadocCanvas";
import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import {
    cloneShape,
    createGraphObjectFromObject,
    fetchGraphObject,
    insertAsFirstChild, insertAsLastChild,
    propToArray,
    removeFromParent
} from "../syncgraph/utils";
import {HBox, PopupManager} from "appy-comps";
import RectDef from "./RectDef";
import CircleDef from "./CircleDef";
import TextDef from "./TextDef";
import InputManager from "../common/InputManager";
import ImageDef from './ImageDef'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'

const PROP_DEFS = {
    title: {
        key:'title',
        name:'Title',
        type:TYPES.STRING
    },
    x: {
        key:'x',
        name:'X',
        type:TYPES.NUMBER
    },
    y: {
        key:'y',
        name:'Y',
        type:TYPES.NUMBER
    },
    rx: {
        key:'rx',
        name:'RX',
        type:TYPES.NUMBER
    },
    ry: {
        key:'ry',
        name:'RY',
        type:TYPES.NUMBER
    },
    fillColor: {
        key:'fillColor',
        name:'color',
        type:TYPES.COLOR,
        custom:true,
    },
    width: {
        key:'width',
        name:'Width',
        type:TYPES.NUMBER
    },
    height: {
        key:'height',
        name:'Height',
        type:TYPES.NUMBER
    },
    radius: {
        key:'radius',
        name:'Radius',
        type:TYPES.NUMBER
    },
    text: {
        key:'text',
        name:'text',
        type:TYPES.STRING
    },
    src: {
        key:'src',
        name:'src',
        type:TYPES.STRING,
    },
    asset: {
        key:'asset',
        name:'asset',
        type:TYPES.ENUM,
    },
    subtype: {
        key:'subtype',
        name:'kind',
        type:TYPES.STRING,
        locked:true,
    },
    format: {
        key:'format',
        name:'format',
        type:TYPES.STRING,
        locked:true,
    },
}

const SHAPE_DEFS = {
    rect: new RectDef(),
    circle: new CircleDef(),
    text: new TextDef(),
    image: new ImageDef(),
}

const ICONS = {
    page:'file',
    layer:'sticky-note',
    rect:'square',
    circle:'circle',
    text:'font',
    image:'image'
}



function isShapeType(type) {
    if(type === 'rect') return true
    if(type === 'circle') return true
    if(type === 'text') return true
    if(type === 'image') return true
    return false
}

const EnumTitleRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider) {
        const graph = props.provider.getDataGraph()
        value = graph.getPropertyValue(props.value,'title')
    }
    return <b>{value}</b>
}

export default class MetadocEditor extends  SyncGraphProvider {
    constructor(options) {
        super(options)
        this.imagecache = {}
    }
    getDocType() { return "metadoc" }
    getApp = () => <MetadocApp provider={this}/>
    getTitle = () => "MetaDoc"

    makeEmptyRoot(doc) {
        //create root and children
        const root = fetchGraphObject(doc,doc.createObject({ type:'root', title:'root', children: doc.createArray(), parent:0}))
        //create page and children
        const page = fetchGraphObject(doc,doc.createObject({ type:'page', title:'page 1', children: doc.createArray(),parent:0}))
        //create layer and children
        const layer = fetchGraphObject(doc,doc.createObject({type:'layer',title:'layer 1', children: doc.createArray(),parent:0}))
        //create rect
        const rect1 = SHAPE_DEFS.rect.make(doc,layer)
        // create assets
        const assets = fetchGraphObject(doc,doc.createObject({type:'assets',title:'Assets', children: doc.createArray(), parent:0}))
        //connect it all together
        insertAsFirstChild(doc,layer,rect1)
        insertAsFirstChild(doc,page,layer)
        insertAsFirstChild(doc,root,page)
        insertAsLastChild(doc,root,assets)
    }

    getRendererForItem = (item) => {
        if(!this.getDataGraph().getObjectById(item)) return <div>???</div>
        const type = this.getDataGraph().getPropertyValue(item,'type')
        const title = this.getDataGraph().getPropertyValue(item,'title')
        if(ICONS[type]) return <div><i className={`fa fa-${ICONS[type]}`}/> {title}</div>
        return <div>{title}</div>
    }

    getProperties(item) {
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
                if(key === 'parent') return
                const value = this.syncdoc.getPropertyValue(item,key)
                if(PROP_DEFS[key]) return defs.push(copyPropDef(PROP_DEFS[key],value))
                console.log("unknown property",key)
            })
        }

        return defs
    }

    createCustomEditor(item,def,provider, value, onChange) {
        if(def.key === PROP_DEFS.fillColor.key) return <HBox>
            {
                ["#ffffff","#ff0000","#ffff00","#00ff00","#00ffff","#0000ff","#ff00ff","#000000"]
                    .map(c => <button
                        key={c}
                        onClick={()=>onChange(c)}
                        style={{color:c, padding:'1px', margin:0, borderWidth:0,}}
                        className={"fa fa-square"}/> )
            }
        </HBox>
        return <i>no custom editor for {def.key}</i>
    }

    getValuesForEnum(key,obj) {
        if(key === PROP_DEFS.asset.key) {
            const children = this.getDataGraph().getPropertyValue(this.getAssetsObject(),'children')
            return propToArray(this.getDataGraph(),children)
        }
    }
    getRendererForEnum(key,obj) {
        if(key === PROP_DEFS.asset.key) return EnumTitleRenderer
    }



    getShapeDef(type) {
        return SHAPE_DEFS[type]
    }
    getSelectedRoot() {
        return fetchGraphObject(this.getDataGraph(),this.getSceneRoot())
    }
    getSelectedPage() {
        let sel = SelectionManager.getSelection()
        if(!sel) return null
        while(true) {
            const type = this.getDataGraph().getPropertyValue(sel, 'type')
            if(type === 'root') return null
            if(type === 'page') return fetchGraphObject(this.getDataGraph(),sel)
            sel = this.getDataGraph().getPropertyValue(sel,'parent')
            if(!sel) break
        }
    }

    getSelectedLayer() {
        let sel = SelectionManager.getSelection()
        if(!sel) return null
        while(true) {
            const type = this.getDataGraph().getPropertyValue(sel, 'type')
            if(type === 'root') return null
            if(type === 'layer') return fetchGraphObject(this.getDataGraph(),sel)
            sel = this.getDataGraph().getPropertyValue(sel,'parent')
            if(!sel) break
        }
        console.log(fetchGraphObject(this.getDataGraph(),sel))
    }

    getSelectedShape() {
        let sel = SelectionManager.getSelection()
        if(!sel) return null
        const type = this.getDataGraph().getPropertyValue(sel, 'type')
        if(SHAPE_DEFS[type]) return fetchGraphObject(this.getDataGraph(),sel)
        return null
    }

    calculateContextMenu(item) {
        const cmds =  [
            {
                title:'delete',
                icon:'close',
                fun: this.deleteSelection
            },
            {
                title:'rect',
                icon:ICONS.rect,
                fun: this.addRect
            },
            {
                title:'circle',
                icon:ICONS.circle,
                fun: this.addCircle
            },
            {
                title:'text',
                icon:ICONS.text,
                fun: this.addText
            },
            {
                title:'cut',
                fun:this.cutSelection
            },
            {
                title:'copy',
                fun:this.copySelection
            },
            {
                title:'paste',
                fun:this.pasteSelection
            },
        ]
        return cmds
    }

    addShape = (def) => {
        const graph = this.getDataGraph()
        const layer = this.getSelectedLayer()
        if(!layer) return console.error("no layer!")
        const shape = def.make(graph,layer)
        insertAsFirstChild(graph,layer,shape)
    }
    addRect   = () => this.addShape(this.getShapeDef('rect'))
    addCircle = () => this.addShape(this.getShapeDef('circle'))
    addText   = () => this.addShape(this.getShapeDef('text'))
    addImage   = () => this.addShape(this.getShapeDef('image'))

    addDummyImageAsset = () => {
        console.log("adding a dummy image asset")
        const graph = this.getDataGraph()
        const asset = fetchGraphObject(graph,graph.createObject({
            type:'asset',
            subtype:'image',
            format:'image/png',
            src:'https://baconmockup.com/300/200/',
            width:300,
            height:200,
            title:'an image',
            parent:0,
        }))
        const assets = fetchGraphObject(graph,this.getAssetsObject())
        insertAsLastChild(graph,assets,asset)
    }
    deleteSelection = () => {
        const graph = this.getDataGraph()
        const layer = this.getSelectedLayer()
        const shape = this.getSelectedShape()
        if(!shape) return
        removeFromParent(graph,shape)
        SelectionManager.clearSelection()
    }
    cutSelection = () => {
        const graph = this.getDataGraph()
        let sel = SelectionManager.getSelection()
        if(!sel) return
        const obj = fetchGraphObject(graph,sel)
        SelectionManager.setClipboard(obj.id)
        removeFromParent(graph,obj)
        SelectionManager.clearSelection()
    }
    copySelection = () => {
        const graph = this.getDataGraph()
        let sel = SelectionManager.getSelection()
        if(!sel) return
        const obj = fetchGraphObject(graph,sel)
        SelectionManager.setClipboard(obj.id)
    }
    pasteSelection = () => {
        const graph = this.getDataGraph()
        const shapeid = SelectionManager.getClipboard()
        const obj1 = fetchGraphObject(graph,shapeid)

        let parent = null
        if(isShapeType(obj1.type)) parent = this.getSelectedLayer()
        if(obj1.type === 'layer') parent = this.getSelectedPage()
        if(obj1.type === 'page') parent = fetchGraphObject(graph,this.getSceneRoot())
        if (!parent) return console.error("no parent to ad too! bad obj type?",obj1.type)

        const obj2 = cloneShape(graph,obj1)
        graph.setProperty(obj2.id, 'parent', parent.id)
        insertAsFirstChild(graph, parent, obj2)
        return
    }

    exportSVG = () => {
        const page = this.getSelectedPage()

        const svg = this.renderSVGWrapper(this.renderSVGChildren(page))
        const link = document.createElement('a');
        link.href = 'data:image/svg+xml,'+encodeURIComponent(svg)
        link.download = 'test.svg'
        document.body.appendChild(link)
        link.click()
    }
    renderSVGWrapper(str) {
        return `<svg id="svg-canvas" viewBox="0 0 1000 1000" 
                xmlns="http://www.w3.org/2000/svg" 
                xmlnsXlink="http://www.w3.org/1999/xlink">
                ${str}</svg>`
    }
    renderSVGChildren(obj) {
        if(obj.type === 'page') return propToArray(this.getDataGraph(),obj.children)
            .map((layer) => `<g>${this.renderSVGChildren(fetchGraphObject(this.getDataGraph(),layer))}</g>`).join("")
        if(obj.type === 'layer') return propToArray(this.getDataGraph(),obj.children)
            .map(shape => this.renderSVGChildren(fetchGraphObject(this.getDataGraph(),shape))).join("")
        if(SHAPE_DEFS[obj.type]) return SHAPE_DEFS[obj.type].toSVGString(obj)
        return "";
    }

    canAddChild(parent,child) {
        const p = fetchGraphObject(this.getDataGraph(),parent)
        const c = fetchGraphObject(this.getDataGraph(),child)
        if(p.type === 'layer' && isShapeType(c.type)) return true
        if(p.type === 'page' && c.type === 'layer') return true
        if(p.type === 'root' && c.type === 'page') return true
        return false
    }
    canBeSibling(src,tgt) {
        const s = fetchGraphObject(this.getDataGraph(),src)
        const t = fetchGraphObject(this.getDataGraph(),tgt)
        if(s.type === 'layer' && t.type === 'layer') return true
        if(s.type === 'page' && t.type === 'page') return true
        if(isShapeType(s.type) && isShapeType(t.type)) return true
        return false
    }
    newView = () => window.open( `./?mode=metadoc&doctype=${this.getDocType()}&doc=${this.getDocId()}`)


    isImageCached(src) {
        if(this.imagecache[src]) return this.imagecache[src].complete
        return false
    }
    requestImageCache(src) {
        this.imagecache[src] = new Image()
        this.imagecache[src].onload = () => this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,{ provider: this })
        this.imagecache[src].src = src
    }
    getCachedImage(src) {
        return this.imagecache[src]
    }

    getAssetsObject = () => this.getDataGraph().getObjectByProperty('type','assets')
}



class MetadocApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            connected:false,
            zoom: 0,
        }

        this.im = new InputManager()
        this.im.addKeyBinding({ id:'save',  key:InputManager.KEYS.S, modifiers:[InputManager.MODIFIERS.COMMAND]})
        this.im.addKeyBinding({ id:'undo', key:InputManager.KEYS.Z,  modifiers:[InputManager.MODIFIERS.COMMAND]})
        this.im.addKeyBinding({ id:'redo', key:InputManager.KEYS.Z,  modifiers:[InputManager.MODIFIERS.COMMAND, InputManager.MODIFIERS.SHIFT]})
        this.im.addListener('save',this.props.provider.save)
        this.im.addListener('undo',this.props.provider.performUndo)
        this.im.addListener('redo',this.props.provider.performRedo)

        this.im.addKeyBinding({id:'cut', key:InputManager.KEYS.X, modifiers:[InputManager.MODIFIERS.COMMAND]})
        this.im.addKeyBinding({id:'copy', key:InputManager.KEYS.C, modifiers:[InputManager.MODIFIERS.COMMAND]})
        this.im.addKeyBinding({id:'paste', key:InputManager.KEYS.V, modifiers:[InputManager.MODIFIERS.COMMAND]})

        this.im.addListener('cut',this.props.provider.cutSelection)
        this.im.addListener('copy',this.props.provider.copySelection)
        this.im.addListener('paste',this.props.provider.pasteSelection)
    }

    componentDidMount() {
        this.im.attachKeyEvents(document)
        this.props.provider.on('CONNECTED',()=> this.setState({connected: this.props.provider.isConnected()}))
    }

    canvasSelected = (rect) => SelectionManager.setSelection(rect)


    showAddPopup = (e) => {
        const acts = [
            {
                title: 'page',
                icon: ICONS.page,
                fun: () => this.addPage()
            },
            {
                title: 'layer',
                icon: ICONS.layer,
                fun: () => this.addLayer()
            },
            {
                title: 'rect',
                icon: ICONS.rect,
                fun: () => this.props.provider.addRect()
            },
            {
                title: 'circle',
                icon: ICONS.circle,
                fun: () => this.props.provider.addCircle()
            },
            {
                title: 'text',
                icon: ICONS.text,
                fun: () => this.props.provider.addText()
            },
            {
                title:'image',
                icon: ICONS.image,
                fun: () => this.props.provider.addImage()
            },
        ]
        PopupManager.show(<MenuPopup actions={acts}/>,e.target)
    }
    addPage = () => {
        const graph = this.props.provider.getDataGraph()
        const root = this.props.provider.getSelectedRoot()
        const page = fetchGraphObject(graph,createGraphObjectFromObject(graph,{
            type:'page',
            title:'new page',
            parent:root.id,
            children: graph.createArray()
        }))
        insertAsFirstChild(graph,root,page)
    }
    addLayer = () => {
        const graph = this.props.provider.getDataGraph()
        const page = this.props.provider.getSelectedPage()
        const layer = fetchGraphObject(graph,createGraphObjectFromObject(graph,{
            type:'layer',
            title:'new layer',
            parent:page.id,
            children:graph.createArray()
        }))
        insertAsFirstChild(graph,page,layer)
    }

    zoomIn  = () => this.setState({zoom:this.state.zoom+1})
    zoomOut = () => this.setState({zoom:this.state.zoom-1})

    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle>
                <TreeTable root={prov.getSceneRoot()} provider={prov}/>
            </Panel>

            <Toolbar left bottom>
                <button className="fa fa-plus" onClick={this.showAddPopup}/>
                <button className="fa fa-close" onClick={prov.deleteSelection}/>
                <button className="fa fa-file-image-o" onClick={prov.addDummyImageAsset}/>
            </Toolbar>

            <Toolbar center top>
                <button className="fa fa-save" onClick={prov.save}/>
                <button className="fa fa-download" onClick={prov.exportSVG}/>
                <button className="fa fa-undo" onClick={prov.performUndo}/>
                <button className="fa fa-repeat" onClick={prov.performRedo}/>
                <button className="fa fa-search-plus" onClick={this.zoomIn}/>
                <button className="fa fa-search-minus" onClick={this.zoomOut}/>
                <Spacer/>
                <button className="fa fa-cut" onClick={prov.cutSelection}/>
                <button className="fa fa-copy" onClick={prov.copySelection}/>
                <button className="fa fa-paste" onClick={prov.pasteSelection}/>
                <Spacer/>
                <button className="fa fa-plus" onClick={prov.newView}> view</button>
                <button className="fa fa-superpowers" onClick={prov.toggleConnected}>{this.state.connected?"disconnect":"connect"}</button>
            </Toolbar>

            <Panel center middle scroll>
                <MetadocCanvas prov={prov} onSelect={this.canvasSelected} scale={Math.pow(2,this.state.zoom)}/>
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>

            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }
}


