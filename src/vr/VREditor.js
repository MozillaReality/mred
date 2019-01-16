import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import React, {Component} from 'react'
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import TreeTable from '../TreeTable'
import PropSheet, {TYPES} from '../common/PropSheet'
import SelectionManager from '../SelectionManager'
import {VRCanvas} from './VRCanvas'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'

const {DocGraph, CommandGenerator, SET_PROPERTY, INSERT_ELEMENT} = require("syncing_protocol");

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
    },
    height: {
        key:'height',
        name:'Height',
        type:TYPES.NUMBER,
    },
    depth: {
        key:'depth',
        name:'Depth',
        type:TYPES.NUMBER,
    },
    tx: {
        key:'tx',
        name:'TX',
        type:TYPES.NUMBER,
    },
    ty: {
        key:'ty',
        name:'TY',
        type:TYPES.NUMBER,
    },
    tz: {
        key:'tz',
        name:'TZ',
        type:TYPES.NUMBER,
    },
}

function createGraphObjectFromObject(graph,json) {
    const objid = graph.createObject()
    Object.keys(json).forEach(key=>{
        const value = json[key]
        graph.createProperty(objid,key,value)
    })
    return objid
}


export default class VREditor extends  SyncGraphProvider {
    getDocType() { return "vr" }
    getApp = () => <VREditorApp provider={this}/>
    getTitle = () => "VR Builder"
    makeEmptyRoot(doc) {
        const CH = doc.createArray()
        const root = createGraphObjectFromObject(doc,{
            type:'root',
            title:'root',
        })
        doc.createProperty(root,'children',CH)


        const scene1 = createGraphObjectFromObject(doc,{
            type:'scene',
            title:'Scene 1',
        })
        doc.createProperty(scene1,'children',doc.createArray())
        doc.insertElement(CH,0,scene1)

        const obj1 = createGraphObjectFromObject(doc,{
            type:'cube',
            title:'cube 1',
            width:1, height:1, depth:1,
            tx:0, ty:1.5, tz:-3,
            parent:scene1,
        })
        doc.insertElement(doc.getPropertyValue(scene1,'children'),0,obj1)
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
        if(type === 'scene') {
            return sel
        }
        if(type === 'cube') {
            return this.getDataGraph().getPropertyValue(sel,'parent')
        }

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

    preview = () => window.open( `./?mode=preview&doctype=${this.getDocType()}&doc=${this.getDocId()}`)

}

class VREditorApp extends Component {
    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle><TreeTable root={prov.getSceneRoot()} provider={prov}/></Panel>

            <Toolbar left bottom>
                <button onClick={()=>{
                    const graph = this.props.provider.getDataGraph()
                    const obj = createGraphObjectFromObject(graph,{
                        type:'cube',
                        title:'cube2',
                        width:1, height:1, depth:1,
                        tx:0, ty:1.5, tz:-3
                    })
                    const scene1 = this.props.provider.getSelectedScene()
                    graph.createProperty(obj,'parent',scene1)
                    graph.insertElement(graph.getPropertyValue(scene1,'children'),0,obj)
                    SelectionManager.setSelection(obj)
                }}>+ cube</button>
                <button onClick={()=>{
                    const graph = this.props.provider.getDataGraph()
                    const scene = createGraphObjectFromObject(graph,{
                        type:'scene',
                        title:'Scene 2',
                    })
                    graph.createProperty(scene,'children',graph.createArray())
                    const root = this.props.provider.getSceneRoot()
                    const ch = graph.getPropertyValue(root,'children')
                    graph.insertElement(ch,0,scene)
                }}>+ scene</button>
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


