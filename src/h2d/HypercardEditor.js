import React, { Component } from 'react';
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import Selection from "../SelectionManager";
import {genID, makePoint, parseOptions, shallowCopy} from '../utils'
import HypercardApp from './HypercardApp'


const PROP_DEFS = {
    fontSize: {
        name:'Font Size',
        key:'fontSize',
        type:'number',
        locked:false
    }
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



export const HypercardItemRenderer = (props) => {
    const type = props.item.type;
    if(type === 'rect')   return <div><i className="fa fa-square"/> {props.item.title}</div>
    if(type === 'text') return <div><i className="fa fa-text-width"/> {props.item.title}</div>
    if(type === 'stack')  return <div><i className="fa fa-table"/> {props.item.title}</div>
    if(type === 'card')  return <div><i className="fa fa-vcard"/> {props.item.title}</div>
    if(type === 'image')  return <div><i className="fa fa-image"/> {props.item.title}</div>
    return <div>unknown item type = {type}</div>
}

export default class HypercardEditor extends TreeItemProvider {
    constructor() {
        super()
        this.root = data.root;
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
            children: [this.createCard()]
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

            if(PROP_DEFS[key]) {
                const def = shallowCopy(PROP_DEFS[key])
                def.value = item[key]
                defs.push(def)
                return
            }
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
            target: 'card1',
            fontSize:24
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

    calculateContextMenu() {
        return [
            {
                title:'delete',
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
