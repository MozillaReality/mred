import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import React, {Component} from 'react'
import GridEditorApp, {MenuPopup, Panel, Toolbar} from '../GridEditorApp'
import TreeTable from '../common/TreeTable'
import PropSheet from '../common/PropSheet'
import SelectionManager from '../SelectionManager'
import {VRCanvas} from './VRCanvas'
import {SERVER_URL_ASSETS, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import ImmersiveVREditor from './ImmersiveVREditor'
import {
    cloneShape,
    fetchGraphObject,
    insertAsFirstChild,
    insertAsLastChild,
    listToArray,
    propToArray,
    removeFromParent
} from '../syncgraph/utils'
import CubeDef from "./CubeDef";
import SceneDef from "./SceneDef";
import InputManager from "../common/InputManager";
import SphereDef from "./SphereDef";
import {Dialog, DialogManager, HBox, PopupManager, VBox} from "appy-comps";
import {get3DObjectDef, is3DObjectType, isGLTFFile, isImageType, ITEM_ICONS, PROP_DEFS, SIMPLE_COLORS} from './Common'
import PlaneDef from './PlaneDef'
import {ICONS} from '../metadoc/Common'
import ModelDef from './ModelDef'


export default class VREditor extends  SyncGraphProvider {
    constructor(options) {
        super(options)
        this.imagecache = {}
    }
    getDocType() { return "vr" }
    getApp = () => {
        if(this.mode === 'edit') return <VREditorApp provider={this}/>
        if(this.mode === 'vredit') return <ImmersiveVREditor provider={this}/>
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
        const obj = fetchGraphObject(this.getDataGraph(),item)
        if(!obj) return <div>???</div>
        if(ITEM_ICONS[obj.type]) return <div><i className={`fa fa-${ITEM_ICONS[obj.type]}`}></i> {obj.title}</div>
        return <div>{this.getDataGraph().getPropertyValue(item,'title')}</div>
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
    setPropertyValue(item, def, value) {
        super.setPropertyValue(item,def,value)
        //size the plane to match the aspect ratio of the asset
        if(def.key === PROP_DEFS.asset.key) {
            const asset = fetchGraphObject(this.getDataGraph(),value)
            const obj = fetchGraphObject(this.getDataGraph(),item)
            if(asset.subtype === 'image') {
                let height = (asset.height / asset.width) * obj.width
                super.setPropertyValue(item, {key: 'height'}, height)
            }
            if(asset.subtype === 'gltf') {
                console.log("adjusting to a gtlf")
            }
        }
    }
    getValuesForEnum(key,obj) {
        if (key === PROP_DEFS.asset.key) {
            const children = this.getDataGraph().getPropertyValue(this.getAssetsObject(), 'children')
            const assets = propToArray(this.getDataGraph(), children).map(ch => fetchGraphObject(this.getDataGraph(),ch))
            const realobj = fetchGraphObject(this.getDataGraph(),obj)
            if(realobj.type === 'model') {
                return assets.filter(a => a.subtype === 'gltf').map(a => a.id)
            }
            if(realobj.type === 'plane') {
                return assets.filter(a => a.subtype === 'image').map(a => a.id)
            }
        }
    }
    getRendererForEnum(key,obj) {
        if(key === PROP_DEFS.asset.key) return EnumTitleRenderer
    }

    getSelectedScene() {
        const graph = this.getDataGraph()
        const sel = SelectionManager.getSelection()
        if(sel === null) {
            const root = this.getSceneRoot()
            const ch = graph.getPropertyValue(root,'children')
            return fetchGraphObject(graph,graph.getElementAt(ch,0))
        }
        const type = this.getDataGraph().getPropertyValue(sel,'type')
        if(type === 'scene') return fetchGraphObject(graph,sel)
        if(is3DObjectType(type))  return fetchGraphObject(graph,graph.getPropertyValue(sel,'parent'))
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

    addScene = () => {
        const graph = this.getDataGraph()
        const root = fetchGraphObject(graph,this.getSceneRoot())
        const scene = new SceneDef().make(graph,root)
        insertAsFirstChild(graph,root,scene)
        SelectionManager.setSelection(scene.id)
    }

    add3DObject = (type) => {
        const graph = this.getDataGraph()
        const scene = this.getSelectedScene()
        const obj = get3DObjectDef(type).make(graph,scene)
        insertAsFirstChild(graph,scene,obj)
        SelectionManager.setSelection(obj.id)
    }
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
    addGLBAssetFromFile = (file) => {
        this.uploadFile(file).then((ans)=>{
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
            const assets = fetchGraphObject(graph,this.getAssetsObject())
            insertAsLastChild(graph,assets,asset)
        })
    }

    deleteObject = () => {
        const objid = SelectionManager.getSelection()
        if(!objid) return
        const graph = this.getDataGraph()
        const obj = fetchGraphObject(graph,objid)
        removeFromParent(graph,obj)
        SelectionManager.clearSelection()
    }

    calculateContextMenu(item) {
        const cmds = []
        cmds.push({ title:'delete', icon:'close', fun: this.deleteObject });

        ['cube','sphere','plane','model'].forEach(type =>{
            cmds.push({ title:type,icon: ITEM_ICONS[type], fun: () => this.add3DObject(type) })
        });
        cmds.push({ title:'scene', icon:'file', fun: this.addScene })
        cmds.push({ title:'cut',   icon:'cut',  fun:this.cutSelection })
        cmds.push({ title:'copy',  icon:'copy', fun:this.copySelection })
        cmds.push({ title:'paste', icon:'paste',fun:this.pasteSelection })
        return cmds
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
        if(is3DObjectType(obj1.type)) parent = this.getSelectedScene()
        if(obj1.type === 'scene') parent = fetchGraphObject(graph,this.getSceneRoot())
        if (!parent) return console.error("no parent to ad too! bad obj type?",obj1.type)

        const obj2 = cloneShape(graph,obj1)
        graph.setProperty(obj2.id, 'parent', parent.id)
        insertAsFirstChild(graph, parent, obj2)
    }

    canAddChild(parent,child) {
        const p = fetchGraphObject(this.getDataGraph(),parent)
        const c = fetchGraphObject(this.getDataGraph(),child)
        if(p.type === 'scene' && is3DObjectType(c.type)) return true
        return false
    }
    canBeSibling(src,tgt) {
        const s = fetchGraphObject(this.getDataGraph(),src)
        const t = fetchGraphObject(this.getDataGraph(),tgt)
        if(is3DObjectType(s.type) && is3DObjectType(t.type)) return true
        return false
    }
    canAddExternalChild(parent,child) {
        const pobj = fetchGraphObject(this.getDataGraph(),parent)
        if(pobj.type === 'assets') return true
        return false
    }
    acceptDrop(e,tgt) {
        const obj = fetchGraphObject(this.getDataGraph(),tgt)
        if(obj.type === 'assets') {
            listToArray(e.dataTransfer.files).forEach(file => {
                if(isImageType(file.type)) return this.addImageAssetFromFile(file)
                if(isGLTFFile(file)) return this.addGLTFAssetFromFile(file)
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
        if(def.key === PROP_DEFS.color.key) return <HBox>
            {
                SIMPLE_COLORS
                    .map(c => <button
                        key={c}
                        onClick={()=>onChange(c)}
                        style={{color:c, padding:'1px', margin:0, borderWidth:0,}}
                        className={"fa fa-square"}/> )
            }
        </HBox>
        return <i>no custom editor for {def.key}</i>
    }

    setColor = (color) => {
        const objid = SelectionManager.getSelection()
        if(!objid) return
        const graph = this.getDataGraph()
        graph.setProperty(objid,'color',color)
    }

    showAddImageAssetDialog = () => DialogManager.show(<AddImageAssetDialog provider={this}/>)
    showAddGLTFAssetDialog = () =>  DialogManager.show(<AddGLTFAssetDialog provider={this}/>)
    showAddGLBAssetDialog = () =>   DialogManager.show(<AddGLBAssetDialog provider={this}/>)

}

class AddImageAssetDialog extends Component {
    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
        listToArray(this.fileinput.files).forEach(file => {
            this.props.provider.addImageAssetFromFile(file)
        })
    }
    render() {
        return <Dialog visible={true}>
            <VBox>
                <h3>add image to assets</h3>
                <input type="file" ref={(obj)=>this.fileinput = obj} onChange={this.selectedFile}/>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

    selectedFile = (e) => {
        console.log("selected a file",e.target)
    }
}

class AddGLTFAssetDialog extends Component {
    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
        listToArray(this.fileinput.files).forEach(file => {
            console.log("got the file",file)
        })
    }
    render() {
        return <Dialog visible={true}>
            <VBox>
                <h3>add GLTF file assets</h3>
                <p>
                    chose <b>the directory</b> containing the GLTF file
                </p>
                <input type="file" ref={(obj)=>this.fileinput = obj} onChange={this.selectedFile} multiple={true} webkitdirectory="true"/>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

    selectedFile = (e) => {
        console.log("selected a file",e.target)
    }
}

class AddGLBAssetDialog extends Component {
    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
        listToArray(this.fileinput.files).forEach(file => {
            this.props.provider.addGLBAssetFromFile(file)
        })
    }
    render() {
        return <Dialog visible={true}>
            <VBox>
                <h3>add GLB to assets</h3>
                <p>
                    choose a GLB file
                </p>
                <input type="file" ref={(obj)=>this.fileinput = obj} onChange={this.selectedFile} multiple={true}/>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

    selectedFile = (e) => {
        console.log("selected a file",e.target)
    }
}

class VREditorApp extends Component {

    constructor(props) {
        super(props)

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
    }

    showAddPopup = (e) => {
        const acts = ['cube','sphere','plane','model'].map(type =>{
            return {
                title:type,
                icon: ITEM_ICONS[type],
                fun: () => this.props.provider.add3DObject(type)
            }
        })
        PopupManager.show(<MenuPopup actions={acts}/>,e.target)
    }
    showAddAssetPopup = (e) => {
        const acts = [
            {
                title: 'image',
                icon: ICONS.image,
                fun: () => this.props.provider.showAddImageAssetDialog()
            },
            {
                title: 'GLTF model',
                icon: ICONS.model,
                fun: () => this.props.provider.showAddGLTFAssetDialog()
            },
            {
                title: 'GLB model',
                icon: ICONS.model,
                fun: () => this.props.provider.showAddGLBAssetDialog()
            },
        ]
        PopupManager.show(<MenuPopup actions={acts}/>,e.target)
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
                <button className="fa fa-save" onClick={()=>prov.save()}></button>
                <button onClick={()=>prov.preview()}>preview</button>
                <button className="fa fa-undo" onClick={prov.performUndo}/>
                <button className="fa fa-repeat" onClick={prov.performRedo}/>
            </Toolbar>


            <Panel center middle scroll>
                <VRCanvas provider={prov}/>
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>


            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }
}

const EnumTitleRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider) {
        const graph = props.provider.getDataGraph()
        value = graph.getPropertyValue(props.value,'title')
    }
    return <b>{value}</b>
}
