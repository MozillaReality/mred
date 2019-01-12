import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import PropSheet from '../common/PropSheet'
import * as THREE from 'three'
import GLTFLoader from '../GLTFLoader'
import GLTFExporter from "./GLTFExporter"
import OrbitalControls from '../h3d/OrbitControls'
import Selection, {SELECTION_MANAGER} from '../SelectionManager'



class GLTFApp extends Component {
    componentDidMount() {
        this.prev_sel = null
        this.materials = []
        this.WIREFRAME = new THREE.LineBasicMaterial( {
            color: 0xff0000,
            linewidth: 1,
        } );

        this.sel_listener = Selection.on(SELECTION_MANAGER.CHANGED, (sel)=> {
            const ch = Selection.getSelection()
            if(this.prev_sel && this.prev_sel.material && this.materials[this.prev_sel.id]) {
                this.prev_sel.material = this.materials[this.prev_sel.id]
            }
            if(ch.material && ch.material !== this.WIREFRAME) {
                this.materials[ch.id] = ch.material
                ch.material = this.WIREFRAME
                this.prev_sel = ch
            }
        })

        this.props.provider.contextMenu = this.calculateContextMenu()
    }

    render() {
        return <GridEditorApp provider={this.props.provider}>
            <Toolbar left top>
                <label>GLTF Inspector</label>
            </Toolbar>
            <Toolbar center top>
            </Toolbar>
            <Panel center middle>
                <GLTFView provider={this.props.provider}/>
            </Panel>
            <Panel scroll right>
                <PropSheet provider={this.props.provider}/>
            </Panel>

        </GridEditorApp>
    }

    calculateContextMenu = () => {
        return [
            {
                title:'dump',
                fun:() => {
                    const ch = Selection.getSelection()
                    console.log(ch)
                }
            },
            {
                title:'export',
                icon:'close',
                fun: () => {
                    console.log("exporting")
                    const ch = Selection.getSelection()

                    if(ch.material === this.WIREFRAME) {
                        console.log("need to swap it out")
                        ch.material = this.materials[ch.id]
                    }

                    const exporter = new GLTFExporter()
                    console.log("exporter",exporter)
                    exporter.parse(ch,(gltf)=>{
                        console.log("GLTF is",gltf)
                        const str = JSON.stringify(gltf)
                        console.log(str)
                        const link = document.createElement('a');
                        link.href = 'data:model/gltf+json,'+encodeURIComponent(str)
                        link.download = 'test.gltf'
                        document.body.appendChild(link)
                        link.click()
                    })
                }
            },
        ]
    }

}

export default class GLTFInspector extends  TreeItemProvider {
    constructor() {
        super()
        this.loadGLTF(`http://localhost:3000/imp/scene.gltf`)
        // this.loadGLTF(`http://localhost:3000/busterDrone/busterDrone.gltf`)
        // this.loadGLTF(`http://localhost:3000/moon/scene.gltf`)
    }
    getDocType = () => "gltf-inspector"
    getApp = () => <GLTFApp provider={this}/>
    makeEmptyRoot() {
        return {
            id: this.genID('root'),
            type:'root',
            title:'GLTF file',
            children:[],
        }
    }

    getRendererForItem(item) {
        if(item.type === 'root') return <div>root</div>
        if(item.type === 'Object3D') return [<i className="fa fa-cube"></i>,<b>{item.name}</b>]
        if(item.type === 'Mesh') return [<i className="fa fa-diamond fa-fw"></i>,<b>{item.name}</b>]
        if(item.type === 'Bone') return [<i className="fa fa-question fa-fw"></i>,<b>item.name</b>]
        if(item) return <div>{item.type}&nbsp;{item.name}</div>
        return <div> some error</div>
    }

