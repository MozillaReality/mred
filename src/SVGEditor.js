import React, { Component } from 'react';
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "./TreeItemProvider";
import Selection, {SELECTION_MANAGER} from './SelectionManager'
import ReactDOMServer from 'react-dom/server';
import {genID, makePoint} from './utils'

export class CanvasSVG extends Component {
    constructor(props) {
        super(props);
        this.down = false
        this.state = {
            selection:null
        }
    }
    componentDidMount() {
        Selection.on(SELECTION_MANAGER.CHANGED,()=>{
            this.setState({selection:Selection.getSelection()})
        })
    }

    mouseDown = (e,item) => {
        e.stopPropagation()
        e.preventDefault()
        const svgcanvas = document.getElementById('svg-canvas');
        const canvasBounds = svgcanvas.getBoundingClientRect()
        this.start = makePoint(canvasBounds.x,canvasBounds.y)
        this.scale = svgcanvas.viewBox.baseVal.width/canvasBounds.width
        const translate = makePoint(item.tx, item.ty)
        this.inset = makePoint(e.clientX, e.clientY).minus(this.start).multiply(this.scale).minus(translate)
        this.down = true
        this.item = item
        Selection.setSelection(item)
        window.document.addEventListener('mousemove',this.mouseMove)
        window.document.addEventListener('mouseup',this.mouseUp)
    }
    mouseMove = (e) => {
        if(!this.down) return
        e.stopPropagation()
        e.preventDefault()
        const off = makePoint(e.clientX,e.clientY).minus(this.start).multiply(this.scale).minus(this.inset)
        const defX = this.props.provider.getDefForProperty(this.item,'tx')
        this.props.provider.setPropertyValue(this.item,defX,off.x)
        const defY = this.props.provider.getDefForProperty(this.item,'ty')
        this.props.provider.setPropertyValue(this.item,defY,off.y)
    }
    mouseUp = (e) => {
        this.start = null
        this.scale = 1
        this.down = false
        this.item = null
        window.document.removeEventListener('mousemove',this.mouseMove)
        window.document.removeEventListener('mouseup',this.mouseUp)
    }

