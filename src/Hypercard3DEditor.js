import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from './TreeItemProvider'
import * as THREE from 'three'
import Selection, {SELECTION_MANAGER} from './SelectionManager'
import {genID} from "./utils"
import QRCode from 'qrcode'
// const GLTFLoader = require("three/examples/js/loaders/GLTFLoader")


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

        /*
        if (node.type === 'gltf') {
            const geometry = new THREE.SphereGeometry(1,32,32)
            const color = parseInt(node.color.substring(1), 16)
            const material = new THREE.MeshBasicMaterial({color:color})
            cube = new THREE.Mesh(geometry, material)

            const loader = new GLTFLoader();
            // Load a glTF resource
            loader.load('http://localhost/moz/aframe-gltf-example/imp_character/scene.gltf',( gltf ) =>{
                console.log("got the model")
            }, (xhr)=>console.log(xhr), (err)=>console.log(err))
        }
        */
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
    animate = () => {
        if (this.state.animate) requestAnimationFrame(this.animate)
        if (!this.state.scene) return
        this.animatable.forEach((ch) => ch.rotation.y += 0.01)
        this.redraw()
    }

    constructor(props) {
        super(props)
        this.animatable = []
        this.state = {
            selection: null,
            scene: null,
            animate: false,
        }
    }

    componentDidMount() {
        this.listener = Selection.on(SELECTION_MANAGER.CHANGED, (sel) => {
            let scene = Selection.getSelection()
            if (!scene) return
            if (scene === this.props.provider.getSceneRoot()) return
            if (scene.type !== 'scene') scene = this.props.provider.findParent(this.props.provider.getSceneRoot(), scene)
            this.setState({selection: sel, animate: false, scene: scene})
        })
    }

    render() {
        if (this.state.animate) this.animate()
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
    if (type === 'sky')    return <div><i className="fa fa-cloud"/> {props.item.title}</div>
    // if (type === 'gltf')    return <div><i className="fa fa-black-tie"/> {props.item.title}</div>
    return <div>unknown item type = {type}</div>
}


export default class HypercardEditor extends TreeItemProvider {
    constructor() {
        super()
        this.root = root
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
    createGLTF() {
        return {
            id: genID('gltf'),
            type: 'gltf',
            title: 'GLTF Model',
            x: 0,
            y: 0,
            z: 0,
            rx: 0,
            ry: 0,
            rz: 0,
        }
    }

    getTreeActions() {
        return [
            {
                // title:'rect',
                icon: 'cube',
                fun: () => {
                    let rect = this.createCube();
                    let node = Selection.getSelection()
                    if (this.hasChildren(node)) this.appendChild(node, rect)
                }
            },
            {
                // title:'circle',
                icon:'soccer-ball-o',
                fun: () => {
                    let rect = this.createSphere();
                    let node = Selection.getSelection()
                    if(this.hasChildren(node)) this.appendChild(node,rect)
                }
            },
            {
                title:'plane',
                icon:'plane',
                fun: () => {
                    let rect = this.createPlane();
                    let node = Selection.getSelection()
                    if(this.hasChildren(node)) this.appendChild(node,rect)
                }
            },
            {
                title:'sky',
                icon:'cloud',
                fun: () => {
                    let rect = this.createSky();
                    let node = Selection.getSelection()
                    if(this.hasChildren(node)) this.appendChild(node,rect)
                }
            },
            {
                title:'gltf',
                icon:'object',
                fun: () => {
                    let rect = this.createGLTF();
                    let node = Selection.getSelection()
                    if(this.hasChildren(node)) this.appendChild(node,rect)
                }
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
        if (window.opener && window.opener.preview_document) {
            const doc = window.opener.preview_document
            this.setState({doc: doc, current: doc.children[0], valid: true})
        }
    }

    render() {
        if (!this.state.valid) return <div>invalid preview. please close and try again</div>
        return <div style={{margin: 0, padding: 0, borderWidth: 0}}>
            <ThreeDeeViewer scene={this.state.current} live={true} navTo={this.navTo} fillScreen={true}/>
            <QRCanvas url={'http://192.168.7.25:3000/?mode=preview&provider=hypercard3D'}
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