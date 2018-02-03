import React, { Component } from 'react';
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "./TreeItemProvider";
import selMan, {SELECTION_MANAGER} from "./SelectionManager";
import Selection from "./SelectionManager";
import {genID, makePoint, parseOptions} from './utils'


const PROP_DEFS = {

}


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
                        w:250,
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

class CardComponent extends Component {
    clicked(item) {
        if(this.props.live && item.target) {
            console.log("going to the target",item.target)
            this.props.navTo(item.target)
        }
    }
    localToContainer = (e) => {
        const bounds = e.target.getBoundingClientRect()
        return makePoint(e.clientX - bounds.x, e.clientY - bounds.y)
    }
    windowToContainer = (e) => {
        const bds = this.container.getBoundingClientRect()
        return makePoint(e.clientX - bds.x, e.clientY - bds.y)
    }
    startDrag = (e, obj) => {
        e.stopPropagation()
        e.preventDefault()

        this.setState({
            dragging:true,
            start:this.localToContainer(e),
        })
        const l1 = (e) => {
            let pt = this.windowToContainer(e).minus(this.state.start)
            this.props.provider.setPropertyValueByName(obj,'x',pt.x)
            this.props.provider.setPropertyValueByName(obj,'y',pt.y)
        }
        const l2 = (e) => {
            window.removeEventListener('mousemove',l1)
            window.removeEventListener('mouseup',l2)
            this.setState({dragging:false})
        }
        window.addEventListener('mousemove',l1)
        window.addEventListener('mouseup',l2)
    }
    render() {
        const card = this.props.card
        return <div style={{position:'relative'}} ref={(ref)=>this.container = ref}>
            {card.children.map((item,i)=> { return this['renderItem_'+item.type](item,i)  })}
        </div>
    }
    renderItem_text(item,key) {
        return <div key={key}
                    style={{
                        position: 'absolute',
                        left:item.x+'px',
                        top:item.y+'px',
                        width:item.w+'px',
                        height:item.h+'px',
                        border:'1px solid black'
                    }}
                    onClick={()=>this.clicked(item)}
        >
            {item.text}
        </div>
    }
    renderItem_rect(item,key) {
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    style={{
                        position: 'absolute',
                        left:item.x+'px',
                        top:item.y+'px',
                        width:item.w+'px',
                        height:item.h+'px',
                        backgroundColor: item.color,
                        border:'1px solid black'
                    }}>
        </div>
    }
}

class HypercardCanvas extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selection:null
        }
    }
    componentDidMount() {
        this.sel_listener = selMan.on(SELECTION_MANAGER.CHANGED, (sel)=> {
            this.setState({selection:sel})
        })
    }
    render() {
        if(!this.state.selection) return <div>nothing selected</div>
        const sel = this.state.selection.getSelection()
        if(!sel) return <div>nothing selected</div>
        if(sel.type === 'card') {
            return <CardComponent card={sel} live={false} provider={this.props.provider}/>
        }
        if(sel.type === 'text' || sel.type === 'rect') {
            const card = this.props.provider.getParent(sel)
            return <CardComponent card={card} live={false} provider={this.props.provider}/>
        }
        return <div>invalid selection</div>
    }
}

export const HypercardItemRenderer = (props) => {
    const type = props.item.type;
    if(type === 'rect')   return <div><i className="fa fa-square"/> {props.item.title}</div>
    if(type === 'text') return <div><i className="fa fa-text-width"/> {props.item.title}</div>
    if(type === 'stack')  return <div><i className="fa fa-table"/> {props.item.title}</div>
    if(type === 'card')  return <div><i className="fa fa-vcard"/> {props.item.title}</div>
    return <div>unknown item type = {type}</div>
}

