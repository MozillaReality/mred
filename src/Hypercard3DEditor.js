import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from './TreeItemProvider'
import * as THREE from 'three'
import Selection, {SELECTION_MANAGER} from './SelectionManager'
import {genID, GET_JSON, parseOptions, POST_JSON, setQuery} from './utils'
import QRCode from 'qrcode'
import PubNub from "pubnub"

// const SERVER_URL = "http://localhost:30065/doc/"
const SERVER_URL = "http://josh.earth:30068/doc/"
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


class ThreeDeeViewer extends Component {
    constructor(props) {
        super(props)
    }

    componentDidMount() {
        let w = 500
        let h = 500
        if (this.props.fillScreen === true) {
            //TODO: figure out why I need this fudge. anything less and it scrolls
            w = window.innerWidth - 4
            h = window.innerHeight - 4
        }
        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000)
        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas})
        this.renderer.setSize(w, h)
        this.camera.position.z = 5
        this.rebuildScene(this.props.scene)
        this.redraw()
    }

    componentWillReceiveProps(newProps) {
        this.rebuildScene(newProps.scene)
        this.redraw()
    }

    buildNode(node) {
        let cube = null;
        if (node.type === 'cube') {
            const geometry = new THREE.BoxGeometry(node.size, node.size, node.size)
            const color = parseInt(node.color.substring(1), 16)
            const material = new THREE.MeshLambertMaterial({color: color})
            cube = new THREE.Mesh(geometry, material)
        }
        if (node.type === 'sphere') {
            const geometry = new THREE.SphereGeometry(node.size, 32, 32)
            const color = parseInt(node.color.substring(1), 16)
            const material = new THREE.MeshLambertMaterial({color: color})
            cube = new THREE.Mesh(geometry, material)
        }

        if (node.type === 'plane') {
            const geometry = new THREE.PlaneGeometry(node.size, node.size)
            const color = parseInt(node.color.substring(1), 16)
            const material = new THREE.MeshLambertMaterial({color: color, side: THREE.DoubleSide})
            cube = new THREE.Mesh(geometry, material)
        }

        if (node.type === 'sky') {
            const geometry = new THREE.SphereGeometry(100,32,32)
            const color = parseInt(node.color.substring(1), 16)
            const tex = new THREE.TextureLoader().load('./equi.jpg');
            const material = new THREE.MeshBasicMaterial({map: tex, side: THREE.DoubleSide})
            cube = new THREE.Mesh(geometry, material)
            cube.scale.x = -1
        }

        if(!cube) return console.log(`don't know how to handle node of type '${node.type}'`)

        cube.position.x = node.x
        cube.position.y = node.y
        cube.position.z = node.z
        cube.rotation.x = node.rx
        cube.rotation.y = node.ry
        cube.rotation.z = node.rz

        this.scene.add(cube)
        this.animatable.push(cube)
    }

    rebuildScene(scene) {
        if (!this.scene) return
        if (!this.scene.children) return
        while (this.scene.children.length) this.scene.remove(this.scene.children[0])
        this.animatable = []
        if (scene) scene.children.forEach((node) => this.buildNode(node))

        const ambient = new THREE.AmbientLight(0xffffff, 0.5)
        this.scene.add(ambient)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
        directionalLight.position.x = -10
        this.scene.add(directionalLight)
    }

    redraw() {
        this.renderer.render(this.scene, this.camera)
    }

    render() {
        let w = 500
        let h = 500
        if (this.props.fillScreen === true) {
            w = '100%'
            h = '100%'
        }
        return <canvas width={w} height={h} ref={(canvas) => this.canvas = canvas}/>
    }
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
    return <div>unknown item type = {type}</div>
}


