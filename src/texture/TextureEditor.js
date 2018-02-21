import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import {makePoint} from '../utils'
import TextureEditorCanvas from "./TextureEditorCanvas";
import TextureApp from './TextureApp'

/*


TODO: switch to a more efficient data structure for RGB and value and real output colors

sin out: value from -1 to 1 across time. adjust using phase and add constant to scale to 0->1
value to color: turns value into a lerp across two colors. does not care about time, but passes it on
checkerboard: produces one of two input colors at a given xy, does not care about time

value to fill: produces an xyfill, color at a given xy using two input value functions for xt goes 0 to 1 and yt goes 0 to 1
interpolates between input colors A and B


valueToFill(sin(),sin(), color A, color B)


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





- make node types in the model: oscillator, output. later add adsr.
- add buttons to create these node types
- make button which will build a webaudio graph from the current model. always destroys the previous graph if exists.
- button will then wait 100ms and issue a trigger to play the audio.
- let you set oscillator frequency and detune

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
            let freq = prov.computeInputPropertyValueAt(node.id,'frequency',th)
            let amp = prov.computeInputPropertyValueAt(node.id,'amplitude',th)
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
            return prov.computeInputPropertyValueAt(node.id, 'color', pt)
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
            const size = prov.computeInputPropertyValueAt(node.id,'size',pt)
            if((pt.x+pt.y) % 2 == 0) {
                return prov.computeInputPropertyValueAt(node.id, 'a', pt)
            } else {
                return prov.computeInputPropertyValueAt(node.id, 'b', pt)
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
    },
    valueToColor: {
        title:'Make Color',
        inputs: {
            xin: {
                type:'number',
                default:0
            },
            yin: {
                type:'number',
                default:0
            },
            a: {
                type:'color',
                default:'#ff0000'
            },
            b: {
                type:'color',
                default:'#0000ff'
            }
        },
        outputs: {
            fill: {
                type:'xyfill'
            }
        },
        generateValue: (prov, node, pt) => {
            const x = (1+prov.computeInputPropertyValueAt(node.id,'xin',pt.x))/2
            const y = (1+prov.computeInputPropertyValueAt(node.id,'yin',pt.y))/2
            return x*y
        }
    },


    oscillator: {
        title:'oscillator',
        inputs: {
            frequency: {
                type:'number',
                default:440
            },
            waveform: {
                type:'enum',
                value:'sine'
            }

        },
        outputs: {
            output: {
                type:'pipe'
            }
        }
    },

    gain: {
        title:'gain',
        inputs: {
            gain: {
                type:'number',
                default: 0.5
            },
            input: {
                type:'pipe'
            }
        },
        outputs: {
            output: {
                type:'pipe'
            }
        }
    },

    speaker: {
        title:'speaker',
        inputs: {
            input: {
                type:'pipe'
            }
        },
        outputs: {}
    },

    envelope: {
        title:'envelope',
        inputs: {
            attack: {
                type:'number',
                default:0.1,
            },
            decay: {
                type:'number',
                default:0.1
            },
            sustain: {
                type:'number',
                default: 0.5
            },
            release: {
                type:'number',
                default: 0.5
            }
        },
        outputs: {
            output: {
                type:'pipe'
            }
        }
    }
}

function toHex2(val) {
    const str = val.toString(16)
    if(str.length < 2) return "0"+str
    return str
}

function lerp(a,b,t) {
    return a + (b-a)*t
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export default class TextureEditor extends TreeItemProvider {
    constructor() {
        super()
        this.id_index = {}
        this.audioContext =new (window.AudioContext || window.webkitAudioContext)(); // define audio context
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
    getApp() {
        return <TextureApp provider={this}/>
    }

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
        console.log("got template",name,tmpl)
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


    getValuesForEnum(key) {
        const WAVEFORMS = ['sine','sawtooth','square','triangle']
        if(key === 'waveform') return WAVEFORMS;
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

    computeInputPropertyValueAt = (nid, key, t) => {
        if(this.isInputConnected(nid,key)) {
            const conn = this.findInputConnectionById(nid,key)
            const node = this.findNodeById(conn.output.node)
            const template = this.getTemplate(node)
            return template.generateValue(this,node,t)
        }
        const node = this.findNodeById(nid)
        if(!node) return 0
        if(!node.inputs) return 0
        if(typeof node.inputs[key] !== 'undefined') {
            return node.inputs[key].value
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

    isInputConnected(id,key) {
        return this.getConnections().find((conn)=>conn.input.node === id && conn.input.prop === key)
    }
    findOutputConnectionById = (id, key) => this.getConnections().find((conn) => conn.output.node === id && conn.output.prop === key)
    findInputConnectionById  = (id, key) => this.getConnections().find((conn) => conn.input.node === id && conn.input.prop === key)

    isOutputConnected(id,key) {
        return this.getConnections().find((conn)=>conn.output.node === id && conn.output.prop === key)
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
        const outputNode = this.findNodeById(outputId)
        if(!outputNode) return
        if(!outputNode.outputs[outputKey]) return
        const inputNode = this.findNodeById(inputId)
        if(!inputNode) return
        if(!inputNode.inputs[inputKey]) return

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
        this.root.connections.push(conn)
        outputNode.outputs[outputKey].connections.push(conn.id)
        inputNode.inputs[inputKey].connections.push(conn.id)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
    }


    generateAndPlayAudioGraph() {
        console.log("making the audio graph",this.root.nodes,this.audioContext)
        const graph = {}
        this.root.nodes.forEach((node,i)=>{
            console.log("node is",node)
            if(node.template === 'oscillator') {
                console.log("making an oscillator")
                const o = this.audioContext.createOscillator()
                o.type = node.inputs.waveform.value
                o.frequency.value = node.inputs.frequency.value
                graph[node.id] = o
            }
            if(node.template === 'gain') {
                console.log("making a gain node")
                const o = this.audioContext.createGain()
                o.gain.value = node.inputs.gain.value
                graph[node.id] = o
            }
            if(node.template === 'speaker') {
                console.log("dont do anything for the speaker")
                graph[node.id] = this.audioContext.destination
            }
        })
        console.log("graph",graph)
        this.root.connections.forEach((conn)=>{
            console.log("connection",conn)
            const out_node = graph[conn.output.node]
            const in_node = graph[conn.input.node]
            console.log(out_node, in_node)
            out_node.connect(in_node)
        })

        this.root.nodes.forEach((node)=>{
            if(node.template === 'oscillator') {
                graph[node.id].start()
            }
        })


        setTimeout(()=>{
            this.root.nodes.forEach((node)=>{
                if(node.template === 'oscillator') {
                    graph[node.id].stop()
                }
            })
        },3000)
    }
}