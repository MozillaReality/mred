import React, { Component } from 'react';
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "./TreeItemProvider";
// import selMan, {SELECTION_MANAGER} from "./SelectionManager";
// import Selection from "./SelectionManager";

const data = {
    root: {
        title:'stack',
        type:'stack',
        children: [
            {
                type:'scene',
                id:'scene1',
                title:'Opening Scene',
                children:[
                    {
                        id:'cube1',
                        type:'cube',
                        title:'first cube',
                        x:0,
                        y:0,
                        z:-5,
                        size:1,
                        color:'yellow',
                    },
                ]
            },
        ]
    }
}

class HypercardCanvas3D extends Component {
    render() {
        return <div>I'm a canvas for 3d stuff</div>
    }
}

export const SceneItemRenderer = (props) => {
    const type = props.item.type;
    if(type === 'cube')   return <div><i className="fa fa-square"/> {props.item.title}</div>
    if(type === 'stack')  return <div><i className="fa fa-table"/> {props.item.title}</div>
    if(type === 'scene')  return <div><i className="fa fa-vcard"/> {props.item.title}</div>
    return <div>unknown item type = {type}</div>
}


export default class HypercardEditor extends TreeItemProvider {
    constructor() {
        super()
        this.root = data.root;
    }
    getTitle() {
        return 'Hypercard 3D'
    }
    getSceneRoot() {
        return this.root
    }
    getCanvas() {
        return <HypercardCanvas3D provider={this}/>
    }
    getChildren(item) {
        if(item.children) item.children.forEach((ch)=> ch.parent = item)
        return item.children;
    }
    hasChildren(item) {
        return (item.children && item.children.length>0)
    }
    getRendererForItem(item) {
        return <SceneItemRenderer item={item}/>
    }
    getProperties(item) {
        let defs = []
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
            if(key === 'z') type = 'number'
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
}