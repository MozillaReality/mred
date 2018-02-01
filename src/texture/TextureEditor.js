import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import {makePoint} from '../utils'

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
    addConnection(fromId, fromKey, toId, toKey) {
        if(!this.root.connections) this.root.connections = []
        if(!fromId) return
        if(!toId) return
        const conn = {
            type:'connection',
            id: this.genID('connection'),
            output: {
                node:fromId,
                prop:fromKey
            },
            input: {
                node:toId,
                prop:toKey
            }
        }
        console.log('adding connection',fromId, fromKey, toId, toKey,conn)
        this.root.connections.push(conn)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
    }
}

class TextureEditorCanvas extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selection:null,
            connecting:false
        }
    }
    componentDidMount() {
        this.sel_listener = SelectionManager.on(SELECTION_MANAGER.CHANGED, (sel)=> {
            console.log("new selection is", SelectionManager.getSelection())
            this.setState({selection:sel})
        })
        // setTimeout(this.drawGraph,1000)
    }
    drawGraph = () => {
        if(!this.canvas) return
        const c = this.canvas.getContext('2d')
        c.fillStyle = 'red'
        c.fillRect(0,0,100,100)
        const graph = this.props.provider.findNodeByTemplate('graph')
        const prov = this.props.provider
        if(graph) {
            c.beginPath()
            for(let t=0; t<Math.PI*2; t+=0.2) {
                const v = prov.computePropertyValueAtT(graph.id,'value',t)
                c.lineTo(t*(100/(Math.PI*2)),v*50+50)
            }
            c.strokeStyle = 'black'
            c.stroke()
        }
        const fillout = prov.findNodeByTemplate('fillout')
        if(fillout) {
            // const pt = makePoint(0,0)
            // const v = prov.computePropertyValueAtT(fillout.id,'a',pt)
        }
    }

    render() {
        const scene = this.props.provider.getSceneRoot()
        if(!scene) return <div>empty</div>
        const style = {
            width:'800px',
            height:'900px'
        }
        return <div className="node-canvas">
            <svg style={style} ref={(svg)=>this.svg = svg}>
                {this.renderConnections(scene)}
                {this.renderChildren(scene)}
                {this.renderOverlay()}
            </svg>
            <canvas width="100" height="100" ref={(can)=>this.canvas = can} className="graph-output-canvas"/>
        </div>
    }

    pressCircle = (e, ch, key, dir)=>{
        e.stopPropagation()
        e.preventDefault()
        if(this.props.provider.isConnected(ch.id,key)) {
            // this.props.provider.deleteConnection(ch.id,key)
            return
        }


        const rect = e.target.getBoundingClientRect()
        const rect2 = this.svg.getBoundingClientRect()
        const pt = makePoint(rect.x-rect2.x, rect.y-rect2.y)
        this.setState({connecting:true,start:pt,end:pt})
        const l1 = (e) => {
            // const rect = e.target.getBoundingClientRect()
            const rect2 = this.svg.getBoundingClientRect()
            const pt = makePoint(e.clientX-rect2.x, e.clientY-rect2.y)
            this.setState({end:pt})
        }
        const l2 = (e) => {
            window.removeEventListener('mousemove',l1)
            window.removeEventListener('mouseup',l2)
            this.setState({connecting:false})
            if(this.state.end.distance(this.state.start) < 10) {
                // console.error('same node, just delete it')
                if(dir === 'output') {
                    const conn = this.props.provider.findOutputConnectionById(ch.id, key)
                    this.props.provider.deleteConnection(conn)
                }
                if(dir === 'input') {
                    const conn = this.props.provider.findInputConnectionById(ch.id, key)
                    this.props.provider.deleteConnection(conn)
                }
                return;
            }
            if(!e.target.hasAttribute("data-propname")) {
                console.error("not a valid target. abort!")
                return
            }
            const toDir = e.target.getAttribute("data-direction")
            const toKey = e.target.getAttribute('data-propname')
            const toId   = e.target.getAttribute('data-nodeid')
            if(toDir === dir) {
                console.error("can't join same directions",toDir,dir)
                return
            }
            console.log("adding a connection")
            this.props.provider.addConnection(ch.id,key,toId,toKey)
        }
        window.addEventListener('mousemove',l1)
        window.addEventListener('mouseup',l2)
    }


    startMovingBG = (e,node) => {
        e.stopPropagation()
        e.preventDefault()
        SelectionManager.setSelection(node)
        const l = (e) => {
            const defs = this.props.provider.getProperties(node)
            const xdef = defs.find((def)=>def.key === 'x')
            const ydef = defs.find((def)=>def.key === 'y')
            this.props.provider.setPropertyValue(node,xdef,e.layerX)
            this.props.provider.setPropertyValue(node,ydef,e.layerY)
        }
        let l2 = () => {
            window.removeEventListener('mousemove',l)
            window.removeEventListener('mouseup',l2)
        }
        window.addEventListener('mousemove',l)
        window.addEventListener('mouseup',l2)
    }

    renderChildren(scene) {
        const prov = this.props.provider;
        return <g>{scene.nodes.map((node,i)=>{
            const ins = Object.keys(node.inputs).map((prop,i)=>{
                let clss = "handle"
                if(prov.isInputConnected(node.id,prop)) clss += " connected"
                return <g key={prop} transform={`translate(0,${i*25})`}>
                    <circle className={clss}
                            cx="0" cy="-5" r="5"
                            onMouseDown={(e)=>this.pressCircle(e,node,prop,"input")}
                            data-propname={prop}
                            data-nodeid={node.id}
                            data-direction="input"
                    />
                    <text x={10} y={0} textAnchor="start">{prop}</text>
                </g>
            })
            const outs = Object.keys(node.outputs).map((prop,i)=>{
                let clss = "handle"
                if(this.props.provider.isOutputConnected(node.id,prop)) clss += " connected"
                return <g key={prop} transform={`translate(0,${i*25})`}>
                    <circle className={clss}
                            cx="0" cy="-5" r="5"
                            data-propname={prop}
                            data-nodeid={node.id}
                            data-direction="output"
                            onMouseDown={(e)=>this.pressCircle(e,node,prop,"output")}
                    />
                    <text x={-10} y={0} textAnchor="end">{prop}</text>
                </g>
            })
            const w = 170
            const r = 10
            let clss = ""
            if(node === SelectionManager.getSelection()) clss += " selected"
            const template = prov.getTemplate(node)
            return <g key={i} transform={`translate(${node.x},${node.y})`} className={clss}>
                <rect className="bg" x={0} y={0} width={w} height={100} rx={r} ry={r}
                      onMouseDown={(e)=>this.startMovingBG(e,node)}/>
                <rect className="header-bg" x={0} y={0} width={w} height={20}/>
                <text className="header" x={5} y={15} content="foo">{template.title}</text>
                <g transform="translate(10,40)">{ins}</g>
                <g transform={`translate(${w-10},${40})`}>{outs}</g>
                <rect className="selection" x={0} y={0} width={w} height={100} rx={r} ry={r}/>
            </g>
        })}</g>
    }
    renderConnections(scene) {
        const conns = this.props.provider.getConnections().map((conn,i) => {
            const output = this.props.provider.findNodeById(conn.output.node)
            const input = this.props.provider.findNodeById(conn.input.node)
            const oy = 0;
            if(!output) return ""
            if(!input) return ""
            const iy = this.props.provider.getInputPropertyPosition(input,conn.input.prop);
            const w = 170
            const path = `M ${output.x+w-10} ${output.y+40-5+oy*25} ${input.x+10} ${input.y+40-5+iy*25}`
            return <path key={i} d={path} className="connection-line"/>
        })
        return <g>{conns}</g>
    }
    renderOverlay() {
        if(!this.state.connecting) return ""
        const path = `M ${this.state.start.x} ${this.state.start.y} L ${this.state.end.x} ${this.state.end.y}`;
        return <path d={path} className="connection-line"/>
    }
    renderNode(node,i) {
        const template = this.props.provider.getTemplate(node)
        // console.log(node,template)
        const style = {
            left:`${node.x}px`,
            top:`${node.y}px`,
            width:'200px'
        }
        return <div key={i} className="node-wrapper"
                    style={style}
        >
            <div className="title">{template.title}</div>

            <ul className="inputs">
                {Object.keys(template.inputs).map((key)=>{
                    const inp = template.inputs[key]
                    return <li key={key}><i className="fa fa-circle-o"></i> {key}</li>
                })}
            </ul>
            <ul className="outputs">
                {Object.keys(template.outputs).map((key)=>{
                    const oup = template.outputs[key]
                    let icon = <i className="fa fa-circle-o"></i>
                    if(this.props.provider.isConnected(node,key,oup)) {
                        console.log("output",key,'is connected')
                        icon = <i className="fa fa-circle connected"></i>
                    }
                    return <li key={key}>{key} {icon}</li>
                })}
            </ul>

        </div>
    }
}