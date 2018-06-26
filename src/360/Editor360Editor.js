import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {genID, shallowCopy} from '../utils'
import Selection, {SELECTION_MANAGER} from '../SelectionManager'
import App360 from './App360'

const PROP_DEFS = {
    id: {
        name:'ID',
        type:'string',
        key:'id',
        locked:true
    },
    type: {
        name:'Type',
        type:'string',
        key:'type',
        locked:true
    },
    title: {
        name:'Title',
        type:'string',
        key:'title',
        locked:false
    },
    primitive: {
        key:'primitive',
        type:'string',
        locked:true,
        hidden:true,
    },
    width: {
        name:'Width',
        key:'width',
        type:'number',
        locked:false,
    },
    depth: {
        name:'Depth',
        key:'depth',
        type:'number',
        locked:false,
    },
    height: {
        name:'height',
        key:'height',
        type:'number',
        locked:false,
    },
    elevation: {
        name:'elevation',
        key:'elevation',
        type:'number',
        locked:false,
        min: -10,
        max: 10
    },
    angle: {
        name:'angle',
        key:'angle',
        type:'number',
        locked:false,
        min: 0,
        max: 360
    },
    text: {
        name:'text',
        key:'text',
        type:'string',
        locked:false
    },
    fontSize: {
        name:'fontSize',
        key:'fontSize',
        type:'number',
        locked:false
    },
    assetid: {
        name:'Asset ID',
        key:'assetid',
        type:'string',
        locked:true
    },
    imageid: {
        name: 'Image ID',
        key:'imageid',
        type:'enum',
        locked:false,
    }

}


export class Editor360Provider extends TreeItemProvider {
    constructor() {
        super()
        this.root = this.makeEmptyRoot()
        this.id_index = {}
    }

    /* general stuff */
    getApp() {
        return <App360 provider={this}/>
    }
    getTitle() {
        return "360 Experience Editor"
    }


    /* ============= document model =========== */

    getDocType() {
        return "360"
    }
    setDocument(doc,docid) {
        super.setDocument(doc, docid)
        this.id_index = {}
        this.root.children.forEach(node => this.setParent(node,this.root))
    }
    setParent(node,parent) {
        this.id_index[node.id] = node
        node.parent = parent
        if(node.children) {
            node.children.forEach(n => this.setParent(n,node))
        }
    }
    makeEmptyRoot() {
        return {
            title:'stack',
            type:'stack',
            id: genID('stack'),
            children: [this.createScenes(),this.createAssets()],
        }
    }
    createScenes() {
        return {
            id: this.genID('scenes'),
            type: 'scenes',
            title: 'scenes',
            children: [this.createScene('scene1'), this.createScene('scene2')],
        }
    }
    createScene(title) {
        return {
            id: this.genID('scene'),
            type: 'scene',
            title: title?title:'untitled scene',
            children: [this.createLayer()],
        }
    }
    createAssets() {
        return {
            id: this.genID('assets'),
            type: 'assets',
            children:[]
        }
    }
    createLayer() {
        return {
            id: this.genID('layer'),
            type:'layer',
            title:'A Layer',
            children: [],
        }
    }
    createCube() {
        return {
            id: this.genID('cube'),
            type:'primitive',
            primitive:'cube',
            width:1,
            height:1,
            depth:1,
            angle:0,
            elevation:0,
            title:'Cube',
        }
    }
    createText() {
        return {
            id: this.genID('text'),
            type:'primitive',
            primitive:'text',
            angle:0,
            elevation:0,
            text:'some text',
            fontSize:36,
            title:'Cube',
        }
    }
    createImageObject() {
        return {
            id: this.genID('image-object'),
            type:'primitive',
            primitive:'image2d',
            angle:0,
            elevation:0,
            imageid:null,
            title:'Image',
        }
    }
    appendChild(parent,item) {
        this.id_index[item.id] = item
        item.parent = parent
        parent.children.push(item);
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_ADDED,{
            provider:this,
            parent:parent,
            child:item
        });
    }
    create2DImageAssetWithId(id) {
        return {
            id:this.genID('asset'),
            type:'asset',
            assetid:id,
            title:'some asset'
        }
    }
    getAssetsRoot() {
        return this.getSceneRoot().children[1]
    }



    /* ============ properties ============== */
    getProperties(item) {
        const defs = [];
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
            throw new Error(`unknown property '${key}'`)

        })
        return defs;
    }
    setPropertyValues(item, updates) {
        const olds = {}
        const news = {}
        Object.keys(updates).forEach((key)=>{
            olds[key] = item[key]
            news[key] = updates[key]
            item[key] = updates[key]
        })
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, {
            provider:this,
            node:item,
            newValues:news,
            oldValues:olds
        })
    }
    setPropertyValueByName(item,key,value) {
        const updates = { }
        updates[key] = value
        this.setPropertyValues(item,updates)
    }

    getValuesForEnum(key,obj) {
        if(key === PROP_DEFS.imageid.key) {
            return this.getAssetsRoot().children.map(ass=>ass.id)
        }
    }
    getRendererForEnum(key,obj) {
        if(key === PROP_DEFS.imageid.key) {
            return IdToNameRenderer
        }
    }


    /* ========= selection =========== */
    findSceneParent(o) {
        if(o.type === 'scene') return o
        return this.findSceneParent(o.parent)
    }
    findLayerParent(o) {
        if(o.type === 'layer') return o
        return this.findLayerParent(o.parent)
    }
    findSelectedScene() {
        let sel = Selection.getSelection()
        if(!sel) return this.getSceneRoot().children[0].children[0]
        if(sel === this.getSceneRoot()) return null
        if(sel.type === 'scenes') return null
        if(sel.type === 'assets') return null
        if(sel.type === 'asset') return null
        return this.findSceneParent(sel)
    }
    findSelectedLayer() {
        let sel = Selection.getSelection()
        if(!sel || sel.type === 'stack') return this.getSceneRoot().children[0].children[0]
        if(sel.type === 'scene') return sel.children[0]
        if(sel.type === 'layer') return sel
        return this.findLayerParent(sel)
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
    findAssetById(id) {
        return this.getAssetsRoot().children.find(a => a.id === id)
    }




        /* ========== renderers ============ */
    getRendererForItem(item) {
        if(item.type === 'stack')  return <div>Project</div>
        if(item.type === 'scenes') return <div><i className="fa fa-book"/> Scenes</div>
        if(item.type === 'assets') return <div><i className="fa fa-folder"/> Assets</div>
        if(item.type === 'scene')  return <div><i className="fa fa-globe"/> {item.title}</div>
        if(item.type === 'layer')  return <div><i className="fa fa-cubes"/> {item.title}</div>
        if(item.type === 'asset')  return <div><i className="fa fa-image"/> {item.assetid}</div>
        if(item.type === 'primitive') {
            if(item.primitive === 'cube') {
                return <div><i className="fa fa-cube"/> {item.title}</div>
            }
            if(item.primitive === 'text') {
                return <div><i className="fa fa-font"/> {item.text}</div>
            }
            if(item.primitive === 'image2d') {
                return <div><i className="fa fa-image"/> image</div>
            }
        }
        return <div><i className="fa fa-diamond"/>foo</div>
    }
}


const IdToNameRenderer = (props) => {
    let value = "---"
    console.log("props",props)
    if(props.value && props.provider) value = props.provider.findAssetById(props.value).assetid
    return <b>{value}</b>
}
