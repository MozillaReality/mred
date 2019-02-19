import React, {Component} from 'react'
import GridEditorApp, {MenuPopup, Panel, Spacer, Toolbar} from '../GridEditorApp'
import PropSheet from '../common/PropSheet'
import TreeTable from '../common/TreeTable'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import {MetadocCanvas} from "./MetadocCanvas";
import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import {
    cloneShape,
    createGraphObjectFromObject,
    fetchGraphObject,
    insertAsFirstChild, insertAsLastChild, listToArray,
    propToArray,
    removeFromParent
} from "../syncgraph/utils";
import {DialogManager, HBox, PopupManager} from "appy-comps";
import InputManager from "../common/InputManager";
import {SERVER_URL_ASSETS, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {
    HORIZONTAL_ALIGNMENT,
    ICONS,
    isShapeType,
    PROP_DEFS,
    SHAPE_DEFS,
    STANDARD_FONTS,
    VERTICAL_ALIGNMENT
} from "./Common";
import AssetView from './AssetView'
import {AddImageAssetDialog} from '../vr/AddImageAssetDialog'
import {Dimension, parseDimension} from "./Dimension"
import {EnumEditor} from "../common/EnumEditor";
import PresentationApp from './PresentationApp'
import GraphAccessor from '../syncgraph/GraphAccessor'


const EnumTitleRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider) {
        const graph = props.provider.getDataGraph()
        value = graph.getPropertyValue(props.value,'title')
    }
    return <b>{value}</b>
}

const STANDARD_PAGE_SIZES = [
    {
        name:"1024 x 768 pixels",
        value:'1024x768px',
    },
    {
        name:"VGA (640x480)",
        value:"640x480px"
    },
    {
        name:"A4 paper",
        value:"210x297mm"
    },
    {
        name:"16:9",
        value:"300x169mm"
    },
    {
        name:"4:3",
        value:"225x169mm"
    },
]
const PageSizeRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider) {
        const size = STANDARD_PAGE_SIZES.find(s => s.value === props.value)
        if(size) {
            value = size.name
        } else {
            value = props.value
        }
    }
    return <b>{value}</b>
}

export default class MetadocEditor extends  SyncGraphProvider {
    constructor(options) {
        super(options)
        this.imagecache = {}
    }
    getDocType() { return "metadoc" }
    getApp = () => {
        if(this.mode === 'view') return <PresentationApp provider={this}/>
        return <MetadocApp provider={this}/>
    }
    getTitle = () => "MetaDoc"

