import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import React, {Component} from 'react'
import GridEditorApp, {MenuPopup, Panel, Spacer, Toolbar} from '../GridEditorApp'
import TreeTable from '../common/TreeTable'
import PropSheet, {TYPES} from '../common/PropSheet'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import {VRCanvas} from './VRCanvas'
import {SERVER_URL_ASSETS, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import ImmersiveVREditor from './ImmersiveVREditor'
import {
    fetchGraphObject, insertAsFirstChild,
    insertAsLastChild,
    listToArray,
} from '../syncgraph/utils'
import CubeDef from "./CubeDef";
import SceneDef from "./SceneDef";
import InputManager from "../common/InputManager";
import {DialogManager, HBox, PopupManager} from "appy-comps";
import {
    get3DObjectDef,
    is3DObjectType,
    isGLTFFile,
    isImageType,
    ITEM_ICONS,
    MIME_TYPES,
    OBJ_TYPES,
    PROP_DEFS,
    SIMPLE_COLORS
} from './Common'
import {AddImageAssetDialog} from './AddImageAssetDialog'
import {AddGLTFAssetDialog} from './AddGLTFAssetDialog'
import {AddGLBAssetDialog} from './AddGLBAssetDialog'
import {AddAudioAssetDialog} from './AddAudioAssetDialog'
import {HORIZONTAL_ALIGNMENT} from './Common'
import AssetView from '../metadoc/AssetView'
import * as ToasterMananager from './ToasterManager'
import GraphAccessor from "../syncgraph/GraphAccessor"
import {MakeEmbedDialog} from './MakeEmbedDialog'
import VREmbedViewApp from './VREmbedViewApp'


export default class VREditor extends  SyncGraphProvider {
    constructor(options) {
        super(options)
        this.imagecache = {}
    }
    getDocType() { return "vr" }
    getApp = () => {
        if(this.mode === 'edit') return <VREditorApp provider={this}/>
        if(this.mode === 'vredit') return <ImmersiveVREditor provider={this} editable={true}/>
        if(this.mode === 'embed-view') return <ImmersiveVREditor provider={this} editable={false}/>
        throw new Error("unknown mode " +this.mode)
    }
    getTitle = () => "VR Builder"
    makeEmptyRoot(doc) {
        //make root
        const root = fetchGraphObject(doc,doc.createObject({ type:'root', title:'root', children:doc.createArray() }))
        //make scene
        const scene1 = new SceneDef().make(doc,root)
        //make cube
        const obj = new CubeDef().make(doc,scene1)
        //make assets
        const assets = fetchGraphObject(doc,doc.createObject({type:'assets',title:'Assets', children: doc.createArray(), parent:0}))
        //tie it all together
        insertAsFirstChild(doc,root,scene1)
        insertAsFirstChild(doc,scene1,obj)
        insertAsLastChild(doc,root,assets)
    }

    getRendererForItem = (item) => {
        const obj = this.accessObject(item)
        if(!obj.exists()) return <div>???</div>
        if(obj.type === 'asset') return <div><i className={`fa fa-${ITEM_ICONS[obj.subtype]}`}></i> {obj.title}</div>
        if(ITEM_ICONS[obj.type]) return <div><i className={`fa fa-${ITEM_ICONS[obj.type]}`}></i> {obj.title}</div>
        return <div>{obj.title}</div>
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
        defs.push({
            key:'id',
            name:"ID",
            type:TYPES.STRING,
            value:item,
            locked:true
        })

        const obj = this.accessObject(item)
        if(is3DObjectType(obj.type)) {
            defs.push({
                key: 'scale',
                name: 'Scale',
                type: TYPES.GROUP,
                group: ['sx','sy','sz'],
                custom:true,
            })
        }

        return defs
    }
    setPropertyValue(item, def, value) {
        if(def.key === 'scale') {
            super.setPropertyValue(item,{key:'sx'},value.sx)
            super.setPropertyValue(item,{key:'sy'},value.sy)
            super.setPropertyValue(item,{key:'sz'},value.sz)
            return
        }
        super.setPropertyValue(item,def,value)
        //size the plane to match the aspect ratio of the asset
        if(def.key === PROP_DEFS.asset.key) {
            const asset = this.accessObject(value)
            if(asset.subtype === 'image') {
                let height = (asset.height / asset.width) * this.accessObject(item).width
                super.setPropertyValue(item, {key: 'height'}, height)
            }
            if(asset.subtype === 'gltf') {
                console.log("adjusting to a gtlf")
            }
        }
    }
    getValuesForEnum(key,obj) {
        if (key === PROP_DEFS.asset.key) {
            const assets = this.accessObject(this.getAssetsObject()).array('children').map(ch => this.accessObject(ch))
            const realobj = this.accessObject(obj)
            if(acceptsModelAsset(realobj.type)) return assets.filter(a => a.subtype === 'gltf').map(a => a.id)
            if(acceptsImageAsset(realobj.type)) return assets.filter(a => a.subtype === 'image').map(a => a.id)
        }
        if(key === PROP_DEFS.navTarget.key) {
            const scenes = this.accessObject(this.getSceneRoot()).array('children')
                .map(ch => this.accessObject(ch))
                .filter(ch => ch.type === 'scene')
                .map(sc => sc.id)
            const audios = this.accessObject(this.getAssetsObject()).array('children')
                .map(ch => fetchGraphObject(this.getDataGraph(),ch))
                .filter(a => a.subtype === 'audio')
                .map(a => a.id)
            return audios.concat(scenes)
        }
        if(key === PROP_DEFS.horizontalAlign.key) {
            return Object.keys(HORIZONTAL_ALIGNMENT).map(key => HORIZONTAL_ALIGNMENT[key])
        }
    }
    getRendererForEnum(key,obj) {
        switch(key) {
            case PROP_DEFS.asset.key: return EnumTitleRenderer
            case PROP_DEFS.navTarget.key: return NavTargetRenderer
        }
    }

    getSelectedScene() {
        const sel = SelectionManager.getSelection()
        if(sel === null) return this.accessObject(this.getSceneRoot()).child(0)
        const selected = this.accessObject(sel)
        if(selected.type === 'scene') return selected
        if(is3DObjectType(selected.type))  return this.accessObject(selected.parent)
        return -1
    }
    getAssetsObject = () => this.getDataGraph().getObjectByProperty('type','assets')

    quick_setPropertyValue(item, key, value) {
        const ov = this.getDataGraph().getPropertyValue(item,key)
        const op = this.cmd.setProperty(item,key,value)
        op.prevValue = ov
        if(op.value === op.prevValue) return
        this.getRawGraph().process(op)
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,{
            provider: this,
            child:item,
            propKey:key,
            oldValue:ov,
            newValue:value
        })
    }

    preview = () => window.open( `./?mode=vredit&doctype=${this.getDocType()}&doc=${this.getDocId()}`)

    embedView = () => {
        DialogManager.show(<MakeEmbedDialog provider={this}/>)
    }

    addScene = () => {
        const root = this.accessObject(this.getSceneRoot())
        const scene = new SceneDef().make(this.getDataGraph(),root)
        root.insertFirstChild(scene)
        SelectionManager.setSelection(scene.id)
    }

    add3DObject = (type) => {
        const scene = this.getSelectedScene()
        const obj = get3DObjectDef(type).make(this.getDataGraph(),scene)
        scene.insertFirstChild(obj)
        SelectionManager.setSelection(obj.id)
        ToasterMananager.add('added '+type)
    }

    addImageAssetFromFile = (file) => {
        ToasterMananager.add('uploading')
        this.uploadFile(file).then((ans)=>{
            ToasterMananager.add('uploaded')
            return this.addImageAssetFromExpandedURL(SERVER_URL_ASSETS+ans.id, file.type, file.name)
        })
    }
    addImageAssetFromURL = (url) => {
        //TODO: make this format detection code more robust
        const name = url.substring(url.lastIndexOf('/') + 1)
        const type = name.substring(name.lastIndexOf(".") + 1)
        let fileType = "image/unknown"
        if (type.toLowerCase() === 'png') fileType = 'image/png'
        if (type.toLowerCase() === 'jpg') fileType = 'image/jpeg'
        if (type.toLowerCase() === 'jpeg') fileType = 'image/jpeg'
        return this.addImageAssetFromExpandedURL(url, fileType, name)
    }
    addImageAssetFromExpandedURL(url,format,name) {
        const asset = this.accessObject(this.getDataGraph().createObject({
            type:'asset',
            subtype:'image',
            format:format,
            src:url,
            width:100,
            height:100,
            title:name,
            parent:0
        }))
        this.accessObject(this.getAssetsObject()).insertChildLast(asset)
        this.requestImageCache(url).then(img => {
            asset.set('width',img.width)
            asset.set('height',img.height)
        })
    }

    addAudioAssetFromFile = (file) => {
        ToasterMananager.add('uploading')
        this.uploadFile(file).then((ans)=>{
            ToasterMananager.add('uploaded')
            console.log("uploaded file with answer",ans)
            const url = SERVER_URL_ASSETS+ans.id
            const graph = this.getDataGraph()
            const asset = fetchGraphObject(graph,graph.createObject({
                type:'asset',
                subtype:'audio',
                format:file.type,
                src:url,
                title:file.name,
                parent:0
            }))
            this.accessObject(this.getAssetsObject()).insertChildLast(asset)
        })
    }
    addAudioAssetFromURL = (url) => {
        //TODO: make this format detection code more robust
        const name = url.substring(url.lastIndexOf('/')+1)
        const type = name.substring(name.lastIndexOf(".")+1)
        let fileType = "audio/unknown"
        if(type.toLowerCase() === 'mp3') fileType = MIME_TYPES.MP3
        if(type.toLowerCase() === 'aac') fileType = MIME_TYPES.AAC

        const graph = this.getDataGraph()
        const asset = fetchGraphObject(graph,graph.createObject({
            type:'asset',
            subtype:'audio',
            format:fileType,
            src:url,
            title:name,
            parent:0
        }))
        this.accessObject(this.getAssetsObject()).insertChildLast(asset)
    }
    addGLBAssetFromFile = (file) => {
        ToasterMananager.add('uploading')
        this.uploadFile(file).then((ans)=>{
            ToasterMananager.add('uploaded')
            console.log("uploaded file with answer",ans)
            const url = SERVER_URL_ASSETS+ans.id
            const graph = this.getDataGraph()
            const asset = fetchGraphObject(graph,graph.createObject({
                type:'asset',
                subtype:'gltf',
                format:'model/gltf-binary',
                src:url,
                title:file.name,
                parent:0
            }))
            this.accessObject(this.getAssetsObject()).insertChildLast(asset)
        })
    }

    deleteObject = () => {
        if(SelectionManager.isEmpty()) return
        this.accessObject(SelectionManager.getSelection()).removeFromParent()
        SelectionManager.clearSelection()
    }

    calculateContextMenu(item) {
        const cmds = []
        cmds.push({ title:'delete', icon:ITEM_ICONS.delete, fun: this.deleteObject });
        cmds.push({ divider:true })
        Object.keys(OBJ_TYPES).forEach(type => cmds.push({ title:type,icon: ITEM_ICONS[type], fun: () => this.add3DObject(type) }))
        cmds.push({ title:'scene', icon:ITEM_ICONS.scene, fun: this.addScene })
        cmds.push({ divider:true })
        cmds.push({ title:'cut',   icon:ITEM_ICONS.cut,   fun: this.cutSelection })
        cmds.push({ title:'copy',  icon:ITEM_ICONS.copy,  fun: this.copySelection })
        cmds.push({ title:'paste', icon:ITEM_ICONS.paste, fun: this.pasteSelection })
        return cmds
    }

    cutSelection = () => {
        if(SelectionManager.isEmpty()) return
        const obj = this.accessObject(SelectionManager.getSelection())
        SelectionManager.setClipboard(obj.id)
        obj.removeFromParent()
        SelectionManager.clearSelection()
    }
    copySelection = () => {
        if(SelectionManager.isEmpty()) return
        const obj = this.accessObject(SelectionManager.getSelection())
        SelectionManager.setClipboard(obj.id)
    }
    pasteSelection = (e) => {
        //don't intercept if this is a paste into a text field
        if(e && e.target) {
            if (e.target.getAttribute('type') === 'input') return
            if (e.target.nodeName === 'INPUT') return
        }
        const graph = this.getDataGraph()
        const obj1 = this.accessObject(SelectionManager.getClipboard())
        let parent = null
        if(is3DObjectType(obj1.type)) parent = this.getSelectedScene()
        if(obj1.type === 'scene') parent = this.accessObject(this.getSceneRoot())
        if (!parent) return console.error("no parent to ad too! bad obj type?",obj1.type)
        parent.insertChildLast(obj1.clone())
    }

    canAddChild(parent,child) {
        const p = this.accessObject(parent)
        const c = this.accessObject(child)
        if(p.type === 'root' && c.type === 'scene') return true
        if(p.type === 'scene' && is3DObjectType(c.type)) return true
        return false
    }
    canBeSibling(src,tgt) {
        const s = this.accessObject(src)
        const t = this.getDataGraph(tgt)
        if(s.type === 'scene' && t.type === 'scene') return true
        if(is3DObjectType(s.type) && is3DObjectType(t.type)) return true
        return false
    }
    canAddExternalChild(parent,child) {
        const obj = this.accessObject(parent)
        if(obj.type === 'assets') return true
        return false
    }
    acceptDrop(e,tgt) {
        const obj = this.accessObject(tgt)
        if(obj.type === 'assets') {
            listToArray(e.dataTransfer.files).forEach(file => {
                if(isImageType(file.type)) return this.addImageAssetFromFile(file)
                if(isGLTFFile(file)) return this.addGLBAssetFromFile(file)
            })
        }
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


    createCustomEditor(item,def,provider, value, onChange) {
        if(def.key === PROP_DEFS.color.key
            || def.key === PROP_DEFS.backgroundColor.key
            || def.key === PROP_DEFS.borderColor.key
            || def.key === PROP_DEFS.textColor.key
        ) return <HBox>
            {
                SIMPLE_COLORS
                    .map(c => <button
                        key={c}
                        onClick={()=>onChange(c)}
                        style={{color:c, padding:'1px', margin:0, borderWidth:0,}}
                        className={"fa fa-square"}/> )
            }
        </HBox>

        if(def.key === 'scale') return <ScaleEditor def={def} item={item} onChange={onChange} provider={this}/>
        return <i>no custom editor for {def.key}</i>
    }


    setColor = (color) => {
        if(SelectionManager.isEmpty()) return
        this.accessObject(SelectionManager.getSelection()).set('color',color)
    }

    showAddImageAssetDialog = () => DialogManager.show(<AddImageAssetDialog provider={this}/>)
    showAddAudioAssetDialog = () => DialogManager.show(<AddAudioAssetDialog provider={this}/>)
    showAddGLTFAssetDialog = () =>  DialogManager.show(<AddGLTFAssetDialog provider={this}/>)
    showAddGLBAssetDialog = () =>   DialogManager.show(<AddGLBAssetDialog provider={this}/>)


    accessObject = (id) => {
        return new GraphAccessor(this.getDataGraph()).object(id)
    }
}

class VREditorApp extends Component {

    constructor(props) {
        super(props)

        this.state = {
            mode:'canvas'
        }

        this.im = new InputManager()
        this.im.addKeyBinding({id: 'save', key: InputManager.KEYS.S, modifiers: [InputManager.MODIFIERS.COMMAND]})
        this.im.addKeyBinding({id: 'undo', key: InputManager.KEYS.Z, modifiers: [InputManager.MODIFIERS.COMMAND]})
        this.im.addKeyBinding({
            id: 'redo',
            key: InputManager.KEYS.Z,
            modifiers: [InputManager.MODIFIERS.COMMAND, InputManager.MODIFIERS.SHIFT]
        })
        this.im.addListener('save', this.props.provider.save)
        this.im.addListener('undo', this.props.provider.performUndo)
        this.im.addListener('redo', this.props.provider.performRedo)

        this.im.addKeyBinding({id: 'cut', key: InputManager.KEYS.X, modifiers: [InputManager.MODIFIERS.COMMAND]})
        this.im.addKeyBinding({id: 'copy', key: InputManager.KEYS.C, modifiers: [InputManager.MODIFIERS.COMMAND]})
        this.im.addKeyBinding({id: 'paste', key: InputManager.KEYS.V, modifiers: [InputManager.MODIFIERS.COMMAND]})

        this.im.addListener('cut', this.props.provider.cutSelection)
        this.im.addListener('copy', this.props.provider.copySelection)
        this.im.addListener('paste', this.props.provider.pasteSelection)

    }

    componentDidMount() {
        this.im.attachKeyEvents(document)
        SelectionManager.on(SELECTION_MANAGER.CHANGED,()=>{
            if(!SelectionManager.isEmpty()) {
                const item = this.props.provider.accessObject(SelectionManager.getSelection())
                if(item.type === PROP_DEFS.asset.key) return this.setState({mode:'asset'})
            }
            this.setState({mode:'canvas'})
        })

    }

    showAddPopup = (e) => {
        const acts = Object.keys(OBJ_TYPES).map(type => {
            return {
                title: type,
                icon: ITEM_ICONS[type],
                fun: () => this.props.provider.add3DObject(type)
            }
        })
        PopupManager.show(<MenuPopup actions={acts}/>, e.target)
    }
    showAddAssetPopup = (e) => {
        const acts = [
            {
                title: 'image',
                icon: ITEM_ICONS.image,
                fun: () => this.props.provider.showAddImageAssetDialog()
            },
            {
                title: 'GLTF model',
                icon: ITEM_ICONS.model,
                fun: () => this.props.provider.showAddGLTFAssetDialog()
            },
            { divider:true },
            {
                title: 'GLB model',
                icon: ITEM_ICONS.model,
                fun: () => this.props.provider.showAddGLBAssetDialog()
            },
            {
                title: 'audio file',
                icon: ITEM_ICONS.audio,
                fun: () => this.props.provider.showAddAudioAssetDialog()
            },
        ]
        PopupManager.show(<MenuPopup actions={acts}/>, e.target)
    }

    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle><TreeTable root={prov.getSceneRoot()} provider={prov}/></Panel>

            <Toolbar left bottom>
                <button className={"fa fa-plus"} onClick={this.showAddPopup}>obj</button>
                <button className="fa fa-plus" onClick={prov.addScene}>scene</button>
                <button className={"fa fa-plus"} onClick={this.showAddAssetPopup}>asset</button>
            </Toolbar>


            <Toolbar center top>
                <button className="fa fa-save" onClick={() => prov.save()}></button>
                <button onClick={() => prov.preview()}>preview</button>
                <button onClick={()=>prov.embedView()}> embed</button>
                <button className="fa fa-undo" onClick={prov.performUndo}/>
                <button className="fa fa-repeat" onClick={prov.performRedo}/>
                <Spacer/>
                <button className="fa fa-cut" onClick={prov.cutSelection}/>
                <button className="fa fa-copy" onClick={prov.copySelection}/>
                <button className="fa fa-paste" onClick={prov.pasteSelection}/>
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
            return <VRCanvas provider={this.props.provider}/>
        } else {
            return <AssetView provider={this.props.provider} asset={SelectionManager.getSelection()}/>
        }
    }
}
const EnumTitleRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider) {
        value = props.provider.accessObject(props.value).title
    }
    return <b>{value}</b>
}

