import React, { Component } from 'react';
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "./TreeItemProvider";
import selMan, {SELECTION_MANAGER} from "./SelectionManager";

const data = {
    root: {
        title:'stack',
        type:'stack',
        children: [
            {
                type:'card',
                id:'card1',
                title:'First card',
                children:[
                    {
                        id:'rect1',
                        type:'rect',
                        title:'first rect',
                        x:10,
                        y:10,
                        w:50,
                        h:50,
                        color:'yellow',
                    },
                    {
                        id:'text1',
                        type:'text',
                        title:'next card',
                        text:'the next card',
                        x:50,
                        y:100,
                        w:50,
                        h:50,
                        color:'black',
                        target: 'card2'
                    },
                ]
            },
            {
                type:'card',
                id:'card2',
                title:'Second Card',
                children: [
                    {
                        id:'rect2',
                        type:'rect',
                        title:'first rect',
                        x:200,
                        y:200,
                        w:50,
                        h:50,
                        color:'blue',
                    },
                    {
                        id:'text2',
                        type:'text',
                        title:'go back',
                        x:30,
                        y:30,
                        w:50,
                        h:50,
                        text:'go back',
                        color:'black',
                        target: 'card1'
                    },
                ]
            }
        ]
    }
}

class HypercardCanvas extends Component {
    constructor(props) {
        super(props)
        this.state = {
            mounted:false,
            selection:null
        }
    }
    componentWillReceiveProps() {
        this.redraw();
    }
    componentDidMount() {
        this.setState({mounted:true})
        setTimeout(()=>this.redraw(),100)
        this.sel_listener = selMan.on(SELECTION_MANAGER.CHANGED, (sel)=> {
            this.setState({selection:sel})
            setTimeout(()=>this.redraw(),100)
        })
    }
    redraw() {
        if(!this.state.mounted) return;
        const canvas = document.querySelector('#mycoolcanvas')
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = 'white';
        ctx.fillRect(0,0,canvas.width,canvas.height)
        if(!this.state.selection) return;
        const sel = this.state.selection.getSelection()
        if(sel.type === 'card') {
            this.drawCard(ctx,sel,sel);
        }
        if(sel.type === 'text' || sel.type === 'rect') {
            const card = this.props.provider.getParent(sel)
            this.drawCard(ctx,card,sel)
        }
    }
    drawCard(ctx,card,selected) {
        ctx.font = '16pt sans-serif'
        ctx.fillStyle = 'black';
        ctx.fillText(card.title,200, 20);
        card.children.forEach((item)=>{
            ctx.fillStyle = item.color;
            ctx.save();
            ctx.translate(item.x,item.y);
            if(item.type === 'rect') {
                ctx.fillRect(0,0,item.w,item.h)
                if(item === selected) {
                    ctx.strokeStyle = 'green'
                    ctx.strokeRect(-1,-1,item.w+2,item.h+2)
                }
            }
            if(item.type === 'text') {
                ctx.font = '20px sans-serif'
                ctx.fillText(item.text,0,0)
                if(item === selected) {
                    ctx.strokeStyle = 'green'
                    const ms = ctx.measureText(item.text)
                    ctx.strokeRect(-1,-21,ms.width+2,23)
                }
            }
            ctx.restore();
        })
    }
    render() {
        return <canvas id='mycoolcanvas' width={400} height={400}></canvas>
    }
}

export const HypercardItemRenderer = (props) => {
    const type = props.item.type;
    if(type === 'rect')   return <div><i className="fa fa-square"/> {props.item.title}</div>
    if(type === 'text') return <div><i className="fa fa-circle"/> {props.item.title}</div>
    if(type === 'stack')  return <div><i className="fa fa-diamond"/> {props.item.title}</div>
    if(type === 'card')  return <div><i className="fa fa-diamond"/> {props.item.title}</div>
    return <div>unknown item type = {type}</div>
}


export default class HypercardEditor extends TreeItemProvider {
    constructor() {
        super()
        this.root = data.root;
    }
    getTitle() {
        return "Hypercard 3D"
    }
    getSceneRoot() {
        return this.root;
    }
    getCanvas() {
        return <HypercardCanvas provider={this}/>
    }
    getChildren(item) {
        if(item.children) item.children.forEach((ch)=> ch.parent = item)
        return item.children;
    }
    getParent(item) {
        return item.parent;
    }
    hasChildren(item) {
        return (item.children && item.children.length>0)
    }
    getRendererForItem(item) {
        return <HypercardItemRenderer item={item}/>
    }
    appendChild(parent,item) {
        parent.children.push(item);
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,parent);
    }
    removeChild(parent,item) {
        parent.children = parent.children.filter((it)=>it.id !== item.id)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,parent)
    }
    getProperties(item) {
        var defs = [];
        if(!item) return defs;
        Object.keys(item).forEach((key)=>{
            if(key === 'children') return;
            if(key === 'parent') return;
            let type = 'string'
            let locked = false
            if(key === 'visible') type = 'boolean'
            if(key === 'type') locked = true
            if(key === 'id') locked = true
            if(key === 'x') type = 'number'
            if(key === 'color') type = 'color'
            if(key === 'stroke') type = 'color'
            if(key === 'strokeWidth') type = 'number'
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
}