    makeEmptyRoot(doc) {
        //create root and children
        const root = fetchGraphObject(doc,doc.createObject({ type:'root', title:'root', pageSize:'640 x 480 px', children: doc.createArray(), parent:0}))
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

    setPropertyValue(item, def, value) {
        super.setPropertyValue(item,def,value)
        if(def.key === PROP_DEFS.asset.key) {
            const asset = fetchGraphObject(this.getDataGraph(),value)
            super.setPropertyValue(item,{key:'width'},asset.width)
            super.setPropertyValue(item,{key:'height'},asset.height)
        }
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
        if(def.key === PROP_DEFS.pageSize.key) {
            const obj = fetchGraphObject(this.getDataGraph(),item)
            return <EnumEditor def={def} provider={this} obj={item} value={obj.pageSize} onChange={onChange}/>
        }
        return <i>no custom editor for {def.key}</i>
    }

    getValuesForEnum(key,obj) {
        if(key === PROP_DEFS.asset.key) {
            const children = this.getDataGraph().getPropertyValue(this.getAssetsObject(),'children')
            return propToArray(this.getDataGraph(),children)
        }
        if(key === PROP_DEFS.fontFamily.key) {
            return Object.keys(STANDARD_FONTS).map(key => STANDARD_FONTS[key])
        }
        if(key === PROP_DEFS.verticalAlign.key) {
            return Object.keys(VERTICAL_ALIGNMENT).map(key => VERTICAL_ALIGNMENT[key])
        }
        if(key === PROP_DEFS.horizontalAlign.key) {
            return Object.keys(HORIZONTAL_ALIGNMENT).map(key => HORIZONTAL_ALIGNMENT[key])
        }
        if(key === PROP_DEFS.pageSize.key) {
            return STANDARD_PAGE_SIZES.map(s => s.value)
        }
    }
    getRendererForEnum(key,obj) {
        if(key === PROP_DEFS.asset.key) return EnumTitleRenderer
        if(key === PROP_DEFS.pageSize.key) return PageSizeRenderer
    }


    getPageSize(page) {
        const root = this.getSceneRoot()
        const rootobj = fetchGraphObject(this.getDataGraph(),root)
        console.log("parsing",rootobj)
        return parseDimension(rootobj.pageSize)
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
        const obj = fetchGraphObject(this.getDataGraph(),item)
        if(obj.type === 'assets') {
            return [{
                title:'Add Image',
                icon:'image',
                fun:this.showAddImageAssetDialog
            }]
        }
        if(obj.type === 'asset') {
            return [{
                title:'delete',
                icon:'close',
                fun: this.deleteSelectedAsset
            }]
        }
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
                title:'image',
                icon: ICONS.image,
                fun: this.addImage
            },
            {
                title:'cut',
                icon: ICONS.cut,
                fun:this.cutSelection
            },
            {
                title:'copy',
                icon: ICONS.copy,
                fun:this.copySelection
            },
            {
                title:'paste',
                icon: ICONS.paste,
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

    addImageAssetFromFile = (file) => {
        this.uploadFile(file).then((ans)=>{
            console.log("uploaded file with answer",ans)
            const url = SERVER_URL_ASSETS+ans.id
            const graph = this.getDataGraph()
            const asset = fetchGraphObject(graph,graph.createObject({
                type:'asset',
                subtype:'image',
                format:file.type,
                src:url,
                width:100,
                height:100,
                title:file.name,
                parent:0
            }))
            const assets = fetchGraphObject(graph,this.getAssetsObject())
            insertAsLastChild(graph,assets,asset)
            this.requestImageCache(url).then(img => {
                graph.setProperty(asset.id,'width',img.width)
                graph.setProperty(asset.id,'height',img.height)
            })
        })
    }

    addImageAssetFromURL = (url) => {
        //TODO: make this format detection code more robust
        const name = url.substring(url.lastIndexOf('/')+1)
        const type = name.substring(name.lastIndexOf(".")+1)
        let fileType = "image/unknown"
        if(type.toLowerCase() === 'png') fileType = 'image/png'
        if(type.toLowerCase() === 'jpg') fileType = 'image/jpeg'
        if(type.toLowerCase() === 'jpeg') fileType = 'image/jpeg'

        const graph = this.getDataGraph()
        const asset = fetchGraphObject(graph,graph.createObject({
            type:'asset',
            subtype:'image',
            format:fileType,
            src:url,
            width:100,
            height:100,
            title:name,
            parent:0
        }))
        const assets = fetchGraphObject(graph,this.getAssetsObject())
        insertAsLastChild(graph,assets,asset)
        this.requestImageCache(url).then(img => {
            graph.setProperty(asset.id,'width',img.width)
            graph.setProperty(asset.id,'height',img.height)
        })
    }
    deleteSelection = () => {
        const graph = this.getDataGraph()
        // const layer = this.getSelectedLayer()
        const shape = this.getSelectedShape()
        if(!shape) return
        removeFromParent(graph,shape)
        SelectionManager.clearSelection()
    }
    deleteSelectedAsset = () => {
        const graph = this.getDataGraph()
        const sel = SelectionManager.getSelection()
        const obj = fetchGraphObject(graph,sel)
        removeFromParent(graph,obj)
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
    pasteSelection = (e) => {
        if(e.target && e.target.getAttribute('type') === 'input') return console.log("pasting into an input field. don't intercept")
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
        if(SHAPE_DEFS[obj.type]) return SHAPE_DEFS[obj.type].toSVGString(obj,this)
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
    canAddExternalChild(parent,child) {
        const pobj = fetchGraphObject(this.getDataGraph(),parent)
        // console.log('parent is',pobj)
        if(pobj.type === 'assets') return true
        return false
    }
    acceptDrop(e,tgt) {
        const obj = fetchGraphObject(this.getDataGraph(),tgt)
        if(obj.type === 'assets') {
            listToArray(e.dataTransfer.files).forEach(file => this.addImageAssetFromFile(file))
        }
    }


    newView = () => window.open( `./?mode=metadoc&doctype=${this.getDocType()}&doc=${this.getDocId()}`)
    openPresentationView = () => window.open( `./?mode=view&doctype=${this.getDocType()}&doc=${this.getDocId()}`)


    isImageCached(src) {
        if(this.imagecache[src]) return this.imagecache[src].complete
        return false
    }
    requestImageCache(src) {
        const img = new Image()
        this.imagecache[src] = img
        return new Promise((res,rej) => {
            img.src = src
            img.onload = () => {
                this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,{ provider: this })
                res(img)
            }
        })
    }
    getCachedImage(src) {
        return this.imagecache[src]
    }

    getAssetsObject = () => this.getDataGraph().getObjectByProperty('type','assets')

    showAddImageAssetDialog = () => DialogManager.show(<AddImageAssetDialog provider={this}/>)

    accessObject = (id) => {
        return new GraphAccessor(this.getDataGraph()).object(id)
    }

}



class MetadocApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            connected:false,
            zoom: 0,
            mode:'canvas'
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
        SelectionManager.on(SELECTION_MANAGER.CHANGED,()=>{
            const sel = SelectionManager.getSelection()
            if(sel) {
                const item = fetchGraphObject(this.props.provider.getDataGraph(),sel)
                if(item.type === PROP_DEFS.asset.key) {
                    this.setState({mode:'asset'})
                    return
                }
            }
            this.setState({mode:'canvas'})
        })
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
                <button className="fa fa-file-image-o" onClick={prov.showAddImageAssetDialog}/>
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
                <button className="fa fa-play" onClick={prov.openPresentationView}/>
                <button className="fa fa-plus" onClick={prov.newView}> view</button>
                <button className="fa fa-superpowers" onClick={prov.toggleConnected}>{this.state.connected?"disconnect":"connect"}</button>
            </Toolbar>

            <Panel center middle scroll>
                {this.renderCenterPane(this.state.mode)}
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>

            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }

    renderCenterPane(mode) {
        if (mode === 'canvas') {
            return <MetadocCanvas prov={this.props.provider} onSelect={this.canvasSelected} scale={Math.pow(2, this.state.zoom)}/>
        } else {
            const sel = SelectionManager.getSelection()
            return <AssetView provider={this.props.provider} asset={sel}/>
        }
    }
}


