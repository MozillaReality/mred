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
        this.clock = new THREE.Clock()
        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, w / h, 1, 5000)
        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas})
        this.renderer.setClearColor(0xffffff,1)
        this.renderer.setSize(w, h)
        this.raycaster = new THREE.Raycaster()
        this.camera.position.set(0, 1, 3)
        this.camera.lookAt(new THREE.Vector3())
        this.controls = new OrbitalControls(this.camera,this.canvas)
        this.canvas.addEventListener('click',this.clicked)
        this.rebuildScene(this.props.scene)
        this.startRepaint()
    }

    startRepaint() {
        const repaint = ()=> {
            requestAnimationFrame(repaint)
            this.controls.update();
            const delta = this.clock.getDelta(0)
            if(this.mixer) {
                this.mixer.update(delta)
            }
            this.renderer.render(this.scene, this.camera)
        }
        repaint()
    }

    componentWillReceiveProps(newProps) {
        this.rebuildScene(newProps.scene)
    }

    clicked = (e) => {
        const mouse = new THREE.Vector2();
        const bounds = this.canvas.getBoundingClientRect()
        mouse.x =   ((e.clientX-bounds.left) /this.canvas.width  ) * 2 - 1;
        mouse.y = - ((e.clientY-bounds.top)  /this.canvas.height ) * 2 + 1;
        this.raycaster.setFromCamera( mouse, this.camera );
        const intersects = this.raycaster.intersectObjects( this.scene.children );
        intersects.forEach((it)=>{
            const node = this.getNodeForObject3D(it.object)
            if(node && node.action) {
                const action = this.findNodeById(node.action);
                this.processAction(action)
            }
        })
    }

    getNodeForObject3D(obj) {
        return this.props.scene.children.find((node)=>node.id === obj._ge_id)
    }
    findNodeById(id) {
        return this.props.scene.children.find((node)=>node.id === id)
    }
    processAction(action) {
        if(action.type === 'nav-action') {
            this.props.navToScene(action.target)
        }
    }



    buildAnimation(node,scene) {
        if(node.type === 'rot-anim') {
            const xAxis = new THREE.Vector3( 1, 0, 0 );
            const qInitial = new THREE.Quaternion().setFromAxisAngle( xAxis, 0 );
            const qFinal = new THREE.Quaternion().setFromAxisAngle( xAxis, Math.PI );
            const qNext = new THREE.Quaternion().setFromAxisAngle(xAxis,Math.PI*2);
            var quaternionKF = new THREE.QuaternionKeyframeTrack( '.quaternion', [0, 1, 2],
                [ qInitial.x, qInitial.y, qInitial.z, qInitial.w,
                    qFinal.x, qFinal.y, qFinal.z, qFinal.w,
                    qNext.x, qNext.y, qNext.z, qNext.w
                ] );
            const clip =  new THREE.AnimationClip('action', 3, [ quaternionKF ] );
            const obj = this.scene.children.find((obj)=>obj._ge_id === node.target)
            this.mixer = new THREE.AnimationMixer(obj)
            const action = this.mixer.clipAction(clip)
            action.play()
            return;
        }
        return;
    }
    buildNode(node) {
        if(node.type === 'rot-anim') {
            return;
        }
        if(node.type === 'nav-action') {
            return;
        }
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
            new GLTFLoader().load('http://localhost:3000/busterDrone/busterDrone.gltf',(gltf)=>{
                console.log("gltf was loaded",gltf)
                this.scene.add(gltf.scene)
                let cube = gltf.scene
                cube.position.x = node.x
                cube.position.y = node.y
                cube.position.z = node.z
                cube.rotation.x = node.rx
                cube.rotation.y = node.ry
                cube.rotation.z = node.rz

                gltf.animations.forEach((anim)=>{
                    console.log("gltf has animation",anim)
                    this.mixer = new THREE.AnimationMixer(gltf.scene)
                    this.mixer.clipAction(anim).play()
                })
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
        cube._ge_id = node.id

        this.scene.add(cube)
        this.animatable.push(cube)
    }

    rebuildScene(scene) {
        if (!this.scene) return
        if (!this.scene.children) return
        while (this.scene.children.length) this.scene.remove(this.scene.children[0])
        this.animatable = []
        if (scene) scene.children.forEach((node) => this.buildNode(node))
        if (scene) scene.children.forEach((node) => this.buildAnimation(node,scene))

        const ambient = new THREE.AmbientLight(0xffffff, 0.7)
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
