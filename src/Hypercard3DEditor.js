import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from './TreeItemProvider'
import * as THREE from 'three'
import Selection, {SELECTION_MANAGER} from './SelectionManager'
import {genID, parseOptions, POST_JSON, setQuery} from './utils'
import OrbitalControls from './OrbitControls'
import GLTFLoader from "./GLTFLoader"
import QRCanvas from './h3d/QRCanvas'
import ThreeDeeViewer from './h3d/ThreeDeeViewer'

function makeCube() {
    return {
        id: genID('cube'),
        type: 'cube',
        title: 'first cube',
        x: 0,
        y: 0,
        z: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        size: 1,
        color: '#ff00ff',
        action:"",
    }
}
function makeScene(...children) {
    return {
        type:'scene',
        id:genID('scene'),
        title:'A Scene',
        children: children
    }
}
const root = {
    title: 'stack',
    type: 'stack',
    children: [
        makeScene(makeCube()),
    ],
}



class HypercardCanvas3D extends Component {
    constructor(props) {
        super(props)
        this.state = {
            scene: null,
        }
    }

    setSceneFromSelection() {
        let scene = Selection.getSelection()
        if (!scene) return
        if (scene === this.props.provider.getSceneRoot()) return
        if (scene.type !== 'scene') scene = this.props.provider.findParent(this.props.provider.getSceneRoot(), scene)
        if(!scene) scene = this.props.provider.getSceneRoot().children[0]
        this.setState({scene: scene})
    }
    componentDidMount() {
        this.listener2 = this.props.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, (sel) => this.setSceneFromSelection())
        this.listener = Selection.on(SELECTION_MANAGER.CHANGED, (sel) => this.setSceneFromSelection())
    }

    render() {
        return <ThreeDeeViewer scene={this.state.scene}/>
    }
}

export const SceneItemRenderer = (props) => {
    const type = props.item.type
    if (type === 'cube')   return <div><i className="fa fa-square"/> {props.item.title}</div>
    if (type === 'stack')  return <div><i className="fa fa-table"/> {props.item.title}</div>
    if (type === 'scene')  return <div><i className="fa fa-vcard"/> {props.item.title}</div>
    if (type === 'sphere') return <div><i className="fa fa-circle"/> {props.item.title}</div>
    if (type === 'plane')  return <div><i className="fa fa-square"/> {props.item.title}</div>
    if (type === 'sky')    return <div><i className="fa fa-square"/> {props.item.title}</div>
    if (type === 'gltf')    return <div><i className="fa fa-circle"/> {props.item.title}</div>
    if (type === 'nav-action')    return <div><i className="fa fa-circle"/> {props.item.title}</div>
    if (type === 'rot-anim')    return <div><i className="fa fa-circle"/> {props.item.title}</div>
    return <div>unknown item type = {type}</div>
}


export default class Hypercard3DEditor extends TreeItemProvider {
    constructor() {
        super()
        this.root = root
    }

    setDocument(doc,docid) {
        super.setDocument(doc,docid)
        //re-attach children to their parents
        this.root.children.forEach((scn) => {
            scn.children.forEach((obj) => {
                obj.parent = scn
            })
        })
    }

    makeEmptyRoot() {
        return {
            title:'stack',
            type:'stack',
            children: [makeScene(makeCube())]
        }
    }


    getTitle() {
        return 'Hypercard 3D'
    }

    getDocType() {
        return "hypercard-3d"
    }

    getSceneRoot() {
        return this.root
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

    getCanvas() {
        return <HypercardCanvas3D provider={this}/>
    }

    getChildren(item) {
        if (item.children) item.children.forEach((ch) => ch.parent = item)
        return item.children
    }

    hasChildren(item) {
        return (item.children && item.children.length > 0)
    }

    findParent(root, target) {
        if (root === target) return root
        if (root.children) {
            for (let i = 0; i < root.children.length; i++) {
                const ch = root.children[i]
                if (ch === target) return root
                const res = this.findParent(ch, target)
                if (res) return res
            }
        }
        return null
    }

    appendChild(parent,child) {
        parent.children.push(child)
        child.parent = parent
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,child);
    }

