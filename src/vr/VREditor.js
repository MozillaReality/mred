import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import React, {Component} from 'react'
import GridEditorApp, {Panel, Spacer, Toolbar} from '../common/GridEditorApp'
import TreeTable from '../common/TreeTable'
import PropSheet, {TYPES} from '../common/PropSheet'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'
import {VRCanvas} from './VRCanvas'
import {getAssetsURL, getDocsURL, getScriptsURL, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import ImmersiveVREditor from './ImmersiveVREditor'
import {fetchGraphObject, insertAsFirstChild, insertAsLastChild, listToArray} from '../syncgraph/utils'
import CubeDef from "./defs/CubeDef"
import SceneDef from "./defs/SceneDef"
import InputManager from "../common/InputManager"
import {DialogContainer, DialogManager, HBox, PopupContainer} from "appy-comps"
import {
    ASSET_TYPES,
    canBeDeleted,
    canHaveBehavior,
    canHaveScene,
    canHaveShape,
    get3DObjectDef,
    HORIZONTAL_ALIGNMENT,
    is3DObjectType,
    isGLTFFile,
    isImageType,
    ITEM_ICONS,
    NONE_ASSET,
    OBJ_TYPES,
    parseBehaviorScript,
    PROP_DEFS,
    REC_TYPES,
    SIMPLE_COLORS,
    TOTAL_OBJ_TYPES
} from './Common'
import {AddImageAssetDialog} from './dialogs/AddImageAssetDialog'
import {AddGLTFAssetDialog} from './dialogs/AddGLTFAssetDialog'
import {AddGLBAssetDialog} from './dialogs/AddGLBAssetDialog'
import {AddAudioAssetDialog} from './dialogs/AddAudioAssetDialog'
import {UnsavedDocumentDialog} from "./dialogs/UnsavedDocumentDialog"
import AssetView from '../metadoc/AssetView'
import * as ToasterMananager from './ToasterManager'
import GraphAccessor from "../syncgraph/GraphAccessor"
import {toQueryString} from '../utils'
import {OpenFileDialog} from './dialogs/OpenFileDialog'
import {AuthModule, CONNECTED, USER_CHANGE} from './AuthModule'
import {OpenAssetDialog} from './dialogs/OpenAssetDialog'
import ScriptEditor from './ScriptEditor'
import {OpenScriptDialog} from './dialogs/OpenScriptDialog'
import {CUSTOM_BEHAVIOR_SCRIPT, CUSTOM_SCENE_SCRIPT} from './Templates'
import {
    addScene,
    deleteObject,
    generateAddAssetPopup,
    newDoc,
    showAddAssetPopup,
    showAddBehaviorPopup,
    showAddPopup
} from './Actions'
import {addGeoAnchorAsset, addGLBAssetFromFile, addImageAssetFromFile} from './AssetActions'
import {QRDialog} from './dialogs/QRDialog'
import {PasswordDialog} from './dialogs/PasswordDialog'
import {GithubAuthDialog} from './dialogs/GithubAuthDialog'
import {ErrorCatcher} from './ErrorCatcher'
import {AssetsManager} from './AssetsManager'
import {ConsoleLogger} from '../syncgraph/PubnubSyncWrapper'


export default class VREditor extends SyncGraphProvider {
    constructor(options) {
        super(options)
        this.imagecache = {}
        this.behaviorCache = {}
        this.orbit_state = {}
        this.assetsManager = new AssetsManager(this)
    }
    getDocType() { return "vr" }
    getApp = () => {
        if(this.mode === 'edit') return <VREditorApp provider={this}/>
        if(this.mode === 'vredit') return <ImmersiveVREditor provider={this} editable={true}/>
        if(this.mode === 'embed-view') return <ImmersiveVREditor provider={this} editable={false}/>
        if(this.mode === 'vrview') return <ImmersiveVREditor provider={this} editable={false}/>
        console.log("no mode!")
    }
    getTitle = () => "MrEd"
    getDocTitle = () => this.accessObject(this.getSceneRoot()).title
    getLogger = () => {
        if(this.pubnub) return this.pubnub.getLogger()
        return new ConsoleLogger()
    }

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
        //pre-cache all of the behaviors
        this.accessObject(this.getBehaviorsObject()).getChildren()
            .filter(a => a.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT)
            .forEach((b)=>{
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
        //get a list of assets for calculating the correct URLS.
        return this.assetsManager.cacheAssetsList()
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
                    if(obj.type === TOTAL_OBJ_TYPES.ASSET && obj.subtype === ASSET_TYPES.IMAGE) {
                        if(key === 'width' || key === 'height') def.locked = true
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
                if(hints.type === 'audio') {
                    return this.accessObject(this.getAssetsObject()).getChildren().filter(a => a.subtype === ASSET_TYPES.AUDIO).map(a => a.id)
                }
                if(hints.type === 'video') {
                    return this.accessObject(this.getAssetsObject()).getChildren().filter(a => a.subtype === ASSET_TYPES.VIDEO).map(a => a.id)
                }
            }
        }

        if (key === PROP_DEFS.asset.key) {
            const assets = this.accessObject(this.getAssetsObject()).getChildren()
            if(acceptsImageAsset(realobj.type) && acceptsVideoAsset(realobj.type)) return withNone(assets.filter(a => a.subtype === ASSET_TYPES.VIDEO || a.subtype === ASSET_TYPES.IMAGE).map(a => a.id))
            if(acceptsVideoAsset(realobj.type)) return withNone(assets.filter(a => a.subtype === ASSET_TYPES.VIDEO).map(a => a.id))
            if(acceptsModelAsset(realobj.type)) return withNone(assets.filter(a => a.subtype === ASSET_TYPES.GLTF).map(a => a.id))
            if(acceptsImageAsset(realobj.type)) return withNone(assets.filter(a => a.subtype === ASSET_TYPES.IMAGE).map(a => a.id))
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
            return withNone(assets)
        }
        if(key === PROP_DEFS.targetImage.key) {
            let assets = this.accessObject(this.getAssetsObject()).getChildren()
            assets = assets.filter(a => a.subtype === ASSET_TYPES.IMAGE).map(a => a.id)
            return assets
        }
        if(key === PROP_DEFS.targetGeoLocation.key) {
            let assets = this.accessObject(this.getAssetsObject()).getChildren()
            assets = assets.filter(a => a.subtype === ASSET_TYPES.GEOLOCATION).map(a => a.id)
            return assets
        }
        if(key === PROP_DEFS.recType.key) {
            return Object.keys(REC_TYPES)
        }
    }
    getRendererForEnum(key,obj) {
        const realobj = this.accessObject(obj)
        if(realobj.exists() && realobj.type === TOTAL_OBJ_TYPES.BEHAVIOR) return EnumTitleRenderer
        switch(key) {
            case PROP_DEFS.asset.key: return EnumTitleRenderer
            case PROP_DEFS.defaultScene.key: return EnumTitleRenderer
            case PROP_DEFS.texture.key: return EnumTitleRenderer
            case PROP_DEFS.targetImage.key: return EnumTitleRenderer
            case PROP_DEFS.targetGeoLocation.key: return EnumTitleRenderer
            default: return null
        }
    }

    getSelectedSceneObject() {
        const sel = SelectionManager.getSelection()
        if(sel === null) return this.getFirstSceneObject()
        const selected = this.accessObject(sel)
        if(selected.type === TOTAL_OBJ_TYPES.SCENE) return selected
        if(is3DObjectType(selected.type))  return this.findSceneObjectParent(selected)
        if(selected.type === TOTAL_OBJ_TYPES.BEHAVIOR) return this.findSceneObjectParent(selected)
        return null
    }
    getFirstSceneObject() {
        return this.accessObject(this.getSceneRoot()).getChildren()[0]
    }
    findSceneObjectParent(obj) {
        if(obj === null) return null
        if(!obj.exists()) return null
        if(obj.type === TOTAL_OBJ_TYPES.SCENE) return obj
        obj = this.accessObject(obj.parent)
        return this.findSceneObjectParent(obj)
    }

    getAssetsObject = () => this.getDataGraph().getObjectByProperty('type',TOTAL_OBJ_TYPES.ASSETS_LIST)
    getBehaviorsObject = () => this.getDataGraph().getObjectByProperty('type',TOTAL_OBJ_TYPES.BEHAVIORS_LIST)

    quick_setPropertyValue(item, key, value) {
        const ov = this.getDataGraph().getPropertyValue(item,key)
        const op = this.cmd.setProperty(item,key,value)
        op.prevValue = ov
        if(op.value === op.prevValue) return
        this.getRawGraph().process(op)
        //TODO: this should be fired through the graph already. I shouldn't need to fire this
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,{
            provider: this,
            child:item,
            propKey:key,
            oldValue:ov,
            newValue:value
        })
    }

    editIn2D = () => {
        this.save().then(()=>{
            const opts = Object.assign({},this.options,{mode:'edit', switcher:false, doc:this.getDocId()})
            const loc = document.location
            const url = `${loc.protocol}//${loc.host}${loc.pathname}?${toQueryString(opts)}`
            DialogManager.show(<QRDialog text={"Edit in 2D"} url={url}/>)
        })
    }

    editInVR = () => {
        this.save().then(()=>{
            const opts = Object.assign({},this.options,{mode:'vredit', switcher:false, doc:this.getDocId()})
            const loc = document.location
            const url = `${loc.protocol}//${loc.host}${loc.pathname}?${toQueryString(opts)}`
            DialogManager.show(<QRDialog text={"Edit in AR/VR"} url={url}/>)
        })
    }

    viewInVR = () => {
        this.save().then(()=> {
            const opts = Object.assign({}, this.options, {mode: 'play', switcher: false, doc:this.getDocId()})
            const loc = document.location
            const url = `${loc.protocol}//${loc.host}${loc.pathname}?${toQueryString(opts)}`
            DialogManager.show(<QRDialog text={"View in AR/VR"} url={url}/>)
        })
    }


    add3DObject = (type, parent) => {
        const obj = get3DObjectDef(type).make(this.getDataGraph(),parent)
        parent.insertFirstChild(obj)
        SelectionManager.setSelection(obj.id)
        ToasterMananager.add('added '+type)
    }

    calculateContextMenu(item) {
        const cmds = []
        const obj = this.accessObject(item)
        if(canBeDeleted(obj.type)) {
            cmds.push({title: 'delete', icon: ITEM_ICONS.delete, fun: () => deleteObject(this)});
        }
        if(obj.type === TOTAL_OBJ_TYPES.ASSETS_LIST) {
            return generateAddAssetPopup(this)
        }
        if(obj.type === TOTAL_OBJ_TYPES.BEHAVIORS_LIST) {
            cmds.push({
                title:'Add Behavior from Server',
                enabled:AuthModule.isLoggedIn(),
                icon: ITEM_ICONS.behavior_script,
                fun: () => this.showOpenBehaviorDialog()
            })
        }
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
                cmds.push({
                    title: 'Add Behavior from server',
                    icon: ITEM_ICONS.behavior_script,
                    enabled:AuthModule.isLoggedIn(),
                    fun: () => {
                        DialogManager.show(<OpenScriptDialog provider={this} onAdd={(beh)=>{
                            this.addBehaviorToObject(beh,item).then(b=>{
                                SelectionManager.setSelection(b.id)
                            })
                        }}/>)
                    }
                })
        }
        if(obj.type === TOTAL_OBJ_TYPES.SCENE) {
            cmds.push({ divider:true })
            if(AuthModule.scriptEditingSupported) {
                cmds.push({title: 'Add Scene script', icon: ITEM_ICONS.behavior, fun: () => this.addSceneScript(item)})
            }
        }


        if(obj.type === TOTAL_OBJ_TYPES.BEHAVIOR) {
            cmds.push({ divider:true })
            cmds.push({title:'view code', icon: ITEM_ICONS.behavior, fun: ()=>SelectionManager.setSelection(obj.behavior)})
        }

        if(canBeDeleted(obj.type)) {
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
        if(is3DObjectType(obj1.type)) parent = this.getSelectedSceneObject()
        if(obj1.type === 'scene') parent = this.accessObject(this.getSceneRoot())
        if (!parent) return console.error("no parent to ad too! bad obj type?",obj1.type)
        parent.insertChildLast(obj1.clone())
    }

    // ============ drag and drop ============
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
        if(is3DObjectType(p.type) && c.type === TOTAL_OBJ_TYPES.BEHAVIOR) return true
        if(canHaveShape(p.type) && is3DObjectType(c.type)) return true
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
                if(isImageType(file.type)) return addImageAssetFromFile(file,this)
                if(isGLTFFile(file)) return addGLBAssetFromFile(file,this)
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
            || def.key === PROP_DEFS.startColor.key
            || def.key === PROP_DEFS.endColor.key
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
    showAddGLTFAssetDialog  = () => DialogManager.show(<AddGLTFAssetDialog provider={this}/>)
    showAddGLBAssetDialog   = () => DialogManager.show(<AddGLBAssetDialog provider={this}/>)
    showOpenDocumentDialog  = () => DialogManager.show(<OpenFileDialog provider={this}/>)
    showOpenAssetDialog     = () => DialogManager.show(<OpenAssetDialog provider={this}/>)
    showAddServerImageDialog= () => DialogManager.show(<OpenAssetDialog provider={this} filter={a => isImageType(a.mimeType)}/>)
    showOpenBehaviorDialog  = () => DialogManager.show(<OpenScriptDialog provider={this}/>)
    showAddGeoLocationAssetDialog = () => {
        addGeoAnchorAsset({
            latitude:0,
            longitude:0,
            altitude:0,
            useAltitude:false,
        },"new geo location",this)
    }
    showPasswordDialog = () => DialogManager.show(<PasswordDialog provider={this}/>)
    showGithubDialog = () => DialogManager.show(<GithubAuthDialog provider={this}/>)

    accessObject = (id) => {
        return new GraphAccessor(this.getDataGraph()).object(id)
    }

    loadDocList() {
        return AuthModule.getJSON(`${getDocsURL()}list`)
    }
    removeDoc(doc) {
        return AuthModule.fetch(`${getDocsURL()}delete/${doc.id}`,{
            method:'POST',
            body:doc.id,
        }).then(res => res.json())
    }
    loadAssetList() {
        return AuthModule.getJSON(`${getAssetsURL()}list`)
    }
    removeAssetSource(info) {
        return AuthModule.fetch(`${getAssetsURL()}delete/${info.id}`,{
            method:'POST',
            body:info.id,
        }).then(res => res.json())
    }
    loadScriptList() {
        return AuthModule.getJSON(`${getScriptsURL()}list`)
    }


    // ======== behaviors ===============
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
        return behavior
    }
    removeBehaviorAssetSource(name) {
        const url = `${getScriptsURL()}delete/${name}`
        console.log("removing",url)
        return AuthModule.fetch(url,{
            method:'POST',
            body:name,
        }).then(res => res.json())
    }
    addCustomBehaviorAsset = (TEMPLATE) => {
        const randi = (Math.floor(Math.random()*100000000))
        const fname =`behavior_${randi}.js`
        const url = `${getScriptsURL()}${fname}`;
        const contents = TEMPLATE?TEMPLATE:CUSTOM_BEHAVIOR_SCRIPT
        console.log("posting it to",url)
        return AuthModule.fetch(url,{
            method:'POST',
            body:contents,
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
    fetchBehaviorAssetContents(id) {
        const obj = this.accessObject(id)
        const url = getScriptsURL()+obj.src
        return AuthModule.fetch(url,{
            method:'GET',
        }).then(res => res.text())
    }
    updateBehaviorAssetContents(id,text) {
        if(!AuthModule.supportsScriptEdit()) return
        //update the cache first
        try {
            const info = parseBehaviorScript(text)
            info.text = text
            this.setCachedBehaviorAsset(id, info)

            const obj = this.accessObject(id)
            const url = getScriptsURL() + obj.src
            return AuthModule.fetch(url, {
                method: 'POST',
                body: text,
            }).then(res => res.json())
                .then(ans => {
                    obj.set('title', ans.script.title)
                    obj.set('description', ans.script.description)
                })
        } catch(e) {
            console.error("error parsing the script",e)
            ToasterMananager.add('error parsing')
        }
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
            connected:false,
            dirty:true
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
        AuthModule.on(CONNECTED,()=>this.setState({connected:true}))
        if(AuthModule.isConnected()) this.setState({connected:true})
        this.props.provider.on(TREE_ITEM_PROVIDER.CLEAR_DIRTY,()=>{
            this.setState({dirty:false})
        })
        this.props.provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, () => {
            this.setState({dirty:true})
        })
        this.props.provider.on(TREE_ITEM_PROVIDER.SAVED, () => {
            this.setState({dirty:false})
        })
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

    toggleRunning = () => {
        this.setState({running:!this.state.running})
    }

    newDoc = () => {
        if(this.state.dirty) {
            console.log("can't create new becausue dirty")
            DialogManager.show(<UnsavedDocumentDialog onAnyway={()=>{
                console.log("we are doing it anyway")
                newDoc(this.props.provider)
            }}/>)

        } else {
            newDoc(this.props.provider)
        }
    }

    showOpenDocumentDialog = () => {
        if(this.state.dirty) {
            DialogManager.show(<UnsavedDocumentDialog onAnyway={()=>{
                console.log("we are doing it anyway")
                this.props.provider.showOpenDocumentDialog()
            }}/>)
        } else {
            this.props.provider.showOpenDocumentDialog()
        }
    }

    render() {
        if(this.state.connected === false) {
            return <div>
                <h1>connecting to server</h1>
                <DialogContainer/>
            </div>
        }
        const prov = this.props.provider
        const bot = <div>
            doc id: <b>{prov.getDocId()}</b>
        </div>
        let logger = null
        if(prov.pubnub) logger = prov.getLogger()
        if(!prov.getDataGraph()) {
            return <div>
                <h1>connecting to server</h1>
                <DialogContainer/>
            </div>
        }
        return <ErrorCatcher logger={logger}><GridEditorApp bottomText={bot}>
            <Toolbar left top><label>{prov.getTitle()} {this.state.dirty?"dirty":"clean"}</label></Toolbar>
            <Panel scroll left middle><TreeTable root={prov.getSceneRoot()} provider={prov}/></Panel>

            <Toolbar left bottom>
                <button className="fa fa-cube"        onClick={(e)=>showAddPopup(e,prov)}/>
                <button className="fa fa-globe"       onClick={(e)=>addScene(prov)}/>
                <button className="fa fa-archive"     onClick={(e)=>showAddAssetPopup(e,prov)}/>
                <button className="fa fa-superpowers" onClick={(e)=>showAddBehaviorPopup(e,prov)}/>
            </Toolbar>


            <Toolbar center top>
                <button className="fa fa-file" onClick={this.newDoc} title={'new project'}></button>
                <button className="fa fa-save" onClick={() => prov.save()} title={'save project'}></button>
                <button onClick={() => prov.editIn2D()}>2D Edit</button>
                <button onClick={() => prov.editInVR()}>AR Edit</button>
                <button onClick={() => prov.viewInVR()}>XR View</button>
                <Spacer/>
                <RunButton onClick={this.toggleRunning} active={this.state.running}/>
                <Spacer/>
                <button className="fa fa-cut" onClick={prov.cutSelection}/>
                <button className="fa fa-copy" onClick={prov.copySelection}/>
                <button className="fa fa-paste" onClick={prov.pasteSelection}/>
                <button className="fa fa-undo" onClick={prov.performUndo}/>
                <button className="fa fa-repeat" onClick={prov.performRedo}/>
            </Toolbar>


            <Panel center middle scroll transparent>
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

        </GridEditorApp></ErrorCatcher>
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
                buttons.push(<button key="logout" className="fa fa-user" onClick={AuthModule.logout} title={'logout'}>logout</button>)
            } else {
                buttons.push(<button key="login" className="fa fa-user" onClick={()=>{
                    if(AuthModule.supportsPassword()) {
                        this.props.provider.showPasswordDialog()
                    } else {
                        this.props.provider.showGithubDialog()
//                        AuthModule.login()
                    }
                }} title={'login'}/>)
            }
        }
        if(AuthModule.supportsDocList()) {
            buttons.push(<button key="open" className="fa fa-folder-open" onClick={this.showOpenDocumentDialog} title={"open"}/>)
        }
        return buttons
    }
}
const EnumTitleRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider)  value = props.provider.accessObject(props.value).title
    if(props.value === NONE_ASSET.id)  value = NONE_ASSET.title
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
        || type === OBJ_TYPES.cube
        || type === OBJ_TYPES.sphere
    ) return true
    return false
}
function acceptsVideoAsset(type) {
    if(type === OBJ_TYPES.plane
        || type === OBJ_TYPES.bg360
        || type === OBJ_TYPES.img2d
    ) return true
    return false
}

const RunButton = (props) => {
    const clss = props.active?"run-button active fa fa-stop":"run-button fa fa-play"
    return <button onClick={props.onClick} className={clss}/>
}

function withNone(array) {
    array.push(NONE_ASSET.id)
    return array
}
