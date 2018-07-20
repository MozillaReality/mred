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
    radius: {
        name:'radius',
        key:'radius',
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
    resourceId: {
        name:'Resource Id',
        key:'resourceId',
        type:'string',
        locked:true,
    },
    resourceType: {
        name:"Resource Type",
        key:'resourceType',
        type:'string',
        locked:true,
    },
    imageid: {
        name: 'Image ID',
        key:'imageid',
        type:'enum',
        locked:false,
    },
    targetScene: {
        name:'target',
        key:'targetScene',
        type:'enum',
        locked:false
    },
    url: {
        name:'URL',
        key:'url',
        type:'string',
        locked:false,
    },
    scale: {
        name:'Scale',
        key:'scale',
        type:'number',
        locked:false,
    },
    assetid: {
        name:'Asset',
        key:'assetid',
        type:'enum',
        locked:false,
    },
    color: {
        name:'Color',
        key:'color',
        type:'string',
        locked:false,
    },
    backgroundColor: {
        name:'Background Color',
        key:'backgroundColor',
        type:'string',
        locked:false,
    }

}
const DOC_TYPE = "360"
export const TYPES = {
    NODES: {
        STACK:'stack',
        SCENE:'scene',
        SCENES:'scenes',
        ASSET:'asset',
        ASSETS:'assets',
        LAYER:'layer',
        PRIMITIVE: 'primitive',
        PRIMS: {
            IMAGE2D:'image2d',
            IMAGE360:'image360',
            CUBE:'cube',
            SPHERE:'sphere',
            MODEL3D:'gltf',
            TEXT:'text',
        },
    },
    ASSETS: {
        AUDIO:'audio',
        IMAGE360:'360-image',
        IMAGE2D:'2d-image',
        GLTF_URL:'gltf-url',
    },
    ACTIONS: {
        NAV:'nav-action',
        PLAY_SOUND:'playsound-action',
    }
}

const ASSET_INFOS = {
    'audio':{
        icon:'file-audio-o'
    },
    '360-image':{
        icon:'file-photo-o'
    },
    '2d-image':{
        icon:'file-image-o',
    },
    'gltf-url':{
        icon:'file-text'
    }
}

