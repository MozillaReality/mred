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
    createGraphObjectFromObject,
    fetchGraphObject,
    indexOf,
    insertAsFirstChild,
    removeFromParent
} from '../syncgraph/utils'
import CubeDef from "./CubeDef";
import SceneDef from "./SceneDef";
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
    defaultFloor: {
        key:'defaultFloor',
        name:'Default Floor',
        type:TYPES.BOOLEAN
    }
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
        const root = fetchGraphObject(doc,createGraphObjectFromObject(doc,{
            type:'root',
            title:'root',
            children:doc.createArray()
        }))
        const scene1 = new SceneDef().make(doc,root)
        insertAsFirstChild(doc,root,scene1)
        const obj = new CubeDef().make(doc,scene1)
        insertAsFirstChild(doc,scene1,obj)
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
        if(type === 'cube')  return fetchGraphObject(graph,graph.getPropertyValue(sel,'parent'))
        return -1
    }

    quick_setPropertyValue(item, key, value) {
        const ov = this.getDataGraph().getPropertyValue(item,key)
        this.getDataGraph().setProperty(item,key,value)
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

    deleteObject = () => {
        const objid = SelectionManager.getSelection()
        if(!objid) return
        const graph = this.getDataGraph()
        const obj = fetchGraphObject(graph,objid)
        const parent = fetchGraphObject(graph,obj.parent)
        removeFromParent(graph,obj)
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

    canAddChild(parent,child) {
        const p = fetchGraphObject(this.getDataGraph(),parent)
        const c = fetchGraphObject(this.getDataGraph(),child)
        if(p.type === 'scene' && c.type === 'cube') return true
        return false
    }
    canBeSibling(src,tgt) {
        const s = fetchGraphObject(this.getDataGraph(),src)
        const t = fetchGraphObject(this.getDataGraph(),tgt)
        if(s.type === 'cube' && t.type === 'cube') return true
        return false
    }

}

class VREditorApp extends Component {

    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle><TreeTable root={prov.getSceneRoot()} provider={prov}/></Panel>

            <Toolbar left bottom>
                <button className={"fa fa-plus"} onClick={prov.addCube}>cube</button>
                <button className="fa fa-plus" onClick={prov.addScene}>scene</button>
            </Toolbar>


            <Toolbar center top>
                <button onClick={()=>prov.save()}>save</button>
                <button onClick={()=>prov.preview()}>preview</button>
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


