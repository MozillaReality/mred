import * as THREE from 'three'
import React, {Component} from "react"
import {fetchGraphObject} from '../syncgraph/utils'
import {ASSET_TYPES} from '../vr/Common'
import {TweenManager} from '../common/tween'
import VRManager, {VR_DETECTED} from 'webxr-boilerplate/vrmanager'
import {Group} from 'three'
import {Pointer} from 'webxr-boilerplate/pointer'
import GLTFLoader from '../gltfinspector/GLTFLoader'

export default class AssetView extends Component {
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
        console.log("loading the url",asset.src)
        loader.load(asset.src, (gltf)=> {
            console.log("loaded", gltf)
            //swap the model
            this.scene.add(gltf.scene.clone())
        })

    }
    renderThree = (time) => {
        // if(this.tweenManager) this.tweenManager.update(time)
        // if(this.pointer) this.pointer.tick(time)
        // if(this.stats) this.stats.update(time)
        // if(this.controller) this.controller.update(time)
        // this.scriptManager.tick(time)
        this.renderer.render( this.scene, this.camera );
    }

}
