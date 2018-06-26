import React, {Component} from 'react'
import GridEditorApp, {Panel, Spacer, Toolbar, ToggleButton} from '../GridEditorApp'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {genID, shallowCopy} from '../utils'
import TreeTable from '../TreeTable'
import PropSheet from '../PropSheet'
import Selection, {SELECTION_MANAGER} from '../SelectionManager'
import * as THREE from 'three'
import Editor360Canvas2D from './Editor360Canvas2D'

const PROP_DEFS = {
    id: {
        name:'ID',
        type:'string',
        key:'id',
        locked:true
    },
    type: {
        name:'Type',
        type:'string',
        key:'type',
        locked:true
    },
    title: {
        name:'Title',
        type:'string',
        key:'title',
        locked:false
    },
    primitive: {
        key:'primitive',
        type:'string',
        locked:true,
        hidden:true,
    },
    width: {
        name:'Width',
        key:'width',
        type:'number',
        locked:false,
    },
    depth: {
        name:'Depth',
        key:'depth',
        type:'number',
        locked:false,
    },
    height: {
        name:'height',
        key:'height',
        type:'number',
        locked:false,
    },
    elevation: {
        name:'elevation',
        key:'elevation',
        type:'number',
        locked:false,
        min: -10,
        max: 10
    },
    angle: {
        name:'angle',
        key:'angle',
        type:'number',
        locked:false,
        min: 0,
        max: 360
    },
}


export class Editor360Provider extends TreeItemProvider {
    constructor() {
        super()
        this.root = this.makeEmptyRoot()
        this.id_index = {}
    }

    /* general stuff */
    getApp() {
        return <Editor360App provider={this}/>
    }
    getTitle() {
        return "360 Experience Editor"
    }


    /* ============= document model =========== */

    getDocType() {
        return "360"
    }
    setDocument(doc,docid) {
        super.setDocument(doc, docid)
        this.id_index = {}
        this.root.children.forEach(node => this.setParent(node,this.root))
    }
    setParent(node,parent) {
        this.id_index[node.id] = node
        node.parent = parent
        if(node.children) {
            node.children.forEach(n => this.setParent(n,node))
        }
    }
    makeEmptyRoot() {
        return {
            title:'stack',
            type:'stack',
            id: genID('stack'),
            children: [this.createScene()],
        }
    }
    createScene() {
        return {
            id: this.genID('scene'),
            type: 'scene',
            title: 'untitled scene',
            children: [this.createLayer()],
        }
    }
    createLayer() {
        return {
            id: this.genID('layer'),
            type:'layer',
            title:'A Layer',
            children: [],
        }
    }
    createCube() {
        return {
            id: this.genID('cube'),
            type:'primitive',
            primitive:'cube',
            width:1,
            height:1,
            depth:1,
            angle:0,
            elevation:0,
            title:'Cube',
        }
    }
    appendChild(parent,item) {
        this.id_index[item.id] = item
        item.parent = parent
        parent.children.push(item);
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_ADDED,{
            provider:this,
            parent:parent,
            child:item
        });
    }



    /* ============ properties ============== */
    getProperties(item) {
        const defs = [];
        if(!item) return defs;
        Object.keys(item).forEach((key)=>{
            if(key === 'children') return;
            if(key === 'parent') return;

            if(PROP_DEFS[key]) {
                const def = shallowCopy(PROP_DEFS[key])
                def.value = item[key]
                defs.push(def)
                return
            }
            throw new Error(`unknown property '${key}'`)

        })
        return defs;
    }
    setPropertyValues(item, updates) {
        const olds = {}
        const news = {}
        Object.keys(updates).forEach((key)=>{
            olds[key] = item[key]
            news[key] = updates[key]
            item[key] = updates[key]
        })
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, {
            provider:this,
            node:item,
            newValues:news,
            oldValues:olds
        })
    }
    setPropertyValueByName(item,key,value) {
        const updates = { }
        updates[key] = value
        this.setPropertyValues(item,updates)
    }

    /* ========= selection =========== */
    findSceneParent(o) {
        if(o.type === 'scene') return o
        return this.findSceneParent(o.parent)
    }
    findLayerParent(o) {
        if(o.type === 'layer') return o
        return this.findLayerParent(o.parent)
    }
    findSelectedScene() {
        let sel = Selection.getSelection()
        if(!sel || sel === this.getSceneRoot()) return this.getSceneRoot().children[0]
        return this.findSceneParent(sel)
    }
    findSelectedLayer() {
        let sel = Selection.getSelection()
        if(!sel || sel.type === 'stack') return this.getSceneRoot().children[0].children[0]
        if(sel.type === 'scene') return sel.children[0]
        if(sel.type === 'layer') return sel
        return this.findLayerParent(sel)
    }
    generateSelectionPath(node) {
        if(!node || !node.id) return []
        if(!node.parent) return [node.id]
        return this.generateSelectionPath(node.parent).concat([node.id])
    }
    findNodeFromSelectionPath(node,path) {
        const part = path[0]
        if(node.id === part) {
            if(path.length <= 1) return node
            for(let i=0; i<node.children.length; i++) {
                const child = node.children[i]
                const res = this.findNodeFromSelectionPath(child,path.slice(1))
                if(res) return res
            }
        }
        return null
    }





        /* ========== renderers ============ */
    getRendererForItem(item) {
        if(item.type === 'stack') return <div><i className="fa fa-exclamation-triangle"/>Stack</div>
        if(item.type === 'scene') return <div><i className="fa fa-street-view"/>{item.title}</div>
        if(item.type === 'layer') return <div><i className="fa fa-cubes"/>{item.title}</div>
        if(item.type === 'primitive') return <div><i className="fa fa-cube"/>{item.title}</div>
        return <div><i className="fa fa-diamond"/>foo</div>
    }
}

