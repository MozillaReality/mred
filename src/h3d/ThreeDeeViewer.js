import React, {Component} from 'react'
import * as THREE from 'three'
import GLTFLoader from '../GLTFLoader'
import OrbitalControls from '../OrbitControls'

export  default class ThreeDeeViewer extends Component {
    constructor(props) {
        super(props)
    }

    componentDidMount() {
        let w = 800
        let h = 500
        if (this.props.fillScreen === true) {
            //TODO: figure out why I need this fudge. anything less and it scrolls
            w = window.innerWidth - 4
            h = window.innerHeight - 4
        }
        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, w / h, 1, 5000)
        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas})
        this.renderer.setSize(w, h)
        this.camera.position.set(0, 1, 3)
        this.camera.lookAt(new THREE.Vector3())
        this.controls = new OrbitalControls(this.camera,this.canvas)
        this.rebuildScene(this.props.scene)
        this.startRepaint()
    }

    startRepaint() {
        const repaint = ()=> {
            requestAnimationFrame(repaint)
            this.controls.update();
            this.renderer.render(this.scene, this.camera)
        }
        repaint()
    }

    componentWillReceiveProps(newProps) {
        this.rebuildScene(newProps.scene)
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
            const tex = new THREE.TextureLoader().load('./globe.jpg')
            const material = new THREE.MeshLambertMaterial({color:color, map:tex})
            cube = new THREE.Mesh(geometry, material)
            cube.scale.set(-1,1,1)
            cube.material.side = THREE.BackSide;
        }

        if (node.type === 'gltf') {
            new GLTFLoader().load('http://localhost:3000/imp/scene.gltf',(gltf)=>{
                this.scene.add(gltf.scene)
                let cube = gltf.scene
                cube.position.x = node.x
                cube.position.y = node.y
                cube.position.z = node.z
                cube.rotation.x = node.rx
                cube.rotation.y = node.ry
                cube.rotation.z = node.rz
            })
            return;
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
    }

    render() {
        let w = 800
        let h = 500
        if (this.props.fillScreen === true) {
            w = '100%'
            h = '100%'
        }
        return <canvas width={w} height={h} ref={(canvas) => this.canvas = canvas}/>
    }
}
