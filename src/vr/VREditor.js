import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import React, {Component} from 'react'
import {Panel, Toolbar} from '../GridEditorApp'
import TreeTable from '../TreeTable'
import PropSheet, {TYPES} from '../common/PropSheet'
import GridEditorApp from '../GridEditorApp'


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


const {DocGraph, CommandGenerator} = require("syncing_protocol");
export default class VREditor extends  SyncGraphProvider {
    getDocType() { return "vr" }
    getApp = () => <VREditorApp provider={this}/>
    getTitle = () => "VR Builder"
    makeEmptyRoot(doc) {
        const CH = doc.createArray()
        const root = doc.createObject()
        doc.createProperty(root,'type','root')
        doc.createProperty(root,'title','root')
        doc.createProperty(root,'children',CH)


        const scene1 = doc.createObject()
        doc.createProperty(scene1,'type','scene')
        doc.createProperty(scene1,'title','Scene 1')
        doc.createProperty(scene1,'children',doc.createArray())
        doc.insertElement(CH,0,scene1)

        const obj1 = doc.createObject()
        doc.createProperty(obj1,'type','cube')
        doc.createProperty(obj1,'title','cube 1')
        doc.createProperty(obj1,'width',1)
        doc.createProperty(obj1,'height',1)
        doc.createProperty(obj1,'depth',1)
        doc.createProperty(obj1,'tx',0)
        doc.createProperty(obj1,'ty',1.5)
        doc.createProperty(obj1,'tz',-3)
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
                const value = this.syncdoc.getPropertyValue(item,key)
                if(PROP_DEFS[key]) return defs.push(copyPropDef(PROP_DEFS[key],value))
                console.log("unknown property",key)
            })
        }

        return defs
    }

}

class VREditorApp extends Component {
    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle><TreeTable root={prov.getSceneRoot()} provider={prov}/></Panel>

            <Toolbar left bottom>
            </Toolbar>


            <Toolbar center top>
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

class VRCanvas extends Component {
    componentDidMount() {
        this.props.provider.onRawChange(op => {
            console.log("got a change",op)
        })
    }

    render() {
        return <div>rendering the selected node</div>
    }
}
