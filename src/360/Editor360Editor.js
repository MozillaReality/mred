import React, {Component} from 'react'
import TreeItemProvider, {SERVER_URL_ASSETS, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {genID, shallowCopy, toClassString} from '../utils'
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


    assetRef: {
        name:"Asset",
        key:'assetRef',
        type:'enum',
        locked:false,
    },
    assetId: {
        name:'Asset',
        key:'assetId',
        type:'string',
        locked:true,
    },
    assetType: {
        name:"Resource Type",
        key:'assetType',
        type:'string',
        locked:true,
    },
    assetSubtype: {
        name:"subtype",
        key:'assetSubtype',
        type:'string',
        locked:true,
    },
    originalFilename: {
        name:"filename",
        key:'originalFilename',
        type:'string',
        locked:true,
    },
    lastModified: {
        name:'last modified ',
        key:'lastModified',
        type:'timestamp',
        locked:true,
    },
    info: {
        name:'info',
        key:'info',
        type:'object',
        locked:true,
        hidden:true,
    },
    fileSize: {
        name:'File Size',
        key:'fileSize',
        type:'bytecount',
        locked:true,
    },
    author: {
        name:'Author',
        key:'author',
        type:'string',
        locked:false,
    },
    infourl: {
        name:'Info URL',
        key:'infourl',
        type:'string',
        locked:false,
    },
    license: {
        name:'License',
        key:'license',
        type:'string',
        locked:false,
    },
    remote: {

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
            MODEL3D:'model3d',
            TEXT:'text',
        },
    },
    ASSETS: {
        AUDIO:'audio',
        IMAGE:'image',
        MODEL:'model',
        SUBTYPES: {
            GLTF_JSON:'gltf+json',
            JPEG:'JPEG',
            PNG:'png',
            GIF:'gif',
        }
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
    'image':{
        icon:'file-image-o',
    },
    'model':{
        icon:'file-text'
    }
}

export const PRIMS = {}
PRIMS[TYPES.NODES.PRIMS.CUBE] = {
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
    },

    render2D: (prov,node,w,h,i)=>{
        const style = {
            width: (node.width*50)+'px',
            height: (node.height*50)+'px',
            left: (node.angle/360*w)+'px',
            top: (h/2-(node.elevation)*3)+'px',
            backgroundColor:node.color||'red',
        }
        const clss = {
            primitive:true,
            cube:true,
            selected:prov.findSelectedPrimitive() === node
        }
        return <div className={toClassString(clss)} style={style} key={i}>cube</div>
    }
}

PRIMS[TYPES.NODES.PRIMS.SPHERE] = {
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
    },
    render2D: (prov,node,w,h,i) => {
        const style = {
            width: (node.width*50)+'px',
            height: (node.height*50)+'px',
            left: (node.angle/360*w)+'px',
            top: (h/2-(node.elevation)*3)+'px',
            borderRadius:'1em',
            padding:'1em',
            backgroundColor:node.color||'red',
        }
        const clss = {
            primitive:true,
            sphere:true,
            selected:prov.findSelectedPrimitive() === node
        }
        return <div className={toClassString(clss)} style={style} key={i}>sphere</div>
    }
}

PRIMS[TYPES.NODES.PRIMS.TEXT] = {
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
    },
    render2D: (prov,node,w,h,i) => {
        const style = {
            width: (node.width*50)+'px',
            height: (node.height*50)+'px',
            left: (node.angle/360*w)+'px',
            top: (h/2-(node.elevation)*3)+'px',
            color:node.color,
            backgroundColor:node.backgroundColor,
        }
        const clss = {
            primitive:true,
            text:true,
            selected:prov.findSelectedPrimitive() === node
        }
        return <div className={toClassString(clss)} style={style} key={i}>{node.text}</div>
    }
}