    deleteNode(child) {
        child.parent.children = child.parent.children.filter((ch)=>ch.id !== child.id)
        child.parent = null
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,child);
    }

    getRendererForItem(item) {
        return <SceneItemRenderer item={item}/>
    }

    getProperties(item) {
        let defs = []
        if (!item) return defs
        Object.keys(item).forEach((key) => {
            if (key === 'children') return
            if (key === 'parent') return
            let type = 'string'
            let locked = false
            if (key === 'visible') type = 'boolean'
            if (key === 'type') locked = true
            if (key === 'id') locked = true
            if (key === 'x') type = 'number'
            if (key === 'y') type = 'number'
            if (key === 'z') type = 'number'
            if (key === 'size') type = 'number'
            if (key === 'color') type = 'color'
            if (key === 'stroke') type = 'color'
            if (key === 'strokeWidth') type = 'number'
            if (key === 'target') type = 'enum'
            if (key === 'action') type = 'enum'
            defs.push({
                name: key,
                key: key,
                value: item[key],
                type: type,
                locked: locked,
            })
        })
        return defs
    }

    getValuesForEnum(key,obj) {
        if(key === 'target') {
            if(obj.type === 'rot-anim') {
                const scene = this.findParent(this.getSceneRoot(),obj)
                return scene.children.filter((ch)=>ch.type === 'cube').map((act)=>act.id)
            }
            return this.getSceneRoot().children.map((scene)=> scene.id)
        }
        if(key === 'action') {
            const scene = this.findParent(this.getSceneRoot(),obj)
            return scene.children.filter((ch)=>ch.type === 'nav-action').map((act)=>act.id)
        }
        return []
    }


    setPropertyValue(item, def, value) {
        if (def.type === 'number') value = parseFloat(value)
        item[def.key] = value
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, item)
    }

    canHaveChild(parent,child) {
        if(parent.type === 'scene') return true
        return false
    }

    getNearestAllowedParentNode(parent,child) {
        while(true) {
            if(this.canHaveChild(parent,child)) return parent
            parent = this.findParent(this.getSceneRoot(),parent)
            if(!parent) return null
        }
    }

    addToNearestSelectedParent(rect) {
        let parent = this.getNearestAllowedParentNode(Selection.getSelection(),rect)
        if(parent) this.appendChild(parent,rect)
    }


    createCube() {
        return makeCube()
    }
    createSphere() {
        return {
            id: genID('sphere'),
            type: 'sphere',
            title: 'The Sphere',
            x: 0,
            y: 0,
            z: 0,
            rx: 0,
            ry: 0,
            rz: 0,
            size: 1,
            color: '#ff00ff',
            action:''
        }
    }
    createPlane() {
        return {
            id: genID('plane'),
            type: 'plane',
            title: 'The Plane',
            x: 0,
            y: -2,
            z: 0,
            rx: Math.PI/2,
            ry: 0,
            rz: 0,
            size: 10,
            color: '#ff00ff',
        }
    }
    createSky() {
        return {
            id: genID('sky'),
            type: 'sky',
            title: 'The Sky',
            x: 0,
            y: 0,
            z: 0,
            rx: 0,
            ry: 0,
            rz: 0,
            color: '#aaddff',
        }
    }
    createGLTF() {
        return {
            id: genID('gltf'),
            type: 'gltf',
            title: 'The GLTF object',
            href:'',
            x: 0,
            y: 0,
            z: 0,
            rx: 0,
            ry: 0,
            rz: 0,
            action:''
        }
    }
    createNavigationAction() {
        return {
            id: genID('nav'),
            type:'nav-action',
            title:'go to another screen',
            target:'',
        }
    }
    createRotationAnimation() {
        return {
            id: genID('rot'),
            type:'rot-anim',
            title:'rotation anim',
            target:'',
            speed:100,
            property:'rx',
            from:0,
            to:360
        }
    }
    createScene() {
        return makeScene()
    }
    getTreeActions() {
        return [
            {
                // title:'scene',
                icon:'vcard',
                fun: () => this.appendChild(this.getSceneRoot(),this.createScene())
            },
            {
                title:'object',
                icon:'plus',
                type:'menu',
                actions:[
                    {
                        // title:'rect',
                        icon: 'cube',
                        fun: () => this.addToNearestSelectedParent(this.createCube())
                    },
                    {
                        // title:'circle',
                        icon:'soccer-ball-o',
                        fun: () => this.addToNearestSelectedParent(this.createSphere())
                    },
                    {
                        // title:'plane',
                        icon:'plane',
                        fun: () => this.addToNearestSelectedParent(this.createPlane())
                    },
                    {
                        // title:'sky',
                        icon:'cloud',
                        fun: () => this.addToNearestSelectedParent(this.createSky())
                    },
                    {
                        title:'gltf',
                        fun: () => this.addToNearestSelectedParent(this.createGLTF())
                    },
                ]
            },
            {
                icon:'plus',
                title:'action',
                type:'menu',
                actions: [
                    {
                        title:'nav action',
                        fun: () => this.addToNearestSelectedParent(this.createNavigationAction())
                    },
                    {
                        title:'rotation animation',
                        fun: () => this.addToNearestSelectedParent(this.createRotationAnimation())
                    },
                ]
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

}

