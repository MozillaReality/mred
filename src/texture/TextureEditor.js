import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import {makePoint} from '../utils'
import TextureEditorCanvas from "./TextureEditorCanvas";

/*

sin produces sin wave based on frequency and time
    inputs
        frequency: 1/sec
        amplitude: 1
    outputs:
        value:

scale, scales the input value by another value
    inputs:
        value
        factor
    outputs:
        value

const, produces a constant value
    inputs:
        value:  (text editor for the input value, is numeric
    outputs: value

graph: graphs the input value over t from 0 to 2Pi



 */


const templates = {
    sin: {
        title:'sin',
        inputs: {
            frequency: {
                type:'number',
                default:1,
            },
            amplitude: {
                type:'number',
                default:1
            }
        },
        outputs: {
            value: {
                type:'number'
            }
        },
        generateValue: (prov, node, th)=>{
            let freq = prov.computePropertyValueAtT(node.id,'frequency',th)
            let amp = prov.computePropertyValueAtT(node.id,'amplitude',th)
            return Math.sin(th*freq)*amp
        }
    },
    graph: {
        title:'graph',
        inputs: {
            value: {
                type:'number',
                default: 1
            }
        },
        outputs: {},
        view:'graphoutput'
    },
    fillcolor: {
        title:'fill color',
        inputs: {
            color: {
                type:'color',
                default:'red'
            }
        },
        outputs: {
            value: {
                type:'xyfill'
            }
        },
        generateValue: (prov, node, pt) => {
            console.log("prove is", prov.getDocType())
            return prov.computePropertyAtValueT(node.id, 'color', pt)
        }
    },
    checkerboard: {
        title:'checkerboard',
        inputs: {
            size: {
                type: 'number',
                default: 10
            },
            a: {
                type: 'xyfill',
                default: null
            },
            b: {
                type: 'xyfill',
                default: null
            },
        },
        outputs: {
            value: {
                type:'xyfill'
            }
        },
        generateValue: (prov, node, pt) => {
            console.log("doing size",prov.computePropertyAtValueT)
            console.log("this ",this)
            const size = prov.computePropertyAtValueT(node.id,'size',pt)
            if((pt.x % size) < size/2) {
                return prov.computePropertyAtValueT(node.id, 'a', pt)
            } else {
                return prov.computePropertyAtValueT(node.id, 'b', pt)
            }
        }
    },
    fillout: {
        title:'fill output',
        inputs: {
            a: {
                type:'xyfill',
                default:null
            }
        },
        outputs:{},
    }

}

export default class TextureEditor extends TreeItemProvider {
    constructor() {
        super()
        this.id_index = {}
    }
    makeEmptyRoot() {
        return {
            id:this.genID('root'),
            type:'root',
            nodes:[],
            connections:[]
        }
    }
    getDocType = () => "texture"
    getTitle = () => "Texture Editor"
    getCanvas = () => <TextureEditorCanvas provider={this}/>

    setDocument(doc,docid) {
        super.setDocument(doc, docid)
        this.id_index = {}
        this.root.nodes.forEach((ch) => this.id_index[ch.id] = ch)
        this.root.connections.forEach((ch) => this.id_index[ch.id] = ch)
    }

    /* handle the structure */
    hasChildren = (node) => (node.type === 'root' || node.type === 'nodes' || node.type === 'connections')
    getChildren = (node) => {
        if(node.type === 'root') return [ { type:'nodes'}, {type:'connections'}]
        if(node.type === 'nodes') return this.getNodes()
        if(node.type === 'connections') return this.getConnections()
        return []
    }
    getNodes = () => this.root.nodes
    getConnections = () => this.root.connections
    appendNode(ch) {
        this.root.nodes.push(ch)
        this.id_index[ch.id] = ch
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
    }
    deleteChild(child) {
        if(child.type === 'node') return this.deleteNode(child)
        if(child.type === 'connection') return this.deleteConnection(child)
        console.error("cannot delete child", child)
    }
    deleteNode(child) {
        if(child.type === 'root') return;
        const index = this.root.nodes.indexOf(child)
        if(index<0) return console.error("can't find index of child",child)
        this.root.nodes.splice(index,1)
        this.root.connections = this.root.connections.filter((conn)=>{
            return (conn.from !== child.id && conn.to !== child.id)
        })
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
        SelectionManager.setSelection(this.root)
    }
    deleteConnection(child) {
        this.root.connections = this.root.connections.filter((conn)=>conn.id !== child.id)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
    }