PRIMS[TYPES.NODES.PRIMS.IMAGE2D] = {
    icon:'image',
    title:'2D Image',
    make:(prov)=>{
        return {
            id: prov.genID(TYPES.NODES.PRIMS.IMAGE2D),
            type:TYPES.NODES.PRIMITIVE,
            primitive:TYPES.NODES.PRIMS.IMAGE2D,
            angle:0,
            elevation:0,
            assetRef:null,
            title:'2D Image',
            scale:1,
            children:[],
        }
    },
    render2D: (prov,node,w,h,i) => {
        const style = {
            width: (node.width*50)+'px',
            height: (node.height*50)+'px',
            left: (node.angle/360*w)+'px',
            top: (h/2-(node.elevation)*3)+'px',
        }
        const clss = {
            primitive:true,
            image2d:true,
            selected:prov.findSelectedPrimitive() === node
        }
        const img = prov.findAssetById(node.assetRef)
        if(img) {
            return <div className={toClassString(clss)} style={style} key={i}>
                <img src={`${SERVER_URL_ASSETS}${img.assetId}`} width={50} height={50}/>
            </div>
        } else {
            return <div className={toClassString(clss)} key={i}>img broken</div>
        }
    }
}

PRIMS[TYPES.NODES.PRIMS.IMAGE360] = {
    icon:'image',
    title:'360 Image Background',
    make:(prov)=>{
        return {
            id: prov.genID(TYPES.NODES.PRIMS.IMAGE360),
            type:TYPES.NODES.PRIMITIVE,
            primitive:TYPES.NODES.PRIMS.IMAGE360,
            assetRef:null,
            title:'360 BG Image',
        }
    },
    render2D: (prov,node,w,h,i) => {
        const img = prov.findAssetById(node.assetRef)
        const clss = {
            primitive:true,
            image360:true,
            selected:prov.findSelectedPrimitive() === node
        }
        if(img) {
            return <div className={toClassString(clss)} key={i}>
                <img src={`${SERVER_URL_ASSETS}${img.assetId}`}/>
            </div>
        } else {
            return <div className={toClassString(clss)} key={i}>img broken</div>
        }
    }
}

