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
        const root = createGraphObjectFromObject(doc,{
            type:'root',
            title:'root',
            children:doc.createArray()
        })
        const scene1 = new SceneDef().make(doc)
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
        const sel = SelectionManager.getSelection()
        if(sel === null) {
            const root = this.getSceneRoot()
            const graph = this.getDataGraph()
            const ch = graph.getPropertyValue(root,'children')
            return graph.getElementAt(ch,0)
        }
        const type = this.getDataGraph().getPropertyValue(sel,'type')
        if(type === 'scene') return sel
        if(type === 'cube')  return this.getDataGraph().getPropertyValue(sel,'parent')
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

    addCube = () => {
        const graph = this.getDataGraph()
        const scene1 = this.getSelectedScene()
        const obj = new CubeDef().make(graph,scene1)
        insertAsFirstChild(graph,scene1,obj)
        SelectionManager.setSelection(obj)
    }

    deleteObject = () => {
        const objid = SelectionManager.getSelection()
        if(!objid) return
        const graph = this.getDataGraph()
        const obj = fetchGraphObject(graph,objid)
        const parent = fetchGraphObject(graph,obj.parent)
        removeFromParent(graph,obj)
    }
}

class VREditorApp extends Component {

    addScene = () => {
        const graph = this.props.provider.getDataGraph()
        const scene = new SceneDef().make(graph)
        const root = this.props.provider.getSceneRoot()
        insertAsFirstChild(graph,root,scene)
    }
    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle><TreeTable root={prov.getSceneRoot()} provider={prov}/></Panel>

            <Toolbar left bottom>
                <button className={"fa fa-plus"} onClick={prov.addCube}>cube</button>
                <button className="fa fa-plus" onClick={this.addScene}>scene</button>
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


