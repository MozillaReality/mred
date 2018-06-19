import React, {Component} from 'react'
import GridEditorApp, {Panel, Spacer, Toolbar, ToggleButton} from '../GridEditorApp'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {genID, shallowCopy} from '../utils'
import TreeTable from '../TreeTable'
import PropSheet from '../PropSheet'
import Selection from '../SelectionManager'



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
    horizontalAlignment: {
        name: 'Horiz Align',
        key:'horizontalAlignment',
        type:'enum',
        locked: false
    }
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




    /* ========== renderers ============ */
    getRendererForItem(item) {
        if(item.type === 'stack') return <div><i className="fa fa-exclamation-triangle"/>Stack</div>
        if(item.type === 'scene') return <div><i className="fa fa-street-view"/>{item.title}</div>
        if(item.type === 'layer') return <div><i className="fa fa-cubes"/>{item.title}</div>
        if(item.type === 'primitive') return <div><i className="fa fa-cube"/>Stack</div>
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
            </Toolbar>

            <Panel center middle scroll>
                <Editor3602DCanvas provider={this.prov()}/>
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

}


export class Editor3602DCanvas extends Component {
    render() {
        return <div>this is the 2d overhead view</div>
    }
}