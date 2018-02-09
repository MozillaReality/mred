import React, { Component } from 'react';
import TreeItemProvider, {SERVER_URL_ASSETS, TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import Selection, {SELECTION_MANAGER} from '../SelectionManager'
import ReactDOMServer from 'react-dom/server';
import {genID, makePoint} from '../utils'
import CanvasSVG from './CanvasSVG'
import SVGApp from './SVGApp'


export const SceneItemRenderer = (props) => {
    const type = props.item.type;
    if(type === 'rect')   return <div><i className="fa fa-square"/> {props.item.title}</div>
    if(type === 'circle') return <div><i className="fa fa-circle"/> {props.item.title}</div>
    if(type === 'scene')  return <div><i className="fa fa-diamond"/> {props.item.title}</div>
    if(type === 'group')  return <div><i className="fa fa-object-group"/> {props.item.title}</div>
    if(type === 'text')   return <div><i className="fa fa-text-width"/> {props.item.title}</div>
    if(type === 'arrow')  return <div><i className="fa fa-long-arrow-right"/> {props.item.title}</div>
    if(type === 'ellipse')return <div><i className="fa fa-circle"/> {props.item.title}</div>
    if(type === 'image')  return <div><i className="fa fa-image"/> {props.item.title}</div>
    return <div>unknown item type</div>
}

const STROKE_STYLES = ['solid','dotted','dashed']
const FONT_FAMILIES = ['serif','sans-serif','monospace']
const TEXT_ANCHORS = ['start','middle','end']

export default class SceneTreeItemProvider extends TreeItemProvider {
    constructor() {
        super();
        this.root = {
            title:'root',
            type:'scene',
            children:[]
        }
        this.expanded_map = {};
        this.listeners = {};
        this.tools = [
            {
                //select / move action
                icon:'location-arrow',
                title:""
            }
        ]
        this.id_index = {}
    }
    getApp() {
        return <SVGApp provider={this}/>
    }
    getTitle() {
        return 'SVG'
    }
    getDocType() {
        return "svg"
    }
    setDocument(doc,docid) {
        super.setDocument(doc,docid)
        this.id_index = {}
        //re-attach children to their parents
        this.root.children.forEach((scn) => {
            this.id_index[scn.id] = scn
        })
    }

    on(type,cb) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(cb);
    }
    fire(type, value) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].forEach((cb) => cb(value));
    }
    getSceneRoot() {
        return this.root;
    }

    makeEmptyRoot() {
        return {
            title:'root',
            type:'scene',
            id: genID('root'),
            children: []
        }
    }

    getRendererForItem(item) {
        return <SceneItemRenderer item={item}/>
    }
    isExpanded(item) {
        if(!item.id) item.id = ""+Math.random();
        if(typeof this.expanded_map[item.id] === 'undefined') this.expanded_map[item.id] = true;
        return this.expanded_map[item.id];
    }
    hasChildren(item) {
        if(!item) return false;
        return (item.children && item.children.length>0)
    }
    canHaveChild(parent,child) {
        if(parent.type === 'group') return true
        if(parent.type === 'scene') return true
        return false
    }
    getChildren(item) {
        return item.children;
    }

    appendChild(parent,child) {
        parent.children.push(child);
        this.id_index[child.id] = child
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,child);
    }

    deleteNode(child) {
        const parent = this.findParent(this.getSceneRoot(),child)
        const index = parent.children.indexOf(child)
        if(index<0) return console.log("not really the parent. invalid!")
        parent.children.splice(index,1)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,child);
        Selection.setSelection(parent)
    }
    insertNodeBefore(parent,target,node) {
        const index = parent.children.indexOf(target)
        if(index<0)  {
            parent.children.push(node)
        } else {
            parent.children.splice(index, 0, node)
        }
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,node);
        Selection.setSelection(node)
    }

    findNodeById(id) {
        return this.id_index[id]
    }

    findParent(root,target) {
        if(root === target) return null
        if(root.children) {
            for(let i=0; i<root.children.length; i++) {
                const ch = root.children[i]
                if(ch === target) return root;
                const res = this.findParent(ch,target)
                if(res) return res
            }
        }
        return null;
    }

    toggleItemCollapsed(item) {
        const current = this.isExpanded(item);
        this.expanded_map[item.id] = !current;
        this.fire(TREE_ITEM_PROVIDER.EXPANDED_CHANGED,item);
    }
    getDefForProperty(item,key) {
        const def = {
            name:key,
            key:key,
            value:item[key],
            locked:false,
            type:'string'
        }
        if(key === 'x') def.type = 'number'
        if(key === 'y') def.type = 'number'
        return def
    }
    getValuesForEnum(key) {
        if(key === 'strokeStyle') return STROKE_STYLES
        if(key === 'fontFamily') return FONT_FAMILIES
        if(key === 'textAnchor') return TEXT_ANCHORS
        return []
    }
    getProperties(item) {
        let defs = [];
        if(!item) return defs;
        Object.keys(item).forEach((key)=>{
            if(key === 'children') return;
            let type = 'string'
            let locked = false
            let custom = false
            if(key === 'visible') type = 'boolean'
            if(key === 'type') locked = true
            if(key === 'id') locked = true
            if(key === 'x') type = 'number'
            if(key === 'y') type = 'number'
            if(key === 'w') type = 'number'
            if(key === 'h') type = 'number'
            if(key === 'tx') type = 'number'
            if(key === 'ty') type = 'number'
            if(key === 'cx') type = 'number'
            if(key === 'cy') type = 'number'
            if(key === 'rx') type = 'number'
            if(key === 'ry') type = 'number'
            if(key === 'color') type = 'color'
            if(key === 'stroke') type = 'color'
            if(key === 'strokeWidth') type = 'number'
            if(key === 'strokeStyle') type = 'enum'
            if(key === 'fontFamily') type = 'enum'
            if(key === 'fontSize') type = 'number'
            if(key === 'textAnchor') type = 'enum'
            if(key === 'src') {
                type = 'string'
                custom = true
            }
            defs.push({
                name:key,
                key:key,
                value:item[key],
                type:type,
                locked:locked,
                custom: custom
            })
        })
        return defs;
    }
    setPropertyValue(item,def,value) {
        if(def.type === 'number') value = parseFloat(value);
        item[def.key] = value;
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,item)
    }
    createCustomEditor(item,def,provider) {
        if(def.key === 'src') return <URLFileEditor def={def} item={item} provider={provider}/>
        return <i>no custom editor for {def.key}</i>
    }
    createRect() {
        return {
            id: genID('rect'),
            type:'rect',
            title:'rect1',
            tx:20,
            ty:30,
            x:0,
            y:0,
            w:40,
            h:40,
            rx:0,
            ry:0,
            color:'white',
            stroke:'black',
            strokeWidth:1.0,
            strokeStyle:'solid',
            visible:true,
        }
    }
    createCircle() {
        return {
            id: genID('circle'),
            type:'circle',
            title:'circle 1',
            tx:100,
            ty:200,
            cx:0,
            cy:0,
            r: 50,
            color:'red',
            stroke:'black',
            strokeWidth:1.0,
            visible:true,
        }
    }
    createText() {
        return {
            id: genID('text'),
            type:'text',
            title:'next text',
            tx:300,
            ty:100,
            x: 0,
            y: 0,
            color: 'black',
            visible:true,
            text:'the text',
            fontSize:24,
            fontFamily:'serif',
            textAnchor:'start'
        }
    }
    createArrow() {
        return {
            id:this.genID('arrow'),
            type:'arrow',
            title:'next arrow',
            tx:300,
            ty:100,
            color: 'black',
            visible:true,
            cx1:0,
            cy1:0,
            cx2:100,
            cy2:100,
            stroke:'black',
            strokeWidth:10.0,
        }
    }
    createEllipse() {
        return {
            id:this.genID('ellipse'),
            type:'ellipse',
            title:'next ellipse',
            tx:300,
            ty:100,
            color: 'white',
            visible:true,
            w:100,
            h:50,
            stroke:'black',
            strokeWidth:1.0,
        }
    }
    createImage() {
        return {
            id:this.genID('image'),
            type:'image',
            title:'an image',
            src:"",
            tx:300,
            ty:100,
            visible:true,
            w:100,
            h:100,
            stroke:'black',
            strokeWidth:1.0,
        }
    }

    getNearestAllowedParentNode(parent,child) {
        if(parent === null) return this.root
        while(true) {
            if(this.canHaveChild(parent,child)) return parent
            parent = this.findParent(this.getSceneRoot(),parent)
            if(!parent) return null
        }
    }

    addToNearestSelectedParent(rect) {
        let parent = this.getNearestAllowedParentNode(Selection.getSelection(),rect)
        if(parent) {
            this.appendChild(parent,rect)
            Selection.setSelection(rect)
        }
    }

    generateSelectionPath(node) {
        if(!node || !node.id) return []
        if(!node.parent) return [node.id]
        return this.generateSelectionPath(node.parent).concat([node.id])
    }
    findNodeFromSelectionPath(node,path) {
        const part = path[0]
        if(node.id === part) {
            if(path.length <= 1) return node
            for(let i=0; i<node.children.length; i++) {
                const child = node.children[i]
                const res = this.findNodeFromSelectionPath(child,path.slice(1))
                if(res) return res
            }
        }
        return null
    }

    getViewActions() {
        return [
            {
                title: 'zoom in',
                icon: '',
                fun: () => this.setState({scale: this.state.scale - 1})
            },
            {
                title: 'zoom out',
                icon: '',
                fun: () => this.setState({scale: this.state.scale + 1})
            }
        ]
    }

    getTreeActions() {
        return [
            {
                title: 'object',
                icon: 'plus',
                type: 'menu',
                actions: [

                    {
                        title: 'rect',
                        icon: 'square',
                        fun: () => this.addToNearestSelectedParent(this.createRect())
                    },
                    {
                        title: 'circle',
                        icon: 'circle',
                        fun: () => this.addToNearestSelectedParent(this.createCircle())
                    },
                    {
                        title: 'ellipse',
                        icon: 'circle',
                        fun: () => this.addToNearestSelectedParent(this.createEllipse())
                    },
                    {
                        title: 'arrow',
                        icon: 'long-arrow-right',
                        fun: () => this.addToNearestSelectedParent(this.createArrow())
                    },
                    {
                        title: 'text',
                        icon: 'text-width',
                        fun: () => this.addToNearestSelectedParent(this.createText())
                    },
                    {
                        title: 'image',
                        icon: 'image',
                        fun: () => this.addToNearestSelectedParent(this.createImage())
                    },
                ]
            },
            {
                icon:'close',
                fun: () => {
                    let node = Selection.getSelection()
                    this.deleteNode(node)
                }
            },
            {
                title:'export',
                icon:'save',
                fun: () => {
                    console.log("saving to SVG")
                    const svg = ReactDOMServer.renderToString(<CanvasSVG root={this.getSceneRoot()} scale={1}/>);
                    console.log("rendered SVG = ",svg)
                    /*
                    //for a preview
                    const win = window.open("","test SVG")
                    win.document.body.innerHTML = svg
                    */
                    const link = document.createElement('a');
                    link.href = 'data:image/svg+xml,'+encodeURIComponent(svg)
                    link.download = 'test.svg'
                    document.body.appendChild(link)
                    link.click()
                }
            }
        ]
    }

    getTools() {
        return this.tools
    }
}



class URLFileEditor extends Component {
    constructor(props) {
        super(props)
        this.state = {
            text:""
        }
        if(props.def.value) {
            this.state.text = props.def.value
        }
    }
    editText = (e) => {
        this.setState({text:e.target.value})
    }
    choseFile = (e) => {
        console.log("chose a file",e.target.files)
        this.setState({text:e.target.files[0].name})
        const fr = new FileReader()
        fr.onload = (e)=>{
            console.log("loaded file",e.target.result)
            this.props.provider.setPropertyValue(this.props.item,this.props.def,e.target.result)
        }
        fr.readAsDataURL(e.target.files[0])
        this.props.provider.uploadFile(e.target.files[0]).then((ans)=>{
            console.log("got back the asnwer",ans)
            const url = SERVER_URL_ASSETS+ans.id
            this.props.provider.setPropertyValue(this.props.item,this.props.def,url)
            this.setState({text:url})
        })
    }
    render() {
        return <div>
            <input type="text" onChange={this.editText} value={this.state.text}/>
            <input type="file" onChange={this.choseFile}/>
        </div>
    }
}

