import React, {Component} from 'react'
import * as THREE from 'three'

import './VREditor.css'

// for pointer (mouse, controller, touch) support
import {POINTER_CLICK, POINTER_ENTER, POINTER_EXIT, Pointer} from 'webxr-boilerplate/pointer'
import VRStats from "webxr-boilerplate/vrstats"
// enter and exit VR
import VRManager, {VR_DETECTED} from "webxr-boilerplate/vrmanager"



export default class ImmersiveVREditor extends Component {


    render() {
        return <div>
            <div id="overlay">
                <div id="inner">
                    <h1>Application Name</h1>
                    <div id="loading-indicator">
                        <label>loading</label>
                        <progress max="100" value="0" id="progress"></progress>
                    </div>
                    <button id="enter-button" disabled>VR not supported, play anyway</button>
                </div>
            </div>
            <div ref={c => this.wrapper = c}></div>
        </div>
    }


    componentDidMount() {
        this.initScene()
        this.renderer.setAnimationLoop(this.render3.bind(this))
    }

    render3(time) {
        //update the pointer and stats, if configured
        if(this.pointer) this.pointer.tick(time)
        if(this.stats) this.stats.update(time)
        //rotate the cube on every tick
        if(this.cube) this.cube.rotation.y += 0.002
        this.renderer.render( this.scene, this.camera );
    }


    initScene() {

        const $ = (sel) => document.querySelector(sel)
        const on = (elem, type, cb) => elem.addEventListener(type,cb)

        const container = this.wrapper
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 50 );
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        const renderer = this.renderer
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.gammaOutput = true
        renderer.vr.enabled = true;
        container.appendChild( renderer.domElement );
        this.vrmanager = new VRManager(renderer)

        this.initContent()

        window.addEventListener( 'resize', ()=>{
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( window.innerWidth, window.innerHeight );
        }, false );

        // THREE.DefaultLoadingManager.onStart = (url, loaded, total) => {
        //     console.log(`loading ${url}.  loaded ${loaded} of ${total}`)
        // }
        // THREE.DefaultLoadingManager.onLoad = () => {
        //     console.log(`loading complete`)
        //     $("#loading-indicator").style.display = 'none'
        //     $("#enter-button").style.display = 'block'
        //     $("#enter-button").removeAttribute('disabled')
        // }
        // THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
        //     console.log(`prog ${url}.  loaded ${loaded} of ${total}`)
        //     $("#progress").setAttribute('value',100*(loaded/total))
        // }
        // THREE.DefaultLoadingManager.onError = (url) => {
        //     console.log(`error loading ${url}`)
        // }
        //
        // if(!WAIT_FOR_LOAD) {
        //     $("#loading-indicator").style.display = 'none'
        //     $("#enter-button").style.display = 'block'
        //     $("#enter-button").removeAttribute('disabled')
        // }



        on($("#enter-button"),'click',()=>{
            $("#overlay").style.display = 'none'
            //we can start playing sound now
        })

        this.vrmanager.addEventListener(VR_DETECTED,()=>{
            console.log("VR detected")
            $("#enter-button").removeAttribute('disabled',false)
            $("#enter-button").innerText = "enter vr"
            on($("#enter-button"),'click',()=> this.vrmanager.enterVR())
        })

        const WAIT_FOR_LOAD = false

        if(!WAIT_FOR_LOAD) {
            $("#loading-indicator").style.display = 'none'
            $("#enter-button").style.display = 'block'
            $("#enter-button").removeAttribute('disabled')
        }


    }


    initContent() {
        const $ = (sel) => document.querySelector(sel)
        const on = (elem, type, cb) => elem.addEventListener(type,cb)
        this.scene.background = new THREE.Color( 0xcccccc );
        //create a cube
        this.cube = new THREE.Mesh(
            new THREE.BoxGeometry(1,1,1),
            new THREE.MeshLambertMaterial({color:'yellow'})
        )
        //camera is at z=0, so move the cube back so we can see it
        this.cube.position.z = -5
        //move cube up to camera height (~1.5m)
        this.cube.position.y = 1.5
        //make it clickable
        this.cube.userData.clickable = true
        this.scene.add(this.cube)

        //a standard light
        const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
        light.position.set( 1, 1, 1 ).normalize();
        this.scene.add( light );





        // enable stats visible inside VR
        this.stats = new VRStats(this.renderer)
        //this.stats.position.x = 0
        // this.stats.position.y = -1
        this.camera.add(this.stats)
        this.scene.add(this.camera)

        //class which handles mouse and VR controller
        this.pointer = new Pointer(this.scene,this.renderer,this.camera, {

            //Pointer searches everything in the scene by default
            //override this to match just certain things
            intersectionFilter: ((o) => o.userData.clickable),

            //make the camera pan when moving the mouse. good for simulating head turning on desktop
            cameraFollowMouse:false,

            // set to true to move the controller node forward and tilt with the mouse.
            // good for testing VR controls on desktop
            mouseSimulatesController:false,

            //turn this off if you provide your own pointer model
            enableLaser: true,
        })


        const STICK_HEIGHT = 1.0
        const stick = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.1,0.1,STICK_HEIGHT),
            new THREE.MeshLambertMaterial({color:'aqua'})
        )
        const toRad = (degrees) => degrees*Math.PI/180
        stick.position.z = -STICK_HEIGHT/2;
        stick.rotation.x = toRad(-90)
        this.pointer.controller1.add(stick)


        const cube = this.cube
        //change cube to red BG when clicking
        on(cube,POINTER_CLICK,()=>{
            console.log("clicking on the cube")
            cube.material.color.set(0xff0000)
        })
        //change cube to green BG when hovering over it
        on(cube,POINTER_ENTER,()=>{
            // console.log("entering the cube")
            cube.material.color.set(0x00ff00)
        })
        on(cube,POINTER_EXIT,()=>{
            // console.log('exiting the cube')
            cube.material.color.set(0xffffff)
        })

    }
}
