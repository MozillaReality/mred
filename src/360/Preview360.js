import React, {Component} from 'react'
import {Editor360Provider} from './Editor360Editor'
import {SERVER_URL_ASSETS, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import * as THREE from 'three'

export default class Preview360 extends Component {

    constructor(props) {
        super(props)
        this.state = {
            doc:null,
            scene:null
        }
    }

    componentDidMount() {
        window.addEventListener('keydown',this.keyDown)

        var loader = new THREE.FontLoader();
        loader.load( 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', ( font ) => {
            console.log("fonts is loaded",font)
            this.font = font
            this.rebuildScene(this.state.scene)
        })

        this.provider = new Editor360Provider()
        this.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
        this.provider.loadDoc(this.props.options.doc)

        let w = window.innerWidth - 4
        let h = window.innerHeight - 4
        this.clock = new THREE.Clock()
        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, w / h, 1, 5000)
        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas})
        this.renderer.setClearColor(0xffffff,1)
        this.renderer.setSize(w, h)
        this.camera.position.set(0, 1, 3)
        this.camera.lookAt(new THREE.Vector3(0,1,0))
        this.rebuildScene(this.state.scene)
        this.startRepaint()
    }

    startRepaint() {
        const repaint = () => {
            requestAnimationFrame(repaint)
            this.renderer.render(this.scene, this.camera)
        }
        repaint()
    }

    structureChanged = () => {
        const doc = this.provider.getSceneRoot()
        this.setState({
            doc:doc,
            scene:doc.children[0]
        })
        this.rebuildScene(doc.children[0].children[0])
    }

    buildNode(node) {
        let obj = null;

        // console.log("parsing node",node.type)
        if (node.type === 'layer') {
            obj = new THREE.Group()
            node.children.forEach((nd) => {
                const ndd = this.buildNode(nd)
                if(ndd) obj.add(ndd)
            })
            return obj
        }

        if (node.type === 'primitive') {
            if(node.primitive === 'cube') {
                const geometry = new THREE.BoxGeometry(node.width, node.height, node.depth);
                const color = 'red'
                const material = new THREE.MeshLambertMaterial({color: color})
                obj = new THREE.Mesh(geometry, material)
            }
            if(node.primitive === 'text' && this.font) {
                const geometry = new THREE.TextGeometry(node.text,{
                    font:this.font,
                    size: 0.2,
                    height: 0.05,
                })
                const color = 'black'
                const material = new THREE.MeshLambertMaterial({color: color})
                obj = new THREE.Mesh(geometry, material)
            }
            if(node.primitive === 'image2d') {
                const geometry = new THREE.PlaneGeometry(1,1);
                const img = this.provider.findAssetById(node.imageid)
                const texture = new THREE.TextureLoader().load(SERVER_URL_ASSETS+img.assetid)
                const material = new THREE.MeshLambertMaterial({color:'white', map:texture})
                obj = new THREE.Mesh(geometry, material)
            }
        }

        if(!obj) {
            console.log(`don't know how to handle node of type '${node.type}'`)
            return null
        }

        obj.position.x =  Math.sin(node.angle/180*Math.PI)*2
        obj.position.z = -Math.cos(node.angle/180*Math.PI)*2
        obj.position.y = node.elevation*0.1
        obj._ge_id = node.id
        return obj
    }

    rebuildScene(scene) {
        if (!this.scene) return
        if (!this.scene.children) return
        //remove all children
        while (this.scene.children.length) this.scene.remove(this.scene.children[0])
        if (scene) scene.children.forEach((node) => this.scene.add(this.buildNode(node)))

        const ambient = new THREE.AmbientLight(0xffffff, 0.7)
        this.scene.add(ambient)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
        directionalLight.position.x = -10
        this.scene.add(directionalLight)
    }

    keyDown = (e) => {
        // console.log("key",e)

        if(e.keyCode === 39)  this.camera.rotation.y -= 0.05
        if(e.keyCode === 37)  this.camera.rotation.y += 0.05
        const bearing = this.camera.rotation.y
        if(e.keyCode === 68) {
            this.camera.position.x += Math.sin(bearing+Math.PI/2)*0.5
            this.camera.position.z += Math.cos(bearing+Math.PI/2)*0.5
        }
        if(e.keyCode === 65) {
            this.camera.position.x -= Math.sin(bearing+Math.PI/2)*0.5
            this.camera.position.z -= Math.cos(bearing+Math.PI/2)*0.5
        }
        if(e.keyCode === 40)  {
            this.camera.position.x += Math.sin(bearing)*0.5
            this.camera.position.z += Math.cos(bearing)*0.5
        }
        if(e.keyCode === 38)  {
            this.camera.position.x -= Math.sin(bearing)*0.5
            this.camera.position.z -= Math.cos(bearing)*0.5
        }
    }

    render() {
        return <canvas width="100%" height='100%' ref={(canvas) => this.canvas = canvas}/>
    }
}