export class Editor360App extends Component {
    constructor(props) {
        super(props)
    }
    prov = () => this.props.provider

    render() {
        return <GridEditorApp provider={this.prov()}>
            <Toolbar left top>
                <label>{this.prov().getTitle()}</label>
            </Toolbar>
            <Panel scroll left middle>
                <TreeTable root={this.prov().getSceneRoot()} provider={this.prov()}/>
            </Panel>


            <Toolbar center top>
                <button className="fa fa-laptop" onClick={this.addLayer}/>
                <button className="fa fa-square" onClick={this.addCube}/>
                <button className="fa fa-text-width" onClick={this.addText}/>
                <button className="fa fa-image" onClick={this.addBGImage}/>
                <button className="fa fa-close" onClick={this.deleteObject}/>
                <Spacer/>
                {/*<button className="fa fa-save" onClick={this.save} disabled={!this.state.dirty}/>*/}
                <button className="fa fa-undo" onClick={this.undo}/>
                <button className="fa fa-repeat" onClick={this.redo}/>
                <Spacer/>
                <button className="fa fa-play" onClick={this.preview}/>
                <button className="fa fa-save" onClick={this.save}/>
            </Toolbar>

            <Panel center middle scroll>
                <Editor360Canvas2D provider={this.prov()}/>
            </Panel>



            <Toolbar right top>
                <label>Properties</label>
            </Toolbar>
            <Panel scroll right>
                <PropSheet provider={this.prov()}/>
            </Panel>
        </GridEditorApp>
    }

    addLayer  = () => this.prov().appendChild(this.prov().findSelectedScene(),this.prov().createLayer())
    addCube   = () => this.prov().appendChild(this.prov().findSelectedLayer(),this.prov().createCube())
    preview = () => window.open(`./?mode=preview&doctype=${this.prov().getDocType()}&doc=${this.prov().getDocId()}`)
    save = () => this.prov().save()

}


export class Preview360 extends Component {
    constructor(props) {
        super(props)
        this.state = {
            doc:null,
            scene:null
        }
    }
    componentDidMount() {
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
        this.camera.lookAt(new THREE.Vector3(0,0,0))
        this.rebuildScene(this.state.scene)
        this.startRepaint()
    }

    startRepaint() {
        const repaint = () => {
            requestAnimationFrame(repaint)
            // this.controls.update();
            // const delta = this.clock.getDelta(0)
            // if(this.mixer) {
            //     this.mixer.update(delta)
            // }
            // console.log('rendering')
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
        this.rebuildScene(doc.children[0])
    }

    buildNode(node) {
        let obj = null;

        console.log("parsing node",node.type)
        if (node.type === 'layer') {
            obj = new THREE.Group()
            // console.log('added the layer group')
            node.children.forEach((nd) => obj.add(this.buildNode(nd)))
            return obj
        }

        if (node.type === 'primitive') {
            if(node.primitive === 'cube') {
                const geometry = new THREE.BoxGeometry(node.width, node.height, node.depth);
                // const color = parseInt(node.color.substring(1), 16)
                const color = 'red'
                const material = new THREE.MeshLambertMaterial({color: color})
                obj = new THREE.Mesh(geometry, material)
            }
        }

        if(!obj) return console.log(`don't know how to handle node of type '${node.type}'`)
        console.log("node is",node)
        // obj.position.x = node.x
        // obj.position.y = node.y
        // obj.position.z = node.z
        obj._ge_id = node.id
        return obj
        // this.scene.add(obj)
        // this.animatable.push(cube)
    }

    rebuildScene(scene) {
        console.log("building the scene",scene)
        if (!this.scene) return
        if (!this.scene.children) return
        //remove all children
        while (this.scene.children.length) this.scene.remove(this.scene.children[0])
        // this.animatable = []
        if (scene) scene.children.forEach((node) => this.scene.add(this.buildNode(node)))
        // if (scene) scene.children.forEach((node) => this.buildAnimation(node,scene))

        const ambient = new THREE.AmbientLight(0xffffff, 0.7)
        this.scene.add(ambient)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
        directionalLight.position.x = -10
        this.scene.add(directionalLight)


        const geometry = new THREE.BoxGeometry(1,1,1);//, node.size, node.size)
        // const color = parseInt(node.color.substring(1), 16)
        // const color = 'green'
        // const material = new THREE.MeshLambertMaterial({color: color})
        // const cube = new THREE.Mesh(geometry, material)
        // this.scene.add(cube)
    }


    render() {
        let w = 800
        let h = 500
        // if (this.props.fillScreen === true) {
            w = '100%'
            h = '100%'
        // }
        return <canvas width={w} height={h} ref={(canvas) => this.canvas = canvas}/>
    }
}