PRIMS[TYPES.NODES.PRIMS.MODEL3D] = {
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
            assetRef:null,
            children:[]
        }
    },
    render2D: (prov,node,w,h,i) => {
        const style = {
            width: (node.width*50)+'px',
            height: (node.height*50)+'px',
            left: (node.angle/360*w)+'px',
            top: (h/2-(node.elevation)*3)+'px',
            borderRadius:'1em',
            padding:'1em'
        }
        const clss = {
            primitive:true,
            gltf:true,
            selected:prov.findSelectedPrimitive() === node
        }
        return <div className={toClassString(clss)} style={style} key={i}>GLTF Model</div>
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
        const assets = [
            this.createAssetWithInfo({
                id:'hotel_small.jpg',
                assetType:TYPES.ASSETS.IMAGE,
                assetSubtype:TYPES.ASSETS.SUBTYPES.JPEG,
                title:'Bellagio Hotel'
            }),
            this.createAssetWithURLInfo({
                assetType:TYPES.ASSETS.MODEL,
                assetSubtype:TYPES.ASSETS.SUBTYPES.GLTF_JSON,
                remote:true,
                title:'MR Duck',
                url:'https://vr.josh.earth/assets/models/duck/duck.gltf'
            })
        ]
        return {
            id: this.genID( TYPES.NODES.ASSETS),
            type: TYPES.NODES.ASSETS,
            children:assets
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
            assetRef:null,
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
        if(!info.assetType) throw new Error("asset must have an asset type")
        if(!info.assetSubtype) throw new Error("asset must have an asset sub type")
        return {
            id:this.genID(TYPES.NODES.ASSET),
            type:TYPES.NODES.ASSET,
            assetType: info.assetType,
            assetSubtype: info.assetSubtype,
            assetId:info.id,
            title: info.title?info.title:"some unknown asset",
            originalFilename:info.originalFilename,
            lastModified:info.lastModified,
            fileSize:info.fileSize,
            info:info.info,
            author:info.author,
            infourl:info.infourl,
            license:info.license,
        }
    }
    //creates an asset represented by a URL, instead of a resource on the server
    createAssetWithURLInfo(info) {
        if(!info.assetType) throw new Error("asset must have an asset type")
        if(!info.assetSubtype) throw new Error("asset must have an asset sub type")
        return {
            id:this.genID(TYPES.NODES.ASSET),
            type:TYPES.NODES.ASSET,
            remote:true,
            assetType: info.assetType,
            assetSubtype: info.assetSubtype,
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
        if(key === PROP_DEFS.targetScene.key) return this.getScenes().map(sc=>sc.id)
        if(key === PROP_DEFS.assetRef.key) {
            if(obj.type === TYPES.NODES.PRIMITIVE && obj.primitive === TYPES.NODES.PRIMS.IMAGE360) {
                return this.getAssetsRoot().children
                    .filter(ass => ass.assetType === TYPES.ASSETS.IMAGE)
                    .map(ass => ass.id)
            }
            if(obj.type === TYPES.NODES.PRIMITIVE && obj.primitive === TYPES.NODES.PRIMS.IMAGE2D) {
                return this.getAssetsRoot().children
                    .filter(ass => ass.assetType === TYPES.ASSETS.IMAGE)
                    .map(ass => ass.id)
            }
            if(obj.type === TYPES.NODES.PRIMITIVE && obj.primitive === TYPES.NODES.PRIMS.MODEL3D) {
                return this.getAssetsRoot().children
                    .filter(ass => ass.assetType === TYPES.ASSETS.MODEL)
                    .map(ass => ass.id)
            }
            if(obj.type === TYPES.ACTIONS.PLAY_SOUND) {
                return this.getAssetsRoot().children
                    .filter(ass => ass.assetType === TYPES.ASSETS.AUDIO)
                    .map(ass => ass.id)
            }
            return this.getAssetsRoot().children.map(ass => ass.id)
        }
    }
    getRendererForEnum(key,obj) {
        if(key === PROP_DEFS.targetScene.key) return ActionItemRenderer
        if(key === PROP_DEFS.assetRef.key)  return AssetItemRenderer
    }


    /* ========= selection =========== */
    findSceneParent(o) {
        if(!o) return null
        if(o.type === TYPES.NODES.SCENE) return o
        return this.findSceneParent(o.parent)
    }
    findLayerParent(o) {
        if(o.type === TYPES.NODES.LAYER) return o
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
    setSelectedObject(node) {
        return Selection.setSelection(node)
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
        function renderText(icon,text) {
            return <div><i className={`fa fa-${icon} fa-fw`}/> {text}</div>
        }

        if(item.type === TYPES.NODES.STACK)  return <div>Project</div>
        if(item.type === TYPES.NODES.SCENES) return renderText('atlas','Scenes')
        if(item.type === TYPES.NODES.ASSETS) return renderText('folder','Assets')
        if(item.type === TYPES.NODES.SCENE)  return renderTitle('globe',item)
        if(item.type === TYPES.NODES.LAYER)  return renderTitle('window-maximize',item)
        if(item.type === TYPES.NODES.ASSET)  {
            const info = ASSET_INFOS[item.assetType]
            return renderTitle(info?info.icon:'question',item)
        }
        if(item.type === TYPES.NODES.PRIMITIVE) {
            const info = PRIMS[item.primitive]
            if(info) return renderTitle(info?info.icon:'question',item)
        }
        if(item.type === TYPES.ACTIONS.NAV) return renderTitle('arrow-right',item)
        if(item.type === TYPES.ACTIONS.PLAY_SOUND) return renderTitle('play',item)
        if(item.title) return renderTitle('question',item)
        return renderText('question','unknown')
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