    findNodeById(id) {
        return this.id_index[id]
    }
    findNodeByTemplate(temp) {
        return this.root.nodes.find((ch)=>ch.template === temp)
    }
    getTemplateByName = (name) => templates[name]


    //deal with properties

    makeNodeFromTemplate(name) {
        const tmpl = this.getTemplateByName(name)
        const inputs = {}
        Object.keys(tmpl.inputs).forEach((key)=>{
            inputs[key] = {
                type:tmpl.inputs[key].type, // the datatype
                value:tmpl.inputs[key].default, // the stored value
                connections:[] //list of connections
            }
        })
        const outputs = {}
        Object.keys(tmpl.outputs).forEach((key)=>{
            outputs[key] = {
                type:tmpl.outputs[key].type,
                connections:[] //list of connections
            }
        })
        return {
            type: 'node',
            id: this.genID('node'),
            template: name,
            x: 50,
            y: 100,
            inputs: inputs,
            outputs: outputs
        }
    }

    getInputPropertyPosition  = (node, prop) => Object.keys(node.inputs).indexOf(prop)
    getOutputPropertyPosition = (node, prop) => Object.keys(node.outputs).indexOf(prop)

    getProperties(node) {
        if(!node) return []

        if(node.type === 'root') {
            return [{
                name:'ID',
                key:'id',
                value:node['id'],
                type:'string',
                locked:true,
            }]
        }
        if(node.type === 'connections') return []
        if(node.type === 'connection') return [{
                name:'Type',
                key:'type',
                value:node.type,
                type:'string',
                locked:true
        }]
        if(node.type === 'nodes') return []

        if(node.type === 'node') {

            const defs = []
            // ID
            defs.push({ name:'ID', key:'id', value:node['id'], type:'string', locked:true  })
            defs.push({ name:'x',  key:'x',  value:node.x,     type:'number', locked:false })
            defs.push({ name:'y',  key:'y',  value:node.y,     type:'number', locked:false })

            //INPUTS
            const template = this.getTemplateByName(node.template)
            if (!template) console.error("couldn't find template for node", node)

            Object.keys(node.inputs).forEach((key) => {
                defs.push({
                    name: key,
                    key: key,
                    value: node.inputs[key].value,
                    type: node.inputs[key].type,
                    dir:'input',
                    locked: (node.inputs[key].connections.length > 0) //lock if connected
                })
            });
            Object.keys(node.outputs).forEach((key) => {
                defs.push({
                    name: key,
                    key: key,
                    value: 0,
                    type: node.outputs[key].type,
                    dir:'output',
                    locked:true
                })
            });
            return defs
        }

        return []
    }
    setPropertyValue(item,def,value) {
        if(def.type === 'number') value = parseFloat(value);
        if(def.dir === 'input') item.inputs[def.key].value = value
        if(def.key==='x' || def.key==='y') item[def.key] = value
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,item)
    }
    getPropetyValue(node,key) {
        let val = node[key]
        if (typeof val === 'undefined') {
            const temp = this.getTemplate(node)
            val = temp.inputs[key].default
        }
        return val
    }


    getTemplate(node) {
        return templates[node.template]
    }
    getRendererForItem(node) {
        if(!node) return <div>error</div>
        if(node.type === 'root') return <div>root</div>
        if(node.type === 'connections') return <div>connections</div>
        if(node.type === 'nodes') return <div>nodes</div>
        if(node.type === 'node') return <div>node {node.template}</div>
        if(node.type === 'connection') return <div>connection from {node.output.node}</div>
        console.log("what time of node",node.type)
        return <div>error. unknown type</div>
    }

    computePropertyValueAtT(nid,key,t) {
        if(this.isConnected(nid,key)) {
            const conn = this.findConnection(nid,key)
            if(conn.to === nid) {
                const source = this.findNodeById(conn.from)
                const template = this.getTemplate(source)
                return template.generateValue(this,source,t)
            }
        }
        const node = this.findNodeById(nid)
        if(!node) return 0
        if(!node.inputs) return 0
        if(typeof node.inputs[key] !== 'undefined') {
            return node.inputs[key]
        }
        const template = this.getTemplate(node)
        return template.inputs[key].default
    }

    generateSelectionPath(node) {
        if(!node) return []
        if(node.type === 'root') return [this.root.id]
        return [this.root.id,node.id]
    }
    findNodeFromSelectionPath(node,path) {
        if(path.length === 1) return node
        let found = node.nodes.find((ch)=>ch.id === path[1])
        if(found) return found
        return node.connections.find((ch)=>ch.id === path[1])
    }

    getTreeActions() {
        return [
            {
                title: 'object',
                icon: 'plus',
                type: 'menu',
                actions: [

                    {
                        title: 'sin',
                        icon: 'plus',
                        fun: () => this.appendNode(this.makeSinNode())
                    },
                    {
                        title: 'graph',
                        icon: 'plus',
                        fun: () => this.appendNode(this.makeGraphNode())
                    },
                    {
                        title: 'check',
                        icon: 'plus',
                        fun: () => this.appendNode(this.makeNodeFromTemplate('checkerboard'))
                    },
                    {
                        title: 'fill',
                        icon: 'plus',
                        fun: () => this.appendNode(this.makeNodeFromTemplate('fillcolor'))
                    },
                    {
                        title: 'fillout',
                        icon: 'plus',
                        fun: () => this.appendNode(this.makeNodeFromTemplate('fillout'))
                    },
                ]
            },
            {
                icon:'close',
                fun: () => {
                    this.deleteChild(SelectionManager.getSelection())
                }
            },
        ]
    }
    makeSinNode() {
        return this.makeNodeFromTemplate('sin')
    }
    makeGraphNode() {
        return this.makeNodeFromTemplate('graph')
    }
    makeConnectionNode() {
        const scene = this.root
        if(!scene.connections) scene.connections = []
        const ch = scene.children[0]
        const tg = scene.children[1]
        const conn = {
            from: ch.id,
            to: tg.id,
            fromProp: 'value',
            toProp: 'value',
        }
        console.log('connection',conn)
        scene.connections.push(conn)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
    }
    isInputConnected(id,key) {
        return this.getConnections().find((conn)=>conn.input.node === id && conn.input.prop === key)
    }
    findOutputConnectionById = (id, key) => this.getConnections().find((conn) => conn.output.node === id && conn.output.prop === key)
    findInputConnectionById  = (id, key) => this.getConnections().find((conn) => conn.input.node === id && conn.input.prop === key)

    isOutputConnected(id,key) {
        return this.getConnections().find((conn)=>conn.output.node === id && conn.output.prop === key)
    }
    isConnected(id, key) {
        if(!this.root || !this.root.connections) return false
        return this.root.connections.some((conn) => {
            if(conn.from === id && conn.fromProp === key) return true
            if(conn.to   === id && conn.toProp   === key) return true
            return false
        })
    }
    findConnection(id, key) {
        return this.root.connections.find((conn)=>{
            if(conn.from === id && conn.fromProp === key) return true
            if(conn.to   === id && conn.toProp   === key) return true
            return false
        })
    }
    isValidInputConnection(conn, dir) {
        if(dir !== 'input') return false
        if(!conn.input.prop) return false
        if(conn.output.node === conn.input.node) return false
        return true
    }
    isValidOutputConnection(conn, dir) {
        if(dir !== 'output') return false
        if(!conn.input.prop) return false
        if(conn.output.node === conn.input.node) return false
        return true
    }
    addConnection(outputId, outputKey, inputId, inputKey) {
        if(!this.root.connections) this.root.connections = []
        if(!outputId) return
        if(!inputId) return
        const conn = {
            type:'connection',
            id: this.genID('connection'),
            output: {
                node:outputId,
                prop:outputKey
            },
            input: {
                node:inputId,
                prop:inputKey
            }
        }
        // console.log('adding connection',outputId, outputKey, inputId, inputKey,conn)
        this.root.connections.push(conn)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
    }
}