export default class HypercardEditor extends TreeItemProvider {
    constructor() {
        super()
        this.root = data.root;
        this.id_index = {}
    }
    getTitle() {
        return "HyperCard 2D"
    }
    getDocType() {
        return "hypercard-2d"
    }
    getSceneRoot() {
        return this.root;
    }
    makeEmptyRoot() {
        return {
            title:'stack',
            type:'stack',
            id: genID('stack'),
            children: [this.createCard()]
        }
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
    setDocument(doc,docid) {
        super.setDocument(doc, docid)
        this.id_index = {}
        this.root.children.forEach((card) => {
            this.id_index[card.id] = card
            card.children.forEach((item)=>{
                this.id_index[item.id] = item
            })
        })
    }
    findNodeById(id) {
        return this.id_index[id]
    }

    appendChild(parent,item) {
        this.id_index[item.id] = item
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
            if(key === 'y') type = 'number'
            if(key === 'w') type = 'number'
            if(key === 'h') type = 'number'
            if(key === 'color') type = 'color'
            if(key === 'stroke') type = 'color'
            if(key === 'strokeWidth') type = 'number'
            if(key === 'target') type = 'enum'
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
    setPropertyValueByName(item,name,value) {
        item[name] = value
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,item)
    }
    getValuesForEnum(key) {
        if(key === 'target') return this.getSceneRoot().children.map((ch)=>ch.id)
    }
    getRendererForEnum(key,obj) {
        if(key === 'target' || key === 'action') return IdToTitleRenderer;
        return null
    }

    createCard() {
        return {
            id: this.genID('card'),
            type: 'card',
            title: 'untitled card',
            children: []
        }
    }
    createRect() {
        return {
            id:this.genID('rect'),
            type:'rect',
            title:'a rect',
            x:30,
            y:10,
            w:50,
            h:50,
            color:'blue',
        }
    }
    createText() {
        return {
            id:this.genID('text'),
            type:'text',
            title:'text',
            x:130,
            y:130,
            w:50,
            h:50,
            text:'the text',
            color:'black',
            target: 'card1'
        }
    }
    findSelectedCard() {
        let sel = Selection.getSelection()
        if(!sel) return this.getSceneRoot().children[0]
        if(sel.type === 'card') return sel
        if(sel === this.getSceneRoot()) return this.getSceneRoot().children[0]
        return this.getParent(sel)
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

    getTreeActions() {
        return [
            {
                title:'',
                icon:'vcard',
                fun: () => {
                    let card = this.createCard();
                    let root = this.getSceneRoot()
                    this.appendChild(root,card)
                }
            },
            {
                title:'',
                icon:'square',
                fun: () => {
                    let sel = this.findSelectedCard()
                    let rect = this.createRect();
                    this.appendChild(sel,rect)
                }
            },
            {
                title:'',
                icon:'text-width',
                fun: () => this.appendChild(this.findSelectedCard(),this.createText())
            },
            {
                icon:'close',
                fun: () => {
                    let node = Selection.getSelection()
                    this.deleteNode(node)
                }
            },
        ]
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

}

const IdToTitleRenderer = (props) => {
    let value = "nothing selected"
    if(props.value && props.provider) {
        const node = props.provider.findNodeById(props.value)
        if(node) value = node.title
    }
    return <b>{value}</b>
}

export class Preview2D extends Component {
    constructor(props) {
        super(props)
        this.state = {
            doc:null,
            valid:false,
            current:null
        }
    }
    componentDidMount() {
        const opts = parseOptions({})
        console.log("preview starting with options",opts)
        this.provider = new HypercardEditor()
        this.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
        this.provider.loadDoc(opts.doc)
    }
    structureChanged = () => {
        const doc = this.provider.getSceneRoot()
        this.setState({doc: doc, current: doc.children[0], valid: true})
    }
    navTo = (target) => {
        const card = this.state.doc.children.find((card) => card.id === target)
        this.setState({current:card})
    }
    render() {
        if(!this.state.valid) return <div>invalid preview. please close and try again</div>
        return <CardComponent card={this.state.current} live={true} navTo={this.navTo}/>
    }
}