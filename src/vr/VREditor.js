import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import React, {Component} from 'react'
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import TreeTable from '../common/TreeTable'
import PropSheet, {TYPES} from '../common/PropSheet'
import SelectionManager from '../SelectionManager'
import {VRCanvas} from './VRCanvas'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import ImmersiveVREditor from './ImmersiveVREditor'
import {
    cloneShape,
    fetchGraphObject,
    insertAsFirstChild, insertAsLastChild,
    removeFromParent
} from '../syncgraph/utils'
import CubeDef from "./CubeDef";
import SceneDef from "./SceneDef";
import InputManager from "../common/InputManager";
import SphereDef from "./SphereDef";
import {HBox} from "appy-comps";
const stdhints = {
    incrementValue:0.1,
}
const PROP_DEFS = {
    title: {
        key:'title',
        name:'Title',
        type:TYPES.STRING
    },
    width: {
        key:'width',
        name:'Width',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    height: {
        key:'height',
        name:'Height',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    depth: {
        key:'depth',
        name:'Depth',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    radius: {
        key:'radius',
        name:'Radius',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    tx: {
        key:'tx',
        name:'TX',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    ty: {
        key:'ty',
        name:'TY',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    tz: {
        key:'tz',
        name:'TZ',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    color: {
        key:'color',
        name:'Color',
        type:TYPES.COLOR,
        custom:true,
    },
    defaultFloor: {
        key:'defaultFloor',
        name:'Default Floor',
        type:TYPES.BOOLEAN
    }
}

const SIMPLE_COLORS = ["#ffffff","#ff0000","#ffff00","#00ff00","#00ffff","#0000ff","#ff00ff","#000000"]

function is3DObjectType(type) {
    if(type === 'cube') return true
    if(type === 'sphere') return true
    return false
}


export default class VREditor extends  SyncGraphProvider {
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
        if(!this.getDataGraph().getObjectById(item)) return <div>???</div>
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

    addCube = () => {
        const graph = this.getDataGraph()
        const scene = this.getSelectedScene()
        const obj = new CubeDef().make(graph,scene)
        insertAsFirstChild(graph,scene,obj)
        SelectionManager.setSelection(obj.id)
    }

    addSphere = () => {
        const graph = this.getDataGraph()
        const scene = this.getSelectedScene()
        const obj = new SphereDef().make(graph,scene)
        insertAsFirstChild(graph,scene,obj)
        SelectionManager.setSelection(obj.id)
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
        const cmds =  [
            {
                title:'delete',
                icon:'close',
                fun: this.deleteObject
            },
            {
                title:'cube',
                icon:'square',
                fun: this.addCube
            },
            {
                title:'sphere',
                icon:'circle',
                fun: this.addSphere
            },
            {
                title:'scene',
                icon:'file',
                fun: this.addScene
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
        return
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

    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle><TreeTable root={prov.getSceneRoot()} provider={prov}/></Panel>

            <Toolbar left bottom>
                <button className={"fa fa-plus"} onClick={prov.addCube}>cube</button>
                <button className={"fa fa-plus"} onClick={prov.addSphere}>sphere</button>
                <button className="fa fa-plus" onClick={prov.addScene}>scene</button>
            </Toolbar>


            <Toolbar center top>
                <button onClick={()=>prov.save()}>save</button>
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


