import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import React, {Component} from 'react'
import GridEditorApp, {MenuPopup, Panel, Spacer, Toolbar} from '../GridEditorApp'
import TreeTable from '../common/TreeTable'
import PropSheet, {TYPES} from '../common/PropSheet'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import {VRCanvas} from './VRCanvas'
import {getAssetsURL, getDocsURL, getScriptsURL, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import ImmersiveVREditor from './ImmersiveVREditor'
import {
    fetchGraphObject, insertAsFirstChild,
    insertAsLastChild,
    listToArray,
} from '../syncgraph/utils'
import CubeDef from "./CubeDef";
import SceneDef from "./SceneDef";
import InputManager from "../common/InputManager";
import {DialogContainer, DialogManager, HBox, PopupContainer, PopupManager, VBox} from "appy-comps"
import {
    ASSET_TYPES, canHaveBehavior, canHaveScene, canHaveShape,
    get3DObjectDef,
    is3DObjectType,
    isGLTFFile,
    isImageType,
    ITEM_ICONS,
    MIME_TYPES,
    OBJ_TYPES, parseBehaviorScript,
    PROP_DEFS,
    SIMPLE_COLORS, TOTAL_OBJ_TYPES
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
import {toQueryString} from '../utils'
import {OpenFileDialog} from './OpenFileDialog'
import {AuthModule, USER_CHANGE} from './AuthModule'
import {OpenAssetDialog} from './OpenAssetDialog'
import ScriptEditor from './ScriptEditor'
import {OpenScriptDialog} from './OpenScriptDialog'
import {CUSTOM_BEHAVIOR_SCRIPT, CUSTOM_SCENE_SCRIPT} from './Templates'
import {addScene, deleteObject, newDoc, showAddPopup} from './Actions'



export default class VREditor extends  SyncGraphProvider {
    constructor(options) {
        super(options)
        this.imagecache = {}
        this.behaviorCache = {}
    }
    getDocType() { return "vr" }
    getApp = () => {
        if(this.mode === 'edit') return <VREditorApp provider={this}/>
        if(this.mode === 'vredit') return <ImmersiveVREditor provider={this} editable={true}/>
        if(this.mode === 'embed-view') return <ImmersiveVREditor provider={this} editable={false}/>
        if(this.mode === 'vrview') return <ImmersiveVREditor provider={this} editable={false}/>
        console.log("no mode!")
    }
    getTitle = () => "VR Builder"
    getDocTitle = () => this.accessObject(this.getSceneRoot()).title
    makeEmptyRoot(doc) {
        //make root
        const root = fetchGraphObject(doc,doc.createObject({ type:TOTAL_OBJ_TYPES.ROOT, title:'Untitled Project', defaultScene:0, children:doc.createArray() }))
        //make scene
        const scene1 = new SceneDef().make(doc,root)
        //make cube
        const obj = new CubeDef().make(doc,scene1)
        //make assets
        const assets = fetchGraphObject(doc,doc.createObject({type:TOTAL_OBJ_TYPES.ASSETS_LIST,
            title:'Assets', children: doc.createArray(), parent:0}))
        //make behaviors
        const behaviors = fetchGraphObject(doc,doc.createObject({type:TOTAL_OBJ_TYPES.BEHAVIORS_LIST,
            title:'Behaviors', children: doc.createArray(), parent:0}))
        //tie it all together
        insertAsFirstChild(doc,root,scene1)
        insertAsFirstChild(doc,scene1,obj)
        insertAsLastChild(doc,root,behaviors)
        insertAsLastChild(doc,root,assets)
    }
    docLoaded = () => {
        console.log("really loaded the doc. caching the behaviors",this.getAssetsObject())
        this.accessObject(this.getBehaviorsObject()).getChildren()
            .filter(a => a.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT)
            .forEach((b)=>{
                console.log("processing behavior",b)
                this.fetchBehaviorAssetContents(b.id).then((contents)=> {
                    try {
                        const info = parseBehaviorScript(contents)
                        info.text = contents
                        this.setCachedBehaviorAsset(b.id, info)
                    } catch (e) {
                        console.error(e)
                    }
                })
            })
    }

    getRendererForItem = (item) => {
        const obj = this.accessObject(item)
        if(!obj.exists()) return <div>???</div>
        if(obj.type === TOTAL_OBJ_TYPES.ASSET) return <div><i className={`fa fa-${ITEM_ICONS[obj.subtype]}`}/> {obj.title}</div>
        if(ITEM_ICONS[obj.type]) return <div><i className={`fa fa-${ITEM_ICONS[obj.type]}`}/> {obj.title}</div>
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

        //show the ID for all objects
        defs.push({
            key:'id',
            name:"ID",
            type:TYPES.STRING,
            value:item,
            locked:true
        })

        const obj = this.accessObject(item)
        //if a behavior object is selected, get the defs from the root behavior asset
        if(obj.type === TOTAL_OBJ_TYPES.BEHAVIOR) {
            const behaviorProps = this.getCachedBehaviorPropDefs(obj.behavior)
            if(behaviorProps) {
                Object.keys(behaviorProps).forEach(pname => {
                    const propdef = behaviorProps[pname]
                    const ndef = {
                        key: pname,
                        name: pname,
                        type: propdef.type,
                        value: obj[pname]
                    }
                    if(propdef.hints) ndef.hints = propdef.hints
                    defs.push(ndef)
                })
            } else {
                console.warn("Missing prop defs for behavior object")
            }
            defs.push({
                key:'behavior',
                name:"Script",
                type:TYPES.STRING,
                value:obj.behavior,
                locked:true,
                custom:true,
            })
        }

        const props = this.syncdoc.getPropertiesForObject(item)
        if(props) {
            props.forEach(key => {
                if(key === 'type') return
                if(key === 'children') return
                if(key === 'parent') return
                const value = this.syncdoc.getPropertyValue(item,key)
                if(PROP_DEFS[key]) {
                    const def = copyPropDef(PROP_DEFS[key],value)
                    if(obj.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT) {
                        if(key === 'title' || key === 'description') def.locked = true
                    }
                    return defs.push(def)
                }
                // console.log("unknown property",key)
            })
        }



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
            if(asset.subtype === ASSET_TYPES.IMAGE) {
                let height = (asset.height / asset.width) * this.accessObject(item).width
                super.setPropertyValue(item, {key: 'height'}, height)
            }
            if(asset.subtype === ASSET_TYPES.GLTF) {
                console.log("adjusting to a gtlf")
            }
        }
    }
    getValuesForEnum(key,obj,def) {
        const realobj = this.accessObject(obj)
        //if this is a property on a behavior, then use the hints to generate a target list
        if(realobj.exists() && realobj.type === TOTAL_OBJ_TYPES.BEHAVIOR) {
            if(def.hasHints()) {
                const hints = def.getHints()
                if(hints.type === 'node') {
                    return this.accessObject(this.getSceneRoot())
                        .find(obj => obj.type === hints.nodeType)
                        .map(ch => ch.id)
                }
            }
        }
        if (key === PROP_DEFS.asset.key) {
            const assets = this.accessObject(this.getAssetsObject()).getChildren()
            if(acceptsModelAsset(realobj.type)) return assets.filter(a => a.subtype === ASSET_TYPES.GLTF).map(a => a.id)
            if(acceptsImageAsset(realobj.type)) return assets.filter(a => a.subtype === ASSET_TYPES.IMAGE).map(a => a.id)
        }
        if(key === PROP_DEFS.horizontalAlign.key) {
            return Object.keys(HORIZONTAL_ALIGNMENT).map(key => HORIZONTAL_ALIGNMENT[key])
        }
        if(key === PROP_DEFS.defaultScene.key) {
            return this.accessObject(this.getSceneRoot()).getChildren()
                .filter(ch => ch.type === TOTAL_OBJ_TYPES.SCENE)
                .map(ch => ch.id)
        }
        if(key === PROP_DEFS.texture.key) {
            let assets = this.accessObject(this.getAssetsObject()).getChildren()
            assets = assets.filter(a => a.subtype === ASSET_TYPES.IMAGE).map(a => a.id)
            return assets
        }
    }
    getRendererForEnum(key,obj) {
        const realobj = this.accessObject(obj)
        if(realobj.exists() && realobj.type === TOTAL_OBJ_TYPES.BEHAVIOR) return EnumTitleRenderer
        switch(key) {
            case PROP_DEFS.asset.key: return EnumTitleRenderer
            case PROP_DEFS.defaultScene.key: return EnumTitleRenderer
            case PROP_DEFS.texture.key: return EnumTitleRenderer
            default: return null
        }
    }

    getSelectedScene() {
        const sel = SelectionManager.getSelection()
        if(sel === null) return this.accessObject(this.getSceneRoot()).child(0)
        const selected = this.accessObject(sel)
        if(selected.type === TOTAL_OBJ_TYPES.SCENE) return selected
        if(is3DObjectType(selected.type))  return this.accessObject(selected.parent)
        if(selected.type === TOTAL_OBJ_TYPES.BEHAVIOR) return this.accessObject(selected.parent).parent
        return -1
    }
    getAssetsObject = () => this.getDataGraph().getObjectByProperty('type',TOTAL_OBJ_TYPES.ASSETS_LIST)
    getBehaviorsObject = () => this.getDataGraph().getObjectByProperty('type',TOTAL_OBJ_TYPES.BEHAVIORS_LIST)

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

    editInVR = () => {
        const opts = Object.assign({},this.options,{mode:'vredit', switcher:false})
        window.open(`./?${toQueryString(opts)}`)
    }

    viewInVR = () => {
            const opts = Object.assign({}, this.options, {mode: 'play', switcher: false})
            window.open(`./?${toQueryString(opts)}`)
    }

    embedView = () => {
        DialogManager.show(<MakeEmbedDialog provider={this}/>)
    }

    add3DObject = (type, parent) => {
        const obj = get3DObjectDef(type).make(this.getDataGraph(),parent)
        parent.insertFirstChild(obj)
        SelectionManager.setSelection(obj.id)
        ToasterMananager.add('added '+type)
    }

    addImageAssetFromFile = (file) => {
        ToasterMananager.add('uploading ' + file.name)
        this.uploadFile(file).then((ans)=>{
            ToasterMananager.add('uploaded')
            if(ans.success === false) return console.log("there was an error uploading! :(")
            return this.addImageAssetFromExpandedURL(getAssetsURL()+ans.asset.id, ans.asset.mimeType, file.name)
        })
    }
    addImageAssetFromURL = (url) => {
        //TODO: make this format detection code more robust
        const name = url.substring(url.lastIndexOf('/') + 1)
        const type = name.substring(name.lastIndexOf(".") + 1)
        let fileType = "image/unknown"
        if (type.toLowerCase() === 'png') fileType = MIME_TYPES.PNG
        if (type.toLowerCase() === 'jpg') fileType = MIME_TYPES.JPEG
        if (type.toLowerCase() === 'jpeg') fileType = MIME_TYPES.JPEG
        return this.addImageAssetFromExpandedURL(url, fileType, name)
    }
    addImageAssetFromExpandedURL(url,format,title) {
        const asset = this.accessObject(this.getDataGraph().createObject({
            type:TOTAL_OBJ_TYPES.ASSET,
            subtype:ASSET_TYPES.IMAGE,
            format:format,
            src:url,
            width:100,
            height:100,
            title:title,
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
            if(ans.success === false) return console.log("there was an error uploading! :(")
            const url = getAssetsURL()+ans.asset.id
            const graph = this.getDataGraph()
            const asset = fetchGraphObject(graph,graph.createObject({
                type:TOTAL_OBJ_TYPES.ASSET,
                subtype:ASSET_TYPES.AUDIO,
                format:ans.asset.mimeType,
                src:url,
                title:file.name,
                parent:0
            }))
            this.accessObject(this.getAssetsObject()).insertChildLast(asset)
        })
    }

    addAudioAssetFromURL = (url, fileType, name) => {
        //TODO: make this format detection code more robust
        if(!name) {
            name = url.substring(url.lastIndexOf('/') + 1)
        }
        if(!fileType) {
            const type = name.substring(name.lastIndexOf(".") + 1)
            fileType = "audio/unknown"
            if(type.toLowerCase() === 'mp3') fileType = MIME_TYPES.MP3
            if(type.toLowerCase() === 'aac') fileType = MIME_TYPES.AAC
        }

        const graph = this.getDataGraph()
        const asset = fetchGraphObject(graph,graph.createObject({
            type: TOTAL_OBJ_TYPES.ASSET,
            subtype:ASSET_TYPES.AUDIO,
            format:fileType,
            src:url,
            title:name,
            parent:0
        }))
        this.accessObject(this.getAssetsObject()).insertChildLast(asset)
    }
    addBehaviorAssetFromURL = (info) => {
        const graph = this.getDataGraph()
        const behavior = fetchGraphObject(graph,graph.createObject({
            type:TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT,
            title:info.title,
            description:info.description,
            src:info.url,
            parent:0
        }))
        this.accessObject(this.getBehaviorsObject()).insertChildLast(behavior)
        SelectionManager.setSelection(behavior.id)
    }
    removeBehaviorAssetSource(name) {
        const url = `${getScriptsURL()}delete/${name}`
        console.log("removing",url)
        return fetch(url,{
            method:'POST',
            mode:'cors',
            cache: 'no-cache',
            body:name
        }).then(res => res.json())
            .then(res => {
                return res
            })
    }
    addGLBAssetFromFile = (file) => {
        ToasterMananager.add('uploading')
        this.uploadFile(file).then((ans)=>{
            ToasterMananager.add('uploaded')
            console.log("uploaded file with answer",ans)
            const url = getAssetsURL()+ans.id
            const graph = this.getDataGraph()
            const asset = fetchGraphObject(graph,graph.createObject({
                type:TOTAL_OBJ_TYPES.ASSET,
                subtype:ASSET_TYPES.GLTF,
                format:MIME_TYPES.GLB,
                src:url,
                title:file.name,
                parent:0
            }))
            this.accessObject(this.getAssetsObject()).insertChildLast(asset)
        })
    }

    addCustomBehaviorAsset = (TEMPLATE) => {
        const randi = (Math.floor(Math.random()*100000000))
        const fname =`behavior_${randi}.js`
        const url = `${getScriptsURL()}${fname}`;
        const contents = TEMPLATE?TEMPLATE:CUSTOM_BEHAVIOR_SCRIPT
        console.log("posting to",url)
        return fetch(url,{
            method:'POST',
            mode:'cors',
            cache: 'no-cache',
            body:contents
        })
            .then(res => res.json())
            .then(ans => {
                console.log("got back the answer",ans)
                const graph = this.getDataGraph()
                const behavior = fetchGraphObject(graph,graph.createObject({
                    type:TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT,
                    title:ans.script.title,
                    description:ans.script.description,
                    src:url,
                    parent:0
                }))
                this.accessObject(this.getBehaviorsObject()).insertChildLast(behavior)
                SelectionManager.setSelection(behavior.id)
                return behavior

            })
            .catch(err => console.error(err))
    }

    addSceneScript = (obj) => {
        this.addCustomBehaviorAsset(CUSTOM_SCENE_SCRIPT)
            .then((b)=>this.addBehaviorToObject(b,obj))
    }

    addBehaviorToObject = (b,item) => {
        return this.fetchBehaviorAssetContents(b.id).then((contents)=>{
            try {
                const def = {
                    type: TOTAL_OBJ_TYPES.BEHAVIOR,
                    title: b.title,
                    description: b.description,
                    parent: 0,
                    behavior:b.id,
                }
                const obj = parseBehaviorScript(contents)
                this.setCachedBehaviorAsset(b.id,obj)
                //copy properties to the behavior def
                if(obj.properties) {
                    Object.keys(obj.properties).forEach(name => {
                        def[name] = obj.properties[name].value
                    })
                }
                const graph = this.getDataGraph()
                const behavior = fetchGraphObject(graph, graph.createObject(def))
                this.accessObject(item).insertChildLast(behavior)
                return behavior
            } catch (e) {
                console.error(e)
            }
        })
    }

    calculateContextMenu(item) {
        const cmds = []
        cmds.push({ title:'delete', icon:ITEM_ICONS.delete, fun: ()=>deleteObject(this) });
        const obj = this.accessObject(item)
        if(canHaveShape(obj.type)) {
            cmds.push({ divider:true })
            Object.keys(OBJ_TYPES).forEach(type => cmds.push({
                title: type,
                icon: ITEM_ICONS[type],
                fun: () => this.add3DObject(type,obj)
            }))
        }
        if(canHaveScene(obj.type)) {
            cmds.push({title: 'scene', icon: ITEM_ICONS.scene, fun: ()=>addScene(this)})
        }

        if(canHaveBehavior(obj.type)) {
            cmds.push({ divider:true })
            this.accessObject(this.getBehaviorsObject()).getChildren()
                .filter(a => a.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT)
                .forEach((b) => {
                    cmds.push({
                        title: b.title,
                        icon: ITEM_ICONS.behavior_script,
                        fun: () => this.addBehaviorToObject(b, item)
                    })
                })
        }
        if(obj.type === TOTAL_OBJ_TYPES.SCENE) {
            cmds.push({ divider:true })
            cmds.push({title:'Add Scene script', icon:ITEM_ICONS.behavior, fun: ()=>this.addSceneScript(item)})
        }


        if(obj.type === TOTAL_OBJ_TYPES.BEHAVIOR) {
            cmds.push({ divider:true })
            cmds.push({title:'view code', icon: ITEM_ICONS.behavior, fun: ()=>SelectionManager.setSelection(obj.behavior)})
        }

        if(obj.type !== TOTAL_OBJ_TYPES.ROOT) {
            cmds.push({divider: true})
            cmds.push({title: 'cut', icon: ITEM_ICONS.cut, fun: this.cutSelection})
            cmds.push({title: 'copy', icon: ITEM_ICONS.copy, fun: this.copySelection})
            cmds.push({title: 'paste', icon: ITEM_ICONS.paste, fun: this.pasteSelection})
        }
        return cmds
    }

    cutSelection = (e) => {
        if(e && e.target) {
            if (e.target.getAttribute('type') === 'input') return
            if (e.target.nodeName === 'INPUT') return
            if (e.target.nodeName === 'TEXTAREA') return
        }
        if(SelectionManager.isEmpty()) return
        const obj = this.accessObject(SelectionManager.getSelection())
        SelectionManager.setClipboard(obj.id)
        obj.removeFromParent()
        SelectionManager.clearSelection()
    }
    copySelection = (e) => {
        if(e && e.target) {
            if (e.target.getAttribute('type') === 'input') return
            if (e.target.nodeName === 'INPUT') return
            if (e.target.nodeName === 'TEXTAREA') return
        }
        if(SelectionManager.isEmpty()) return
        const obj = this.accessObject(SelectionManager.getSelection())
        SelectionManager.setClipboard(obj.id)
    }
    pasteSelection = (e) => {
        //don't intercept if this is a paste into a text field
        if(e && e.target) {
            if (e.target.getAttribute('type') === 'input') return
            if (e.target.nodeName === 'INPUT') return
            if (e.target.nodeName === 'TEXTAREA') return
        }
        const obj1 = this.accessObject(SelectionManager.getClipboard())
        let parent = null
        if(is3DObjectType(obj1.type)) parent = this.getSelectedScene()
        if(obj1.type === 'scene') parent = this.accessObject(this.getSceneRoot())
        if (!parent) return console.error("no parent to ad too! bad obj type?",obj1.type)
        parent.insertChildLast(obj1.clone())
    }

    canBeMoved(node) {
        const p = this.accessObject(node)
        if(p.type === TOTAL_OBJ_TYPES.ROOT) return false
        if(p.type === TOTAL_OBJ_TYPES.BEHAVIORS_LIST) return false
        if(p.type === TOTAL_OBJ_TYPES.ASSETS_LIST) return false
        return true
    }
    canAddChild(parent,child) {
        const p = this.accessObject(parent)
        const c = this.accessObject(child)
        if(p.type === TOTAL_OBJ_TYPES.ROOT && c.type === TOTAL_OBJ_TYPES.SCENE) return true
        if(p.type === TOTAL_OBJ_TYPES.SCENE && is3DObjectType(c.type)) return true
        if(p.type === OBJ_TYPES.group && is3DObjectType(c.type)) return true
        return false
    }
    canBeSibling(src,tgt) {
        const s = this.accessObject(src)
        const t = this.accessObject(tgt)
        if(s.type === TOTAL_OBJ_TYPES.SCENE && t.type === TOTAL_OBJ_TYPES.SCENE) return true
        if(is3DObjectType(s.type) && is3DObjectType(t.type)) return true
        return false
    }
    canAddExternalChild(parent,child) {
        const obj = this.accessObject(parent)
        if(obj.type === TOTAL_OBJ_TYPES.ASSETS_LIST) return true
        return false
    }
    acceptDrop(e,tgt) {
        const obj = this.accessObject(tgt)
        if(obj.type === TOTAL_OBJ_TYPES.ASSETS_LIST) {
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
        if(def.key === 'behavior') return <button onClick={()=>SelectionManager.setSelection(value)}>view code</button>
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
    showOpenDocumentDialog = () => DialogManager.show(<OpenFileDialog provider={this}/>)
    showOpenAssetDialog = () => DialogManager.show(<OpenAssetDialog provider={this}/>)
    showAddServerImageDialog = () =>  DialogManager.show(<OpenAssetDialog provider={this} filter={a => isImageType(a.mimeType)}/>)
    showOpenBehaviorDialog = () => DialogManager.show(<OpenScriptDialog provider={this}/>)

    accessObject = (id) => {
        return new GraphAccessor(this.getDataGraph()).object(id)
    }

    loadDocList() {
        return fetch(`${getDocsURL()}list`,{
            method:'GET',
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                "access-key": AuthModule.getAccessToken()
            }
        })
            .then(res=>res.json())
    }
    loadAssetList() {
        return fetch(`${getAssetsURL()}list`,{
            method:'GET',
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                "access-key": AuthModule.getAccessToken()
            }
        })
            .then(res=>res.json())
    }
    removeAssetSource(info) {
        console.log("removing",info)
        return fetch(`${getAssetsURL()}delete/${info.id}`,{
            method:'POST',
            mode:'cors',
            cache: 'no-cache',
            body:info.id
        }).then(res => res.json())
    }
    loadScriptList() {
        return fetch(`${getScriptsURL()}list`,{
            method:'GET',
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                "access-key": AuthModule.getAccessToken()
            }
        })
            .then(res=>res.json())
    }

    fetchBehaviorAssetContents(id) {
        const obj = this.accessObject(id)
        return fetch(obj.src).then(res => res.text())
    }
    updateBehaviorAssetContents(id,text) {
        //update the cache first
        const info = parseBehaviorScript(text)
        info.text = text
        this.setCachedBehaviorAsset(id, info)

        const obj = this.accessObject(id)
        return fetch(obj.src,{
            method:'POST',
            mode:'cors',
            cache: 'no-cache',
            body:text
        }).then(res => res.json())
            .then(ans => {
                obj.set('title',ans.script.title)
                obj.set('description',ans.script.description)


            })
    }

    getCachedBehaviorPropDefs(behavior) {
        if(!this.behaviorCache[behavior]) {
            console.error("no parsed behavior in the cache",behavior)
            return null
        }
        return this.behaviorCache[behavior].properties;
    }

    getCachedBehaviorAsset(id) {
        return this.behaviorCache[id]
    }

    setCachedBehaviorAsset(id, asset) {
        this.behaviorCache[id] = asset
    }
}

class VREditorApp extends Component {

    constructor(props) {
        super(props)

        this.state = {
            mode:'canvas',
            user:null,
            running:false,
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
        SelectionManager.on(SELECTION_MANAGER.CHANGED,this.selectionChanged)
        AuthModule.on(USER_CHANGE,()=>this.setState({user:AuthModule.getUsername()}))
    }
    componentWillUnmount() {
        SelectionManager.off(SELECTION_MANAGER.CHANGED,this.selectionChanged)
    }

    selectionChanged = () => {
        if(!SelectionManager.isEmpty()) {
            const item = this.props.provider.accessObject(SelectionManager.getSelection())
            if(item.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT) return this.setState({mode:'script'})
            if(item.type === PROP_DEFS.asset.key) return this.setState({mode:'asset'})
        }
        this.setState({mode:'canvas'})
    }

    showAddAssetPopup = (e) => {
        let acts = []
        // console.log("Auth mod",AuthModule.supportsAssetUpload())
        if(AuthModule.supportsAssetUpload()) {
            acts = acts.concat([{
                title: 'image',
                icon: ITEM_ICONS.image,
                fun: () => this.props.provider.showAddImageAssetDialog()
            },
            {
                title: 'server image',
                icon: ITEM_ICONS.image,
                fun: () => this.props.provider.showAddServerImageDialog()
            },
                {divider: true},
            {
                title: 'GLTF model',
                icon: ITEM_ICONS.model,
                fun: () => this.props.provider.showAddGLTFAssetDialog()
            },
            {
                title: 'GLB model',
                icon: ITEM_ICONS.model,
                fun: () => this.props.provider.showAddGLBAssetDialog()
            },
                {divider: true},
            {
                title: 'audio file',
                icon: ITEM_ICONS.audio,
                fun: () => this.props.provider.showAddAudioAssetDialog()
            }])
        }

        acts.push({
            title: 'existing asset on server',
            icon: ITEM_ICONS.assets,
            fun: () => this.props.provider.showOpenAssetDialog()
        })

        PopupManager.show(<MenuPopup actions={acts}/>, e.target)
    }

    showAddActionPopup = (e) => {
        const acts = [
            {
                title:'behavior from template',
                icon: ITEM_ICONS.behavior_script,
                fun: () => this.props.provider.showOpenBehaviorDialog()
            },
            {
                title:'custom behavior',
                icon: ITEM_ICONS.behavior_script,
                fun: () => this.props.provider.addCustomBehaviorAsset()
            }
        ]
        PopupManager.show(<MenuPopup actions={acts}/>, e.target)
    }

    toggleRunning = () => {
        this.setState({running:!this.state.running})
    }

    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle><TreeTable root={prov.getSceneRoot()} provider={prov}/></Panel>

            <Toolbar left bottom>
                <button className={"fa fa-cube"} onClick={(e)=>showAddPopup(e,prov)}/>
                <button className="fa fa-globe" onClick={()=>addScene(prov)}/>
                <button className="fa fa-archive" onClick={this.showAddAssetPopup}/>
                <button className="fa fa-superpowers" onClick={this.showAddActionPopup}/>
            </Toolbar>


            <Toolbar center top>
                <button className="fa fa-file" onClick={() => newDoc(prov)} title={'new project'}></button>
                <button className="fa fa-save" onClick={() => prov.save()} title={'save project'}></button>
                <button onClick={() => prov.editInVR()}>VR Edit</button>
                <button onClick={() => prov.viewInVR()}>VR View</button>
                {/*<button onClick={()=>prov.embedView()}>Embed</button>*/}
                <Spacer/>
                <RunButton onClick={this.toggleRunning} active={this.state.running}/>
                <Spacer/>
                <button className="fa fa-cut" onClick={prov.cutSelection}/>
                <button className="fa fa-copy" onClick={prov.copySelection}/>
                <button className="fa fa-paste" onClick={prov.pasteSelection}/>
                <button className="fa fa-undo" onClick={prov.performUndo}/>
                <button className="fa fa-repeat" onClick={prov.performRedo}/>
            </Toolbar>


            <Panel center middle scroll>
                {this.renderCenterPane(this.state.mode)}
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>


            <Toolbar right top>
                {this.renderLoginButton()}
            </Toolbar>
            <Toolbar right bottom>
            </Toolbar>
            <DialogContainer/>
            <PopupContainer/>

        </GridEditorApp>
    }
    renderCenterPane(mode) {
        if (mode === 'script') return <ScriptEditor provider={this.props.provider}/>
        if (mode === 'canvas') return <VRCanvas provider={this.props.provider} running={this.state.running}/>
        return <AssetView provider={this.props.provider} asset={SelectionManager.getSelection()}/>
    }

    renderLoginButton() {
        const buttons = []

        if(AuthModule.supportsAuth()) {
            if(AuthModule.isLoggedIn()) {
                buttons.push(<button key="logout" className="fa fa-user" onClick={AuthModule.logout}>logout</button>)
            } else {
                buttons.push(<button key="login" className="fa fa-user" onClick={AuthModule.login} title={'login'}></button>)
            }
        }
        if(AuthModule.supportsDocList()) {
            buttons.push(<button key="open" className="fa fa-folder-open" onClick={this.props.provider.showOpenDocumentDialog} title={"open"}></button>)
        }
        return buttons
    }
}
const EnumTitleRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider) {
        value = props.provider.accessObject(props.value).title
    }
    return <b>{value}</b>
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

const RunButton = (props) => {
    const clss = props.active?"run-button active fa fa-stop":"run-button fa fa-play"
    return <button onClick={props.onClick} className={clss}></button>
}