export const PRIMS = {
    'cube': {
        icon:'square',
        title:'Cube',
        make: (prov) => {
            return {
                id: prov.genID(TYPES.NODES.PRIMS.CUBE),
                type:TYPES.NODES.PRIMITIVE,
                primitive:TYPES.NODES.PRIMS.CUBE,
                width:1,
                height:1,
                depth:1,
                angle:0,
                elevation:0,
                title:'Cube',
                color:'red',
                children:[],
            }
        }
    },
    'sphere': {
        icon:'circle',
        title:'Sphere',
        make:(prov) => {
            return {
                id: prov.genID(TYPES.NODES.PRIMS.SPHERE),
                type:TYPES.NODES.PRIMITIVE,
                primitive:TYPES.NODES.PRIMS.SPHERE,
                radius:1,
                angle:0,
                elevation:0,
                title:'Sphere',
                color:'yellow',
                children:[]
            }
        }
    },
    'text': {
        icon:'font',
        title:'Text',
        make: (prov) => {
            return {
                id: prov.genID(TYPES.NODES.PRIMS.TEXT),
                type:TYPES.NODES.PRIMITIVE,
                primitive:TYPES.NODES.PRIMS.TEXT,
                angle:0,
                elevation:0,
                text:'some text',
                fontSize:36,
                title:'Text',
                backgroundColor:'white',
                color:'black',
                children:[],
            }
        }
    },
    'image2d':{
        icon:'image',
        title:'2D Image',
        make:(prov)=>{
            return {
                id: prov.genID(TYPES.NODES.PRIMS.IMAGE2D),
                type:TYPES.NODES.PRIMITIVE,
                primitive:TYPES.NODES.PRIMS.IMAGE2D,
                angle:0,
                elevation:0,
                imageid:null,
                title:'2D Image',
                scale:1,
                children:[],
            }
        }
    },
    'image360':{
        icon:'image',
        title:'360 Image Background',
        make:(prov)=>{
            return {
                id: prov.genID(TYPES.NODES.PRIMS.IMAGE360),
                type:TYPES.NODES.PRIMITIVE,
                primitive:TYPES.NODES.PRIMS.IMAGE360,
                imageid:null,
                title:'360 BG Image',
            }
        }
    },
    'model3d':{
        icon:'cube',
        title:'3D Model',
        make:(prov)=>{
            return {
                id: prov.genID(TYPES.NODES.PRIMS.MODEL3D),
                type:TYPES.NODES.PRIMITIVE,
                primitive:TYPES.NODES.PRIMS.MODEL3D,
                scale:1,
                angle:0,
                elevation:0,
                title:'GLTF Model',
                assetid:null,
                children:[]
            }
        }
    },
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
        return DOC_TYPE
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
            title:'Stack',
            type:TYPES.NODES.STACK,
            id: genID(TYPES.NODES.STACK),
            children: [this.createScenes(),this.createAssets()],
        }
    }
    createScenes() {
        return {
            id: this.genID(TYPES.NODES.SCENES),
            type: TYPES.NODES.SCENES,
            title: 'Scenes',
            children: [this.createScene('scene1'), this.createScene('scene2')],
        }
    }
    createScene(title) {
        const sc = {
            id: this.genID(TYPES.NODES.SCENE),
            type: TYPES.NODES.SCENE,
            title: title ? title : 'untitled scene',
            children: []
        }
        const layer = this.createLayer()
        sc.children.push(layer)
        layer.parent = sc
        return sc
    }
    createAssets() {
        return {
            id: this.genID( TYPES.NODES.ASSETS),
            type: TYPES.NODES.ASSETS,
            children:[]
        }
    }
    createLayer() {
        return {
            id: this.genID(TYPES.NODES.LAYER),
            type:TYPES.NODES.LAYER,
            title:'A Layer',
            children: [],
        }
    }
    createNavAction() {
        return {
            id: this.genID(TYPES.ACTIONS.NAV),
            type:TYPES.ACTIONS.NAV,
            targetScene:null,
            title:'Navigate To'
        }
    }
    createPlaySoundAction() {
        return {
            id: this.genID(TYPES.ACTIONS.PLAY_SOUND),
            type:TYPES.ACTIONS.PLAY_SOUND,
            assetid:null,
            title:'Play Sound'
        }
    }
    appendChild(parent,item) {
        if(!parent) throw new Error("cannot append to a null parent")
        this.id_index[item.id] = item
        item.parent = parent
        parent.children.push(item);
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_ADDED,{
            provider:this,
            parent:parent,
            child:item
        });
    }
    deleteChild(item) {
        if(!item) throw new Error("can't delete a null child")
        if(!item.parent) throw new Error("child doesn't have a parent!")
        const parent = item.parent
        parent.children = parent.children.filter(ch=>ch.id !== item.id)
        item.parent = null
        Selection.clearSelection()
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_REMOVED,{
            provider:this,
            parent:parent,
            child:item
        })
    }

    //creates an asset represented by a resource on the doc server
    createAssetWithInfo(info) {
        if(!info.id) throw new Error("cannot created an asset without a resource ID")
        return {
            id:this.genID(TYPES.NODES.ASSET),
            type:TYPES.NODES.ASSET,
            resourceType: info.resourceType?info.resourceType:"unknown",
            resourceId:info.id,
            title: info.title?info.title:"some unknown asset"
        }
    }
    //creates an asset represented by a URL, instead of a resource on the server
    createAssetWithURLInfo(info) {
        return {
            id:this.genID(TYPES.NODES.ASSET),
            type:TYPES.NODES.ASSET,
            resourceType: info.resourceType?info.resourceType:"unknown",
            title: info.title?info.title:"some unknown asset",
            url:info.url,
        }
    }
    getScenesRoot() {
        return this.getSceneRoot().children[0]
    }
    getAssetsRoot() {
        return this.getSceneRoot().children[1]
    }
    getScenes() {
        return this.getSceneRoot().children[0].children
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
        if(key === PROP_DEFS.imageid.key) return  this.getAssetsRoot().children.map(ass=>ass.id)
        if(key === PROP_DEFS.targetScene.key) return this.getScenes().map(sc=>sc.id)
        if(key === PROP_DEFS.assetid.key) return this.getAssetsRoot().children.map(ass => ass.id)
    }
    getRendererForEnum(key,obj) {
        if(key === PROP_DEFS.imageid.key) return AssetItemRenderer
        if(key === PROP_DEFS.targetScene.key) return ActionItemRenderer
        if(key === PROP_DEFS.assetid.key)  return AssetItemRenderer
    }


    /* ========= selection =========== */
    findSceneParent(o) {
        if(!o) return null
        if(o.type === TYPES.NODES.SCENE) return o
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
        if(sel.type === TYPES.NODES.SCENES) return null
        if(sel.type === TYPES.NODES.ASSETS) return null
        if(sel.type === TYPES.NODES.ASSET) return null
        return this.findSceneParent(sel)
    }
    findSelectedLayer() {
        let sel = Selection.getSelection()
        if(!sel || sel.type === TYPES.NODES.STACK) return this.findSelectedScene().children[0]
        if(sel.type === TYPES.NODES.SCENE) return sel.children[0]
        if(sel.type === TYPES.NODES.LAYER) return sel
        return this.findLayerParent(sel)
    }
    findSelectedPrimitive() {
        let sel = Selection.getSelection()
        if(!sel) return null
        if(sel.type === TYPES.NODES.PRIMITIVE) return sel
        return null
    }
    findSelectedNode() {
        return Selection.getSelection()
    }
    isAssetSelected() {
        const node = this.findSelectedNode()
        return (node && node.type === TYPES.NODES.ASSET)
    }
    findSelectedAsset() {
        return this.findSelectedNode()
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
    findSceneById(id) {
        return this.getScenes().find(s => s.id === id)
    }
    findNodeById(id) {
        return this.id_index[id]
    }




        /* ========== renderers ============ */
    getRendererForItem(item) {
        function renderTitle(icon, item) {
            return <div><i className={`fa fa-${icon} fa-fw`}/> {item.title}</div>
        }

        if(item.type === TYPES.NODES.STACK)  return <div>Project</div>
        if(item.type === TYPES.NODES.SCENES) return <div><i className="fa fa-atlas"/> Scenes</div>
        if(item.type === TYPES.NODES.ASSETS) return <div><i className="fa fa-folder"/> Assets</div>
        if(item.type === TYPES.NODES.SCENE)  return renderTitle('globe',item)
        if(item.type === TYPES.NODES.LAYER)  return renderTitle('window-maximize',item)
        if(item.type === TYPES.NODES.ASSET)  {
            const info = ASSET_INFOS[item.resourceType]
            return renderTitle(info?info.icon:'question',item)
        }
        if(item.type === TYPES.NODES.PRIMITIVE) {
            const info = PRIMS[item.primitive]
            if(info) return renderTitle(info?info.icon:'question',item)
        }
        if(item.type === TYPES.ACTIONS.NAV) return renderTitle('arrow-right',item)
        if(item.type === TYPES.ACTIONS.PLAY_SOUND) return renderTitle('play',item)
        if(item.title) return renderTitle('question',item)
        return <div><i className="fa fa-question"/> unknown</div>
    }
}


const AssetItemRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider) {
        const asset = props.provider.findAssetById(props.value);
        if(asset) value = asset.title
    }
    return <b>{value}</b>
}

const ActionItemRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider) value = props.provider.findSceneById(props.value).title
    return <b>{value}</b>
}
