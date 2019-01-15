import SyncGraphProvider from '../syncgraph/SyncGraphProvider'
import React, {Component} from 'react'
import {Panel, Toolbar} from '../GridEditorApp'
import TreeTable from '../TreeTable'
import PropSheet, {TYPES} from '../common/PropSheet'
import GridEditorApp from '../GridEditorApp'
import * as THREE from 'three'
import SelectionManager, {SELECTION_MANAGER} from '../SelectionManager'


const PROP_DEFS = {
    title: {
        key:'title',
        name:'Title',
        type:TYPES.STRING
    },
    width: {
        key:'width',
        name:'Width',
        type:TYPES.NUMBER,
    },
    height: {
        key:'height',
        name:'Height',
        type:TYPES.NUMBER,
    },
    depth: {
        key:'depth',
        name:'Depth',
        type:TYPES.NUMBER,
    },
    tx: {
        key:'tx',
        name:'TX',
        type:TYPES.NUMBER,
    },
    ty: {
        key:'ty',
        name:'TY',
        type:TYPES.NUMBER,
    },
    tz: {
        key:'tz',
        name:'TZ',
        type:TYPES.NUMBER,
    },
}


const {DocGraph, CommandGenerator, SET_PROPERTY} = require("syncing_protocol");
export default class VREditor extends  SyncGraphProvider {
    getDocType() { return "vr" }
    getApp = () => <VREditorApp provider={this}/>
    getTitle = () => "VR Builder"
    makeEmptyRoot(doc) {
        const CH = doc.createArray()
        const root = doc.createObject()
        doc.createProperty(root,'type','root')
        doc.createProperty(root,'title','root')
        doc.createProperty(root,'children',CH)


        const scene1 = doc.createObject()
        doc.createProperty(scene1,'type','scene')
        doc.createProperty(scene1,'title','Scene 1')
        doc.createProperty(scene1,'children',doc.createArray())
        doc.insertElement(CH,0,scene1)

        const obj1 = doc.createObject()
        doc.createProperty(obj1,'type','cube')
        doc.createProperty(obj1,'title','cube 1')
        doc.createProperty(obj1,'width',1)
        doc.createProperty(obj1,'height',1)
        doc.createProperty(obj1,'depth',1)
        doc.createProperty(obj1,'tx',0)
        doc.createProperty(obj1,'ty',1.5)
        doc.createProperty(obj1,'tz',-3)
        doc.createProperty(obj1,'parent',scene1)
        doc.insertElement(doc.getPropertyValue(scene1,'children'),0,obj1)
    }



    getRendererForItem = (item) => {
        if(!this.getDataGraph().getObjectById(item)) return <div>???</div>
        return <div>{this.getDataGraph().getPropertyValue(item,'title')}</div>
    }


    getProperties(item) {
        function copyPropDef(def,value) {
            const out = {};
            Object.keys(def).forEach((key) => out[key] = def[key])
            out.value = value
            return out;
        }
        let defs = []
        if(!item) return defs

        const props = this.syncdoc.getPropertiesForObject(item)
        if(props) {
            props.forEach(key => {
                if(key === 'type') return
                if(key === 'children') return
                const value = this.syncdoc.getPropertyValue(item,key)
                if(PROP_DEFS[key]) return defs.push(copyPropDef(PROP_DEFS[key],value))
                console.log("unknown property",key)
            })
        }

        return defs
    }


    getSelectedScene() {
        const sel = SelectionManager.getSelection()
        console.log("selection is",sel)
        if(sel === null) return -1
        const type = this.getDataGraph().getPropertyValue(sel,'type')
        console.log("type is",type)
        if(type === 'scene') {
            return sel
        }
        if(type === 'cube') {
            return this.getDataGraph().getPropertyValue(sel,'parent')
        }

        return -1
    }

}