export default class HypercardEditor extends TreeItemProvider {
    constructor() {
        super()
        this.root = root
        this.docid = null
        this.pubnub = new PubNub({
            // publishKey:"pub-c-1cba58da-c59a-4b8b-b756-09e9b33b1edd",
            subscribeKey:"sub-c-39263f3a-f6fb-11e7-847e-5ef6eb1f4733"
        })
        this.pubnub.addListener({
            status: (status)=> console.log(status),
            message: (msg) => {
                console.log(msg)
                if(msg.channel === this.docid) {
                    console.log("got a message for my doc. reloading")
                    this.reloadDocument()
                }
            }
        })
    }

    setDocument(doc,docid) {
        this.root = doc
        this.root.children.forEach((scn)=>{
            scn.children.forEach((obj)=>{
                obj.parent = scn
            })
        })
        this.docid = docid
        console.log("subscribed to ",docid)
        this.pubnub.subscribe({channels:[docid]})
        console.log("set the new document to", doc)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
    }

    reloadDocument() {
        const spath = this.generateSelectionPath(Selection.getSelection());
        GET_JSON(SERVER_URL+this.docid).then((doc)=>{
            this.setDocument(doc,this.docid)
            const newsel = this.findNodeFromSelectionPath(this.getSceneRoot(),spath)
            Selection.setSelection(newsel)
        }).catch((e)=>{
            console.log("couldn't reload the doc",e)
            // this.docid = docid
        })

    }

    getTitle() {
        return 'Hypercard 3D'
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
        const part = path.shift()
        if(node.id === part) {
            if(path.length <= 0) return node
            for(let i=0; i<node.children.length; i++) {
                const child = node.children[i]
                const res = this.findNodeFromSelectionPath(child,path)
                if(res) return res
            }
        }
        return null
    }

    getDocId() {
        return this.docid
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
    getTreeActions() {
        return [
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
                icon:'close',
                fun: () => {
                    let node = Selection.getSelection()
                    this.deleteNode(node)
                }
            },

            {
                icon:'save',
                fun: () => {
                    this.save()
                }
            }

        ]
    }

    save() {
        console.log("saving")
        const doc = JSON.stringify(this.getSceneRoot(),(key,value)=>{
            if(key === 'parent') return undefined
            return value
        })
        console.log("doc is",doc)
        return POST_JSON(SERVER_URL+this.docid,doc).then((res)=>{
            console.log("Success result is",res)
            setQuery({mode:'edit',doc:this.docid})
        }).catch((e)=> console.log("error",e))
    }
    loadDoc(docid) {
        console.log("need to load the doc",docid)
        GET_JSON(SERVER_URL+docid).then((doc)=>{
            // console.log("got the doc",doc)
            this.setDocument(doc,docid)
        }).catch((e)=>{
            console.log("missing doc",e)
            this.docid = docid
        })
    }
}

export class Preview3D extends Component {
    navTo = (target) => {
        console.log('navigating')
    }

    constructor(props) {
        super(props)
        this.state = {
            doc: null,
            valid: false,
            current: null,
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

    render() {
        if (!this.state.valid) return <div>invalid preview. please close and try again</div>
        return <div style={{margin: 0, padding: 0, borderWidth: 0}}>
            <ThreeDeeViewer scene={this.state.current} live={true} navTo={this.navTo} fillScreen={true}/>
            <QRCanvas url={window.location.href}
                      width={300} height={300}
                      style={{position: 'absolute', right: 10, bottom: 10}}
            />
        </div>
    }
}

class QRCanvas extends Component {
    componentDidMount() {
        if (this.canvas) this.redraw()
    }

    componentWillReceiveProps(newProps) {
        if (this.canvas) this.redraw()
    }

    redraw() {
        QRCode.toCanvas(this.canvas, this.props.url, {width: this.props.width, height: this.props.height})
    }

    render() {
        let style = {}
        if (this.props.style) Object.assign(style, this.props.style)
        return <canvas width={this.props.width} height={this.props.height} ref={(canvas) => this.canvas = canvas} style={style}/>
    }
}