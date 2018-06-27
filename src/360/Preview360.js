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
        this.o3d_to_node = {}

        const loader = new THREE.FontLoader();
        loader.load( 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', ( font ) => {
            this.font = font
            this.rebuildScene(this.state.scene)
        })

        this.provider = new Editor360Provider()
        this.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)

        let w = window.innerWidth - 4
        let h = window.innerHeight - 4
        this.raycaster = new THREE.Raycaster()
        this.scene3 = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, w / h, 1, 5000)
        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas})
        this.renderer.setClearColor(0xffffff,1)
        this.renderer.setSize(w, h)
        this.camera.position.set(0, 0, 0)
        this.camera.lookAt(new THREE.Vector3(0,0,0))
        this.canvas.addEventListener('click',this.clicked)
        this.startRepaint()
        this.provider.loadDoc(this.props.options.doc)
    }

    clicked = (e) => {
        const mouse = new THREE.Vector2();
        const bounds = this.canvas.getBoundingClientRect()
        mouse.x =   ((e.clientX-bounds.left) /this.canvas.width  ) * 2 - 1;
        mouse.y = - ((e.clientY-bounds.top)  /this.canvas.height ) * 2 + 1;
        this.raycaster.setFromCamera( mouse, this.camera );
        const intersects = this.raycaster.intersectObjects( this.scene3.children, true );
        intersects.forEach((it)=>{
            const node = this.getNodeForObject3D(it.object)
            if(node && node.children && node.children.length >= 1) {
                node.children.forEach((act)=>{
                    if(act.type === 'nav-action') {
                        this.navigateToScene(this.provider.findSceneById(act.targetScene))
                    }
                })
            }
        })
    }

    startRepaint() {
        const repaint = () => {
            requestAnimationFrame(repaint)
            this.renderer.render(this.scene3, this.camera)
        }
        repaint()
    }

    structureChanged = () => {
        const doc = this.provider.getSceneRoot()
        const scene = doc.children[0].children[0]
        this.setState({doc:doc,scene:scene})
        this.rebuildScene(scene)
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
                obj.rotation.y = -node.angle/180*Math.PI
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
                obj.rotation.y = -node.angle/180*Math.PI
            }
            if(node.primitive === 'image2d') {
                const geometry = new THREE.PlaneGeometry(1,1);
                const img = this.provider.findAssetById(node.imageid)
                const texture = new THREE.TextureLoader().load(SERVER_URL_ASSETS+img.assetid)
                const material = new THREE.MeshLambertMaterial({color:'white', map:texture})
                obj = new THREE.Mesh(geometry, material)
                obj.rotation.y = -node.angle/180*Math.PI
            }
            if(node.primitive === 'image360') {
                const geometry = new THREE.SphereGeometry(1000, 25, 25);
                const img = this.provider.findAssetById(node.imageid)
                const texture = new THREE.TextureLoader().load(SERVER_URL_ASSETS+img.assetid)
                const material = new THREE.MeshLambertMaterial({color:'white', map:texture})
                material.side = THREE.BackSide;
                obj = new THREE.Mesh(geometry, material)
                obj.scale.set( - 1, 1, 1 ); //invert so the picture looks right
                obj.rotation.y = Math.PI*0.5 //adjust so the picture starts at the 0 degree point
                obj._ge_id = node.id
                return obj
            }
        }

        if(!obj) {
            console.log(`don't know how to handle node of type '${node.type}'`)
            return null
        }

        obj.position.x =  Math.sin(node.angle/180*Math.PI)*4
        obj.position.z = -Math.cos(node.angle/180*Math.PI)*4
        obj.position.y = node.elevation*0.1
        this.o3d_to_node[obj.id] = node.id
        obj._ge_id = node.id
        return obj
    }

    getNodeForObject3D(obj) {
        if(this.o3d_to_node[obj.id]) {
            return this.provider.findNodeById(this.o3d_to_node[obj.id])
        }
        return null
    }
    rebuildScene(scene) {
        if(!scene) return
        if (!this.scene3) return
        if (!this.scene3.children) return
        //remove all children
        while (this.scene3.children.length) this.scene3.remove(this.scene3.children[0])
        if (scene) scene.children.forEach((node) => this.scene3.add(this.buildNode(node)))

        const ambient = new THREE.AmbientLight(0xffffff, 0.7)
        this.scene3.add(ambient)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
        directionalLight.position.x = -10
        this.scene3.add(directionalLight)
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

    navigateToScene(scene) {
        this.setState({scene:scene})
        this.rebuildScene(scene)
    }
}