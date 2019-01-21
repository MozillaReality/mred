import React, {Component} from 'react'
import GridEditorApp, {MenuPopup, Panel, Toolbar} from '../GridEditorApp'
import PropSheet, {TYPES} from '../common/PropSheet'
import TreeTable from '../common/TreeTable'
import SelectionManager from '../SelectionManager'
import {MetadocCanvas} from "./MetadocCanvas";
import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import {createGraphObjectFromObject, fetchGraphObject, indexOf, propToArray} from "../syncgraph/utils";
import {PopupManager} from "appy-comps";
import RectDef from "./RectDef";

const PROP_DEFS = {
    title: {
        key:'title',
        name:'Title',
        type:TYPES.STRING
    },
    x: {
        key:'x',
        name:'X',
        type:TYPES.NUMBER
    },
    y: {
        key:'y',
        name:'Y',
        type:TYPES.NUMBER
    },
    rx: {
        key:'rx',
        name:'RX',
        type:TYPES.NUMBER
    },
    ry: {
        key:'ry',
        name:'RY',
        type:TYPES.NUMBER
    },
    fillColor: {
        key:'fillColor',
        name:'color',
        type:TYPES.COLOR,
    },
    width: {
        key:'width',
        name:'Width',
        type:TYPES.NUMBER
    },
    height: {
        key:'height',
        name:'Height',
        type:TYPES.NUMBER
    },
    radius: {
        key:'radius',
        name:'Radius',
        type:TYPES.NUMBER
    },
    text: {
        key:'text',
        name:'text',
        type:TYPES.STRING
    }
}


export default class MetadocEditor extends  SyncGraphProvider {
    getDocType() { return "metadoc" }
    getApp = () => <MetadocApp provider={this}/>
    getTitle = () => "MetaDoc"

    makeEmptyRoot(doc) {
        //create root and children
        const root_children = doc.createArray()
        const root = createGraphObjectFromObject(doc,{ type:'root', title:'root' })
        doc.createProperty(root,'children',root_children)


        //create page and children
        const page = createGraphObjectFromObject(doc, { type:'page', title:'page 1', parent: root})
        const page_children = doc.createArray()
        doc.createProperty(page,'children',page_children)

        //create layer and children
        const layer = createGraphObjectFromObject(doc,{type:'layer',title:'layer 1', parent: page})
        const layer_children = doc.createArray()
        doc.createProperty(layer,'children',layer_children)


        //create rect
        const rlayer = fetchGraphObject(doc,layer)
        const rect1 = new RectDef().makeRect(doc,rlayer)
        //connect it all together
        doc.insertElement(layer_children,0,rect1)
        doc.insertElement(page_children,0,layer)
        doc.insertElement(root_children,0,page)
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
        if(type === 'rect' || type === 'circle') {
            return fetchGraphObject(this.getDataGraph(),sel)
        }
        return null
    }

    calculateContextMenu(item) {
        const cmds =  [
            {
                title:'delete',
                icon:'close',
                fun: () => {
                    console.log("deleting")
                    this.deleteSelection()
                }
            },
            {
                title:'rect',
                icon:'plus',
                fun: this.addRect
            }
        ]
        return cmds
    }

    addRect = () => {
        const graph = this.getDataGraph()
        const layer = this.getSelectedLayer()
        if(!layer) return console.error("no layer!")
        const rect = new RectDef().makeRect(graph,layer)
        graph.insertElement(layer.children,0,rect)
    }

    deleteSelection = () => {
        const graph = this.getDataGraph()
        const layer = this.getSelectedLayer()
        const shape = this.getSelectedShape()
        if(!shape) return
        console.log("deleting the selection",shape)
        const n = indexOf(graph,layer.children,shape.id)
        console.log('the index is',n)
        if(n >= 0) {
            graph.removeElement(layer.children, n)
            SelectionManager.clearSelection()
        } else {
            console.error("could not find index for child",shape,'in children',layer.children)
        }
    }

}


class MetadocApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            connected:false,
            zoom: 0,
        }
    }

    componentDidMount() {
        this.props.provider.on('CONNECTED',()=> this.setState({connected: this.props.provider.isConnected()}))
    }

    canvasSelected = (rect) => SelectionManager.setSelection(rect)


    showAddPopup = (e) => {
        const acts = [
            {
                title: 'page',
                icon: 'square',
                fun: () => this.addPage()
            },
            {
                title: 'layer',
                icon: 'square',
                fun: () => this.addLayer()
            },
            {
                title: 'rect',
                icon: 'square',
                fun: () => this.props.provider.addRect()
            },
            {
                title: 'circle',
                icon: 'circle',
                fun: () => this.addCircle()
            },
            {
                title: 'text',
                icon: 'text',
                fun: () => this.addText()
            },
        ]
        PopupManager.show(<MenuPopup actions={acts}/>,e.target)
    }
    addPage = () => {
        const graph = this.props.provider.getDataGraph()
        const root = this.props.provider.getSelectedRoot()
        const page = createGraphObjectFromObject(graph,{
            type:'page',
            title:'new page',
            parent:root.id,
        })
        const page_children = graph.createArray()
        graph.createProperty(page,'children',page_children)
        console.log("root is",root)
        graph.insertElement(root.children,0,page)
    }
    addLayer = () => {
        const graph = this.props.provider.getDataGraph()
        const page = this.props.provider.getSelectedPage()
        const layer = createGraphObjectFromObject(graph,{
            type:'layer',
            title:'new layer',
            parent:page.id,
        })
        const layer_children = graph.createArray()
        graph.createProperty(layer,'children',layer_children)
        graph.insertElement(page.children,0,layer)
    }
    addCircle = () => {
        const graph = this.props.provider.getDataGraph()
        const layer = this.props.provider.getSelectedLayer()
        const circle = createGraphObjectFromObject(graph,{
            type:'circle',
            title:'circle',
            x: 100,
            y: 100,
            radius: 50,
            parent:layer.id,
        })
        graph.insertElement(layer.children,0,circle)
    }
    addText = () => {
        const graph = this.props.provider.getDataGraph()
        const layer = this.props.provider.getSelectedLayer()
        if(!layer) return
        const text = createGraphObjectFromObject(graph,{
            type:'text',
            title:'text',
            text:'title text',
            x: 100,
            y: 100,
            parent:layer.id,
        })
        graph.insertElement(layer.children,0,text)
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
                <button onClick={this.showAddPopup}>+</button>
                <button onClick={this.props.provider.deleteSelection}>x</button>
            </Toolbar>


            <Toolbar center top>
                <button className="fa fa-save" onClick={prov.save}/>
                <button onClick={prov.toggleConnected}>{this.state.connected?"disconnect":"connect"}</button>
                <button onClick={prov.performUndo}>undo</button>
                <button onClick={prov.performRedo}>redo</button>
                <button onClick={this.zoomIn}>zoom +</button>
                <button onClick={this.zoomOut}>zoom -</button>
            </Toolbar>


            <Panel center middle scroll>
                <MetadocCanvas
                    prov={prov}
                    onSelect={this.canvasSelected}
                    scale={Math.pow(2,this.state.zoom)}
                />
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>


            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }
}