    handleMouseDown = (e, item, prop) => {
        e.stopPropagation()
        e.preventDefault()
        const svgcanvas = document.getElementById('svg-canvas');
        const canvasBounds = svgcanvas.getBoundingClientRect()
        this.start = makePoint(canvasBounds.x,canvasBounds.y)
        this.scale = svgcanvas.viewBox.baseVal.width/canvasBounds.width
        const l1 = (e)=>{
            const off = makePoint(e.clientX,e.clientY).minus(this.start).multiply(this.scale)
            let defX = null;
            let defY = null;
            if(prop === 'c1') {
                defX = this.props.provider.getDefForProperty(item, 'cx1')
                defY = this.props.provider.getDefForProperty(item, 'cy1')
            }
            if(prop === 'c2') {
                defX = this.props.provider.getDefForProperty(item, 'cx2')
                defY = this.props.provider.getDefForProperty(item, 'cy2')
            }
            if(prop === 'wh') {
                defX = this.props.provider.getDefForProperty(item, 'w')
                defY = this.props.provider.getDefForProperty(item, 'h')
            }
            if(prop === 'r') {
                defX = this.props.provider.getDefForProperty(item, 'r')
            }

            if(defX) this.props.provider.setPropertyValue(item,defX,off.x-item.tx)
            if(defY) this.props.provider.setPropertyValue(item,defY,off.y-item.ty)
        }
        const l2 = (e)=>{
            window.document.removeEventListener('mousemove',l1)
            window.document.removeEventListener('mouseup',l2)
        }
        window.document.addEventListener('mousemove',l1)
        window.document.addEventListener('mouseup',l2)
    }
    render() {
        return this.drawSVG(this.props.root, 0)
    }
    drawSVG(item,key) {
        if(!item) return "";
        const type = item.type;
        if (type === 'scene')  return this.drawSVGRoot(item,key);
        if (type === 'rect')   return this.drawRect(item,key)
        if (type === 'circle') return this.drawCircle(item,key)
        if (type === 'text')   return this.drawText(item,key);
        if (type === 'group')  return this.drawGroup(item,key);
        if (type === 'ellipse') return this.drawEllipse(item,key)
        if (type === 'arrow') return this.drawArrow(item,key)
        if (type === 'image') return this.drawImage(item,key)
    }
    drawChildren(item) {
        return item.children.map((it, i) => this.drawSVG(it, i));
    }
    drawRect(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let strokeDashArray = null;
        if(item.strokeStyle) {
            if(item.strokeStyle === 'solid') {
                strokeDashArray = null
            }
            if(item.strokeStyle === 'dotted') {
                strokeDashArray = `${strokeWidth},${strokeWidth}`
            }
            if(item.strokeStyle === 'dashed') {
                strokeDashArray = `${strokeWidth*4},${strokeWidth*4}`
            }
        }
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <rect key={key}
                     x={item.x} y={item.y} width={item.w} height={item.h}
                     rx={item.rx} ry={item.ry}
                     fill={item.color} visibility={vis}
                     className={classname}
                     stroke={stroke} strokeWidth={strokeWidth}
                     strokeDasharray={strokeDashArray}
                     transform={`translate(${item.tx},${item.ty})`}
                     onMouseDown={(e)=>this.mouseDown(e,item)}
        />
    }
    drawCircle(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <circle cx={item.cx} cy={item.cy} r={item.r} fill={item.color} key={key}
                       className={classname}
                       transform={`translate(${item.tx},${item.ty})`}
                       onMouseDown={(e)=>this.mouseDown(e,item)}
                       visibility={vis} stroke={stroke} strokeWidth={strokeWidth}/>
    }
    drawEllipse(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <ellipse
            cx={item.cx}
            cy={item.cy}
            rx={item.w}
            ry={item.h}
            fill={item.color}
            key={key}
                       className={classname}
                       transform={`translate(${item.tx},${item.ty})`}
                       onMouseDown={(e)=>this.mouseDown(e,item)}
                       visibility={vis} stroke={stroke} strokeWidth={strokeWidth}
        />
    }
    drawArrow(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return  <line
            key={key}
            transform={`translate(${item.tx},${item.ty})`}
            onMouseDown={(e)=>this.mouseDown(e,item)}
            x1={item.cx1}
            y1={item.cy1}
            x2={item.cx2}
            y2={item.cy2}
            stroke={stroke} strokeWidth={strokeWidth} markerEnd="url(#arrow-head)" />
    }
    drawImage(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <image key={key}
                      href={item.src}
                      width={item.w} height={item.h}
                      className={classname}
                      // preserveAspectRatio="none"
                      stroke={stroke} strokeWidth={strokeWidth}
                      transform={`translate(${item.tx},${item.ty})`}
                      onMouseDown={(e)=>this.mouseDown(e,item)}
                      />
    }
    drawText(item,key) {
        const vis = item.visible?'visible':'hidden';
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <text key={key} x={item.x} y={item.y}
                     className={classname}
                     transform={`translate(${item.tx},${item.ty})`}
                     onMouseDown={(e)=>this.mouseDown(e,item)}
                     fill={item.color} fontSize={item.fontSize}
                     fontFamily={item.fontFamily} visibility={vis} textAnchor={item.textAnchor}
                     style={{cursor:'default'}}
        >{item.text}</text>
    }
    drawGroup(item, key) {
        const vis = item.visible?'visible':'hidden';
        return <g key={key} transform={`translate(${item.tx},${item.ty})`} visibility={vis}>{this.drawChildren(item)}</g>
    }
    drawSVGRoot(item, key) {
        return <svg key={key} id="svg-canvas" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <marker id="arrow-head" markerWidth="5" markerHeight="5"
                        refX="0" refY="2.5"
                        orient="auto" markerUnits="strokeWidth"
                        fill="inherit"
                >
                    <path d="M0,0 L0,5 L5,2.5 z" />
                </marker>
            </defs>
            {this.drawChildren(item)}
            {this.drawSelectionHandles(Selection.getSelection())}
            </svg>
    }
    drawSelectionHandles(item) {
        if(!item) return
        if(item.type === 'arrow') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.cx1-15} y={item.cy1-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'c1')}
                />
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.cx2-15} y={item.cy2-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'c2')}
                />
            </g>
        }
        if(item.type === 'rect') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.w-15} y={item.h-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'wh')}
                />
            </g>
        }
        if(item.type === 'image') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.w-15} y={item.h-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'wh')}
                />
            </g>
        }
        if(item.type === 'ellipse') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.w-15} y={item.h-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'wh')}
                />
            </g>
        }
        if(item.type === 'circle') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.r-15} y={item.cy-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'r')}
                />
            </g>
        }
    }
}

function treeToSVGString(root) {
    return ReactDOMServer.renderToString(<CanvasSVG root={root} scale={1}/>);
}

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
            defs.push({
                name:key,
                key:key,
                value:item[key],
                type:type,
                locked:locked,
            })
        })
        return defs;
    }
    setPropertyValue(item,def,value) {
        if(def.type === 'number') value = parseFloat(value);
        item[def.key] = value;
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,item)
    }
    getCanvas() {
        return <CanvasSVG root={this.getSceneRoot()} provider={this} scale={1}/>
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
    findNodeById(id) {
        return this.id_index[id]
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
                    const svg = treeToSVGString(this.getSceneRoot())
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