    getProperties(item) {
        let defs = []
        if(!item) return defs;
        // console.log(item)
        if(item.type === 'Mesh') {
            // console.log("doing mesh. computing bounding box",item)
            // item.geometry.computeBoundingBox()
            // item.geometry.computeBoundingSphere()
            // console.log("boundinb box", item.geometry.boundingBox, item.geometry.boundingSphere)
            // console.log("vertex count", item.geometry.attributes.position.count)
        }
        Object.keys(item).forEach((key)=> {
            if (key === 'children') return;
            if (key === 'uuid') {
                defs.push({
                    name:"UUID",
                    key:'uuid',
                    value:item.uuid
                })
            }
            if(key === 'name') {
                defs.push({
                    name:'Name',
                    key:'name',
                    value:item.name
                })
            }
            if(key === 'type') {
                defs.push({
                    name:'Type',
                    key:'type',
                    value:item.type
                })
            }
            if(key === 'visible') {
                defs.push({name:'Visible',key:'visible',value:item.visible, type:'boolean'})
            }
            if(key === 'position') {
                defs.push({name:'x position', key:'position.x', value:item.position.x, type:'number'})
                defs.push({name:'y position', key:'position.y', value:item.position.y, type:'number'})
                defs.push({name:'z position', key:'position.z', value:item.position.z, type:'number'})
            }
            if(item.type === 'Mesh' && key === 'geometry') {
                defs.push({
                    name:'vertexes',
                    key:'geometry.attributes.position.count',
                    value:item.geometry.attributes.position.count,
                    locked:true
                })
            }

        })
        return defs
    }

    loadGLTF(url) {
        const loader = new GLTFLoader()
        console.log("loading the url",url)
        loader.load(url, (gltf)=>{
            console.log("loaded",gltf)
            this.setDocument(gltf.scene,'gltfid')
        },
            (xhr)=>console.log("progress",xhr),
            (err)=>console.log("error happened",err)
            )
    }
    calculateContextMenu = () => this.contextMenu
}


class GLTFView extends Component {
    componentDidMount() {
        console.log("mounted")
        let w = 500
        let h = 500
        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, w / h, 1, 5000)
        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true})
        this.renderer.setPixelRatio( window.devicePixelRatio );

        this.renderer.setClearColor(0xffffff,1)
        this.renderer.setSize(w, h)
        this.camera.position.set(0, 1, 3)
        this.camera.lookAt(new THREE.Vector3())
        this.controls = new OrbitalControls(this.camera,this.canvas)

        this.light = new THREE.HemisphereLight( 0xbbbbff, 0x444422 );
        this.light.position.set( 0, 1, 0 );
        this.scene.add( this.light );

        const light = new THREE.DirectionalLight( 0xffffff );
        light.position.set( 0, 10, 10 );
        this.scene.add( light );

        this.props.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,()=>{
            this.rebuildScene(this.props.provider.getSceneRoot())
        })

        this.animate()
    }
    animate = () => {
        requestAnimationFrame( this.animate );
        this.renderer.render( this.scene, this.camera );
    }
    rebuildScene(gltfScene) {
        // console.log("making the scene for the GLTF",gltfScene)
        if(!gltfScene) return
        this.scene.add(gltfScene)
    }
    render() {
        const w = 500
        const h = 500
        return <canvas width={w} height={h} ref={(canvas) => this.canvas = canvas} onClick={this.clicked}/>
    }

    clicked = (e) => {
        let w = 500
        let h = 500
        const mouse = new THREE.Vector2()
        const bounds = this.canvas.getBoundingClientRect()
        console.log("w = ", e.clientX-bounds.left, e.clientY-bounds.top)
        mouse.x = ((e.clientX-bounds.left)/w) * 2 - 1
        mouse.y = -((e.clientY-bounds.top)/h) * 2 + 1

        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(mouse,this.camera)
        const intersects = raycaster.intersectObjects(this.scene.children,true)
        if(intersects.length > 0) {
            const int = intersects[0]
            Selection.setSelection(int.object)
        }

    }
}