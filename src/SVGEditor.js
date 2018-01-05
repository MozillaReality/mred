import React, { Component } from 'react';
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "./TreeItemProvider";
import Selection from "./SelectionManager";
import ReactDOMServer from 'react-dom/server';

export class CanvasSVG extends Component {
    constructor(props) {
        super(props);
        this.down = false
    }

    mouseDown = (e,item) => {
        e.stopPropagation()
        e.preventDefault()
        const rect = e.target.getBoundingClientRect()
        this.start = { x: item.x, y: item.y}
        this.down = true
        this.item = item
        this.rect = rect
        Selection.setSelection(item)
        window.document.addEventListener('mousemove',this.mouseMove)
        window.document.addEventListener('mouseup',this.mouseUp)
    }
    mouseMove = (e) => {
        if(!this.down) return
        e.stopPropagation()
        e.preventDefault()
        const newX = e.clientX - this.rect.x + this.start.x
        const newY = e.clientY - this.rect.y + this.start.y
        const defX = this.props.provider.getDefForProperty(this.item,'x')
        this.props.provider.setPropertyValue(this.item,defX,newX)
        const defY = this.props.provider.getDefForProperty(this.item,'y')
        this.props.provider.setPropertyValue(this.item,defY,newY)
    }
    mouseUp = (e) => {
        this.down = false
        this.start = null
        this.item = null
        this.rect = null
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
                     onMouseDown={(e)=>this.mouseDown(e,item)}
        />
    }
    drawCircle(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        return <circle cx={item.cx} cy={item.cy} r={item.r} fill={item.color} key={key} visibility={vis} stroke={stroke} strokeWidth={strokeWidth}/>
    }

    drawGroup(item, key) {
        const vis = item.visible?'visible':'hidden';
        return <g key={key} transform={`translate(${item.tx},${item.ty})`} visibility={vis}>{this.drawChildren(item)}</g>
    }

    drawSVGRoot(item, key) {
        return <svg key={key} viewBox="0 0 548 800" xmlns="http://www.w3.org/2000/svg">{this.drawChildren(item)}</svg>
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
    return <div>unknown item type</div>
}

const STROKE_STYLES = ['solid','dotted','dashed']

export const data = {
    root: {
        title:'root',
        type:'scene',
        children:[
            {
                type:'rect',
                title:'rect1',
                x:20,
                y:30,
                w:40,
                h:40,
                color:'red',
                stroke:'black',
                strokeWidth:2.0,
                visible:true,
                children:[]
            },
            {
                type:'group',
                title:'some group',
                tx:100,
                ty:50,
                visible:true,
                children:[
                    {
                        type:'rect',
                        title:'rect2',
                        x:0,
                        y:0,
                        w:50,
                        h:50,
                        color:'yellow',
                        visible:true,
                        stroke:'black',
                        strokeWidth:2.0,
                        strokeStyle:STROKE_STYLES[0]
                    },
                    {
                        type:'rect',
                        title:'rect2',
                        x:20,
                        y:20,
                        w:50,
                        h:50,
                        color:'yellow',
                        visible:true,
                        stroke:'black',
                        strokeWidth:2.0,
                        strokeStyle:STROKE_STYLES[1]
                    },
                    {
                        type:'rect',
                        title:'rect2',
                        x:40,
                        y:40,
                        w:50,
                        h:50,
                        color:'yellow',
                        visible:true,
                        stroke:'black',
                        strokeWidth:2.0,
                        strokeStyle:STROKE_STYLES[2]
                    },

                ]
            },
            {
                type:'circle',
                title:'next circle',
                cx:100,
                cy:300,
                r:40,
                color:'blue',
                visible:true,
                stroke:'white',
                strokeWidth:2.0,
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
                //move actions
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
        return (item.children && item.children.length>0)
    }
    getChildren(item) {
        return item.children;
    }

    appendChild(parent,child) {
        parent.children.push(child);
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,child);
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


    getTreeActions() {
        return [
            {
                title:'rect',
                icon:'plus',
                fun: () => {
                    console.log("creating a rect")
                    let rect = this.createRect();
                    let node = Selection.getSelection()
                    if(this.hasChildren(node)) this.appendChild(node,rect)
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





