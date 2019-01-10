import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import PropSheet from '../PropSheet'
import TreeTable from '../TreeTable'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'

const {DocGraph, SET_PROPERTY} = require("syncing_protocol");

export default class MetadocEditor extends  TreeItemProvider {
    constructor() {
        super()
        this.syncdoc = new DocGraph()
        this.root = this.makeEmptyRoot()


        this.syncdoc.onChange((op)=>{
            // console.log("the doc has changed",op)
            if(op.type === SET_PROPERTY) {
                this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,op)
            }
        })
    }

    makeEmptyRoot() {
        const CH = this.syncdoc.createArray()
        const root = this.syncdoc.createObject()
        this.syncdoc.createProperty(root,'title','root')
        this.syncdoc.createProperty(root,'children',CH)


        const d = this.syncdoc
        const rect1 = this.syncdoc.createObject()
        d.createProperty(rect1,'title','first rect')
        d.createProperty(rect1,'x',100)
        d.createProperty(rect1,'y',100)
        d.createProperty(rect1,'width',100)
        d.createProperty(rect1,'height',100)
        this.syncdoc.insertElement(CH,0,rect1)
        return root
    }

    getRootList() {
        return this.syncdoc.getPropertyValue(this.root,'children')
    }

    getDocType = () => "metadoc"
    getApp = () => <MetadocApp provider={this}/>
    getTitle = () => "MetaDoc"

    getRendererForItem = (item) => {
        // console.log("get renderer for item",item)
        // const props = this.syncdoc.getPropertiesForObject(item)
        // console.log("props",props)
        const title = this.syncdoc.getPropertyValue(item,'title')
        return <div>{title}</div>
    }

    isExpanded = (item) => true

    hasChildren = (item) => item && this.syncdoc.hasPropertyValue(item,'children')
    getChildren = (item) => {
        console.log("getting children for",item)
        const CH = this.syncdoc.getPropertyValue(item,'children')
        const len = this.syncdoc.getArrayLength(CH)
        const ch = []
        for(let i=0; i<len; i++) {
            ch.push(this.syncdoc.getElementAt(CH,i))
        }
        return ch
    }



    getProperties(item) {

        const PROP_DEFS = {
            title: {
                key:'title',
                name:'Title',
                type:'string'
            },
            x: {
                key:'x',
                name:'X',
                type:'number',
            },
            y: {
                key:'y',
                name:'Y',
                type:'number',
            },
            width: {
                key:'width',
                name:'Width',
                type:'number',
            },
            height: {
                key:'height',
                name:'Height',
                type:'number',
            },
        }

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
                const value = this.syncdoc.getPropertyValue(item,key)
                if(PROP_DEFS[key]) return defs.push(copyPropDef(PROP_DEFS[key],value))
                console.log("unknown property",key)
            })
        }

        return defs
    }

    setPropertyValue(item, def, value) {
        console.log('setting',item,def,value)
        this.syncdoc.setProperty(item,def.key,value)
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,{
            provider: this,
            child:item,
            propKey:def.key,
            oldValue:def.value,
            newValue:value
        })
    }

}


class MetadocApp extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle>
                <TreeTable root={prov.getSceneRoot()} provider={prov}/>
            </Panel>

            <Toolbar left bottom>
                tools
            </Toolbar>


            <Toolbar center top>
                <button className="fa fa-save" onClick={prov.save}/>
            </Toolbar>


            <Panel center middle scroll>
                <MetadocCanvas graph={prov.syncdoc} list={prov.getRootList()}/>
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>


            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }
}


export class MetadocCanvas extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed:false,
            scale:1,
            selection:null
        }
        props.graph.onChange((e) => {
            if (this.props.list === -1) return
            this.redraw()
        })
    }

    componentDidMount() {
        this.sel_listener = SelectionManager.on(SELECTION_MANAGER.CHANGED, (sel)=> {
            console.log("new selection is",sel)
            this.setState({selection:sel})
        })
    }

    toCanvas(e) {
        const rect = e.target.getBoundingClientRect()
        // console.log("clicked at",e.clientX,rect)
        return {
            x: (e.clientX-rect.left)/this.state.scale,
            y: (e.clientY-rect.top)/this.state.scale,
        }
    }



    componentDidUpdate(prevProps) {
        this.redraw()
    }

    redraw() {
        let sel = -1
        if(this.state.selection) {
            sel = this.state.selection.getSelection()
        }
        const c = this.canvas.getContext('2d')
        c.fillStyle = 'blue'
        c.fillRect(0, 0, this.canvas.width, this.canvas.height)
        c.save()
        c.scale(this.state.scale, this.state.scale)
        const list = this.props.list
        const len = this.props.graph.getArrayLength(list)
        for (let i = 0; i < len; i++) {
            const objid = this.props.graph.getElementAt(list, i)
            const x = this.props.graph.getPropertyValue(objid, 'x')
            const y = this.props.graph.getPropertyValue(objid, 'y')
            const w = this.props.graph.getPropertyValue(objid, 'width')
            const h = this.props.graph.getPropertyValue(objid, 'height')
            // console.log(objid,x,y,w,h)
            c.fillStyle = 'gray'
            if (sel === objid) {
                c.fillStyle = 'red'
            }
            c.fillRect(x, y, w, h)
        }
        c.restore()
    }

    isInside(pt,objid) {
        const x = this.props.graph.getPropertyValue(objid, 'x')
        const y = this.props.graph.getPropertyValue(objid, 'y')
        const w = this.props.graph.getPropertyValue(objid, 'width')
        const h = this.props.graph.getPropertyValue(objid, 'height')
        if(pt.x < x) return false
        if(pt.x > x + w) return false
        if(pt.y < y) return false
        if(pt.y > y + h) return false
        return true
    }


    onClick = (e) => {
        const pt = this.toCanvas(e)
        const rect = this.findRect(pt)
        // if(rect) this.props.onSelect(rect)
    }

    findRect(pt) {
        const list = this.props.list
        if(list <= 0) return null
        const len = this.props.graph.getArrayLength(list)
        for (let i = 0; i < len; i++) {
            const objid = this.props.graph.getElementAt(list, i)
            if(this.isInside(pt,objid)) return objid
        }
        return null
    }

    mouseDown = (e) =>{
        // this.props.onPauseQueue()
        const pt = this.toCanvas(e)
        const rect = this.findRect(pt)
        if(rect) {
            this.setState({
                pressed: true,
                start: pt,
                rect:rect,
            })
        }
    }
    mouseMove = (e) => {
        if(!this.state.pressed) return
        const pt = this.toCanvas(e)
        this.props.graph.setProperty(this.state.rect,'x',pt.x)
        this.props.graph.setProperty(this.state.rect,'y',pt.y)
    }
    mouseUp = (e) => {
        this.setState({pressed:false})
        // this.props.onUnpauseQueue()
    }

    render() {
        return <div className="panel">
            <h3>Canvas</h3>
            <canvas style={{border:'1px solid red'}}
                    width={500} height={300} ref={(e) => this.canvas = e}
                    onClick={this.onClick}
                    onMouseDown={this.mouseDown}
                    onMouseUp={this.mouseUp}
                    onMouseMove={this.mouseMove}
            ></canvas>
        </div>
    }
}
