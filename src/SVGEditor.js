import React, { Component } from 'react';
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "./TreeItemProvider";
import Selection from "./SelectionManager";
import ReactDOMServer from 'react-dom/server';
import {makePoint} from './utils'

export class CanvasSVG extends Component {
    constructor(props) {
        super(props);
        this.down = false
    }

    mouseDown = (e,item) => {
        e.stopPropagation()
        e.preventDefault()
        const svgcanvas = document.getElementById('svg-canvas');
        const canvasBounds = svgcanvas.getBoundingClientRect()
        this.start = makePoint(canvasBounds.x,canvasBounds.y)
        this.scale = svgcanvas.viewBox.baseVal.width/canvasBounds.width
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
        const off = makePoint(e.clientX,e.clientY).minus(this.start).multiply(this.scale)
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
        return <rect key={key} x={item.x} y={item.y} width={item.w} height={item.h} fill={item.color} visibility={vis}
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
        return <circle cx={item.cx} cy={item.cy} r={item.r} fill={item.color} key={key}
                       transform={`translate(${item.tx},${item.ty})`}
                       onMouseDown={(e)=>this.mouseDown(e,item)}
                       visibility={vis} stroke={stroke} strokeWidth={strokeWidth}/>
    }
    drawText(item,key) {
        const vis = item.visible?'visible':'hidden';
        return <text key={key} x={item.x} y={item.y}
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
        return <svg key={key} id="svg-canvas" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">{this.drawChildren(item)}</svg>
    }
}

function treeToSVGString(root) {
    return ReactDOMServer.renderToString(<CanvasSVG root={root}/>);
}

export const SceneItemRenderer = (props) => {
    const type = props.item.type;
    if(type === 'rect')   return <div><i className="fa fa-square"/> {props.item.title}</div>
    if(type === 'circle') return <div><i className="fa fa-circle"/> {props.item.title}</div>
    if(type === 'scene')  return <div><i className="fa fa-diamond"/> {props.item.title}</div>
    if(type === 'group')  return <div><i className="fa fa-object-group"/> {props.item.title}</div>
    if(type === 'text')   return <div><i className="fa fa-text-width"/>{props.item.title}</div>
    return <div>unknown item type</div>
}

const STROKE_STYLES = ['solid','dotted','dashed']
const FONT_FAMILIES = ['serif','sans-serif','monospace']
const TEXT_ANCHORS = ['start','middle','end']

export const data = {
    root: {
        title:'root',
        type:'scene',
        children:[
            {
                type:'rect',
                title:'rect1',
                x:0,
                y:0,
                tx:200,
                ty:200,
                w:40,
                h:40,
                color:'red',
                stroke:'black',
                strokeWidth:2.0,
                visible:true,
                children:[]
            }
        ]
    },
};

export default class SceneTreeItemProvider extends TreeItemProvider {
    constructor() {
        super();
        this.root = data.root;
        this.expanded_map = {};
        this.listeners = {};
        this.tools = [
            {
                //select / move action
                icon:'location-arrow',
                title:""
            }
        ]
    }
    getTitle() {
        return 'SVG'
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
    getChildren(item) {
        return item.children;
    }

    appendChild(parent,child) {
        parent.children.push(child);
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

    findParent(root,target) {
        if(root === target) return root
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
            if(key === 'color') type = 'color'
            if(key === 'stroke') type = 'color'
            if(key === 'strokeWidth') type = 'number'
            if(key === 'strokeStyle') type = 'enum'
            if(key === 'fontFamily') type = 'enum'
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
        return <CanvasSVG root={this.getSceneRoot()} provider={this}/>
    }
    createRect() {
        return {
            type:'rect',
            title:'rect1',
            x:20,
            y:30,
            w:40,
            h:40,
            color:'red',
            stroke:'black',
            strokeWidth:1.0,
            visible:true,
            children:[]
        }
    }
    createCircle() {
        return {
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
            children:[]
        }
    }
    createText() {
        return {
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


    getTreeActions() {
        return [
            {
                // title:'rect',
                icon:'square',
                fun: () => {
                    let rect = this.createRect();
                    let node = Selection.getSelection()
                    if(this.hasChildren(node)) this.appendChild(node,rect)
                }
            },
            {
                // title:'circle',
                icon:'circle',
                fun: () => {
                    let rect = this.createCircle();
                    let node = Selection.getSelection()
                    if(this.hasChildren(node)) this.appendChild(node,rect)
                }
            },
            {
                // title:'text',
                icon:'text-width',
                fun: () => {
                    let rect = this.createText();
                    let node = Selection.getSelection()
                    if(this.hasChildren(node)) this.appendChild(node,rect)
                }
            },
            {
                icon:'close',
                fun: () => {
                    let node = Selection.getSelection()
                    this.deleteNode(node)
                }
            },
            {
                title:'save',
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