class VREditorApp extends Component {
    render() {
        const prov = this.props.provider
        return <GridEditorApp>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle><TreeTable root={prov.getSceneRoot()} provider={prov}/></Panel>

            <Toolbar left bottom>
                <button onClick={()=>{
                    const graph = this.props.provider.getDataGraph()
                    const obj = graph.createObject()
                    graph.createProperty(obj,'type','rect')
                    graph.createProperty(obj,'title','cube2')
                    graph.createProperty(obj,'width',1)
                    graph.createProperty(obj,'height',1)
                    graph.createProperty(obj,'depth',1)
                    graph.createProperty(obj,'tx',1)
                    graph.createProperty(obj,'ty',1.5)
                    graph.createProperty(obj,'tz',-3)
                    const scene1 = this.props.provider.getSelectedScene()
                    graph.insertElement(graph.getPropertyValue(scene1,'children'),0,obj)
                    SelectionManager.setSelection(obj)
                }}>add</button>
            </Toolbar>


            <Toolbar center top>
            </Toolbar>


            <Panel center middle scroll>
                <VRCanvas provider={prov}/>
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>


            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }

}

class VRCanvas extends Component {
    constructor(props) {
        super(props)
        this.obj_node_map = {}
    }
    componentDidMount() {
        const canvas = this.canvas

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 70, canvas.width / canvas.height, 0.1, 50 );
        this.renderer = new THREE.WebGLRenderer( { antialias: false, canvas: canvas } );
        // this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( canvas.width, canvas.height );
        // this.renderer.gammaOutput = true

        this.scene.background = new THREE.Color( 0xff00ff );
        this.camera.position.y = 1.5
        this.camera.position.x = 0
        this.camera.position.z = 0
        this.scene.add(this.camera)


        const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
        light.position.set( 1, 1, 1 ).normalize();
        this.scene.add( light );


        // const cube = new THREE.Mesh(
        //     new THREE.BoxGeometry(1,1,1),
        //     new THREE.MeshLambertMaterial({color:'white'})
        // )
        // cube.position.z = -5
        // cube.position.y = 1.5
        // cube.userData.clickable = true
        // this.scene.add(cube)


        this.renderer.setAnimationLoop(()=>{
            // cube.rotation.y  += 0.01
            this.renderer.render(this.scene,this.camera)
        })



        this.props.provider.onRawChange(op => this.updateScene(op))

        SelectionManager.on(SELECTION_MANAGER.CHANGED,()=>{
            console.log("new selection is",SelectionManager.getSelection())
        })

        window.addEventListener( 'resize', ()=>{
            this.camera.aspect = this.canvas.width / this.canvas.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( this.canvas.width, this.canvas.height );
        }, false );

    }

    insertNodeMapping(id,node) {
        this.obj_node_map[id] = node
    }
    findNode(id) {
        return this.obj_node_map[id]
    }

    updateScene(op) {
        console.log("got a change",op)
        if(op.type === 'INSERT_ELEMENT') {
            const obj = op.value
            console.log("inserted an element. add to the scene",obj)
            const graph = this.props.provider.getDataGraph()
            const w = graph.getPropertyValue(obj,'width')
            const h = graph.getPropertyValue(obj,'height')
            const d = graph.getPropertyValue(obj,'depth')
            const x = graph.getPropertyValue(obj,'tx')
            const y = graph.getPropertyValue(obj,'ty')
            const z = graph.getPropertyValue(obj,'tz')
            console.log(w,h,d,x,y,z)
            const cube = new THREE.Mesh(
                new THREE.BoxGeometry(w,h,d),
                new THREE.MeshLambertMaterial({color:'white'})
            )
            cube.position.set(x,y,z)
            console.log("adding a cube",cube)
            this.scene.add(cube)
            this.insertNodeMapping(obj,cube)
        }
        if(op.type === SET_PROPERTY) {
            console.log("finding object",op.object)
            const node = this.findNode(op.object)
            if(op.name === 'tx') node.position.x = parseFloat(op.value)
            if(op.name === 'ty') node.position.y = parseFloat(op.value)
            if(op.name === 'tz') node.position.z = parseFloat(op.value)
        }
    }

    render() {
        return <canvas ref={c => this.canvas = c} width={600} height={400}></canvas>
    }
}
