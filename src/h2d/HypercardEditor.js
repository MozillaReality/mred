import React, { Component } from 'react';
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import Selection from "../SelectionManager";
import {genID, makePoint, parseOptions, shallowCopy} from '../utils'
import HypercardApp from './HypercardApp'
import URLFileEditor from '../common/URLFileEditor'


const PROP_DEFS = {
    fontSize: {
        name:'Font Size',
        key:'fontSize',
        type:'number',
        locked:false
    }
}

export default class HypercardEditor extends TreeItemProvider {
    constructor() {
        super()
        this.root = this.makeEmptyRoot()
        this.id_index = {}
    }
    getApp() {
        return <HypercardApp provider={this}/>
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
            children: [this.createCard(), this.createFontStack()]
        }
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
                if(!card.backgroundColor) card.backgroundColor = 'white'
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
    moveChildToBack(item) {
        const parent = this.getParent(item)
        const n = parent.children.indexOf(item)
        parent.children.splice(n,1)
        parent.children.splice(0,0,item)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,parent)
    }
    getProperties(item) {
        var defs = [];
        if(!item) return defs;
        Object.keys(item).forEach((key)=>{
            if(key === 'children') return;
            if(key === 'parent') return;

            if(PROP_DEFS[key]) {
                const def = shallowCopy(PROP_DEFS[key])
                def.value = item[key]
                defs.push(def)
                return
            }
            let name = key
            let type = 'string'
            let locked = false
            let custom = false
            let live = false
            let hints = {}
            if(key === 'visible') type = 'boolean'
            if(key === 'type') locked = true
            if(key === 'id') locked = true
            if(key === 'x') type = 'number'
            if(key === 'y') type = 'number'
            if(key === 'w' || key === 'h') {
                type = 'number'
                hints.min = 1
            }
            if(key === 'color') type = 'color'
            if(key === 'backgroundColor') {
                type = 'color'
                name = 'BG Color'
            }
            if(key === 'stroke') type = 'color'
            if(key === 'strokeWidth') type = 'number'
            if(key === 'target') type = 'enum'
            if(key === 'text') {
                type = 'string'
                live = true
            }
            if(key === 'src') {
                type = 'string'
                custom = true
            }
            if(key === 'fontFamily') {
                type = 'enum'
            }
            defs.push({
                name:name,
                key:key,
                value:item[key],
                type:type,
                locked:locked,
                custom:custom,
                hints:hints,
                live:live
            })
        })
        return defs;
    }
    getPropertyValue(item,key) {
        return item[key]
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
    createCustomEditor(item,def,provider) {
        if(def.key === 'src') return <URLFileEditor def={def} item={item} provider={provider}/>
        return <i>no custom editor for {def.key}</i>
    }

    getValuesForEnum(key) {
        if(key === 'target') return this.getSceneRoot().children.map((ch)=>ch.id)
        if(key === 'fontFamily') {
            const fontStack = this.root.children.find((node)=>node.type === 'fontstack')
            return fontStack.children.map((f)=>f.id)
        }
    }
    getRendererForEnum(key,obj) {
        if(key === 'target' || key === 'action') return IdToTitleRenderer
        if(key === 'fontFamily') return IdToTitleRenderer
        return null
    }

    createCard() {
        return {
            id: this.genID('card'),
            type: 'card',
            title: 'untitled card',
            children: [],
            backgroundColor: 'white'
        }
    }
    createFontStack() {
        return {
            id: this.genID('fontstack'),
            type:'fontstack',
            title:'fonts',
            children:[
                {
                    type:'font',
                    id:this.genID('font'),
                    title:'Sans Serif',
                    key:'sans-serif',
                    url:''
                },
                {
                    type:'font',
                    id:this.genID('font'),
                    title:'Serif',
                    key:'serif',
                    url:''
                },
                {
                    type:'font',
                    id:this.genID('font'),
                    title:'Oswald',
                    key:`'Oswald', sans-serif`,
                    url:'https://fonts.googleapis.com/css?family=Oswald'
                }
            ]
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
            target: 'card1',
            fontSize:24,
            fontFamily:''
        }
    }
    createImage() {
        return {
            id:this.genID('image'),
            type:'image',
            title:'image',
            x: 100,
            y: 100,
            w: 50,
            h: 50,
            src:""
        }
    }
    findSelectedCard() {
        let sel = Selection.getSelection()
        if(!sel) return this.getSceneRoot().children[0]
        if(sel.type === 'card') return sel
        if(sel === this.getSceneRoot()) return this.getSceneRoot().children[0]
        return this.getParent(sel)
    }
    deleteChild(child) {
        const parent = this.findParent(this.getSceneRoot(),child)
        const index = parent.children.indexOf(child)
        if(index<0) return console.log("not really the parent. invalid!")
        parent.children.splice(index,1)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,parent);
        Selection.setSelection(parent)
    }
    insertNodeBefore(parent, target, node) {
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

    calculateContextMenu() {
        return [
            {
                title:'delete',
                icon:'close',
                fun: () => {
                    let node = Selection.getSelection()
                    this.deleteChild(node)
                }
            },
            {
                title:'move to back',
                fun: () => {
                    let node = Selection.getSelection()
                    this.moveChildToBack(node)
                }
            }
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

export const HypercardItemRenderer = (props) => {
    const type = props.item.type;
    if(type === 'rect')   return <div><i className="fa fa-square"/> {props.item.title}</div>
    if(type === 'text') return <div><i className="fa fa-text-width"/> {props.item.title}</div>
    if(type === 'stack')  return <div><i className="fa fa-table"/> {props.item.title}</div>
    if(type === 'card')  return <div><i className="fa fa-vcard"/> {props.item.title}</div>
    if(type === 'image')  return <div><i className="fa fa-image"/> {props.item.title}</div>
    if(type === 'fontstack') return <div>fonts</div>
    if(type === 'font') return <div>{props.item.title}</div>
    return <div>unknown item type = {type}</div>
}

const IdToTitleRenderer = (props) => {
    let value = "nothing selected"
    if(props.value && props.provider) {
        const node = props.provider.findNodeById(props.value)
        if(node) value = node.title
    }
    return <b>{value}</b>
}