const NavTargetRenderer = (props) => {
    let title = '---'
    let action = 'go to'
    let icon = ITEM_ICONS.asset
    if(props.value && props.provider) {
        const obj = props.provider.accessObject(props.value)
        title = obj.title
        if(obj.type === 'scene') icon = ITEM_ICONS.scene
        if(obj.type === 'asset' && obj.subtype === 'audio') {
            icon = ITEM_ICONS.audio
            action = 'play'
        }
    }
    return <div><i className={`fa fa-${icon}`}/> {action} <b>{title}</b></div>
}

class ScaleEditor extends Component {
    constructor(props) {
        super(props)
        this.state = {
            sync:false,
        }
    }
    syncChanged = (e) => this.setState({sync: !this.state.sync})
    changed = (e, key) =>{
        const obj = this.props.provider.accessObject(this.props.item)
        const newvals = {
            sx:obj.sx,
            sy:obj.sy,
            sz:obj.sz
        }
        const val = parseFloat(e.target.value)
        newvals[key] = val
        if(this.state.sync) {
            newvals.sx = val
            newvals.sy = val
            newvals.sz = val
        }
        this.props.onChange(newvals)
    }
    render() {
        const obj = this.props.provider.accessObject(this.props.item)
        return <HBox className="scale-editor">
            <input type="checkbox" checked={this.state.sync} onChange={this.syncChanged}/>
            <input type="number" value={obj.sx} onChange={(e)=>this.changed(e,'sx')} step={0.1}/>
            <input type="number" value={obj.sy} onChange={(e)=>this.changed(e,'sy')} step={0.1}/>
            <input type="number" value={obj.sz} onChange={(e)=>this.changed(e,'sz')} step={0.1}/>
        </HBox>
    }
}


function acceptsModelAsset(type) {
    if(type=== OBJ_TYPES.model) return true
    return false
}
function acceptsImageAsset(type) {
    if(type === OBJ_TYPES.plane
        || type === OBJ_TYPES.bg360
        || type === OBJ_TYPES.img2d
    ) return true
    return false
}
