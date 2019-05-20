import * as THREE from 'three'
import React, {Component} from "react"
import {VRManager} from 'webxr-boilerplate'
import GLTFLoader from './GLTFLoader'

export default class GLTFAssetView extends Component {
    componentDidMount() {
        this.initThreeJS()
    }
    render() {
        return <div>GLTF viewer
            <div ref={c => this.sceneContainer = c}></div>
        </div>
    }
    initThreeJS() {
        const asset = this.props.asset
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0x000000 );
        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 50 );
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.gammaOutput = true
        this.renderer.vr.enabled = true;
        this.sceneContainer.appendChild( this.renderer.domElement );
        this.vrmanager = new VRManager(this.renderer)
        window.addEventListener( 'resize', ()=>{
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( window.innerWidth, window.innerHeight );
        }, false );
        this.renderer.setAnimationLoop(this.renderThree)
        const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
        light.position.set( 1, 1, 1 ).normalize();
        this.scene.add( light );
        this.scene.add(new THREE.AmbientLight(0xffffff,0.2))
        console.log("rendering the asset",asset)

        const loader = new GLTFLoader()
        const url = this.props.provider.getAssetURL(asset)
        console.log("loading the url",url)
        loader.load(url, (gltf)=> {
            console.log("loaded", gltf)
            //swap the model
            this.scene.add(gltf.scene.clone())
        })

    }
    renderThree = (time) => {
        this.renderer.render( this.scene, this.camera );
    }

}
