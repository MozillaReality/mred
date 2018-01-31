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
    }

}

const example = {
    id:'root1',
    type:'root',
    children:[
        {
            type:'node',
            id:'node1',
            template:'sin',
            x:50,
            y:50,
            inputs: {
                frequency:8
            }
        },
        {
            type:'node',
            id:'node2',
            template:'graph',
            x:300,
            y:50,
            // connections:[
            //     {
            //         source:'node1',
            //         sourceProperty:'value',
            //         targetProperty:'value'
            //     }
            // ]
        }
    ]
}

export default class TextureEditor extends TreeItemProvider {
    constructor() {
        super()
        this.id_index = {}
        this.setDocument(example,'foo')
    }
    makeEmptyRoot() {
        return {
            id:this.genID('root'),
            type:'root',
            children:[]
        }
    }
    getDocType = () => "texture"
    getTitle = () => "Texture Editor"
    getCanvas = () => <TextureEditorCanvas provider={this}/>

    setDocument(doc,docid) {
        super.setDocument(doc, docid)
        this.id_index = {}
        this.root.children.forEach((ch) => {
            this.id_index[ch.id] = ch
        })
        console.log("doc changed");
    }

    getProperties(node) {
        // console.log("getting properties for node",node)
        const defs = []
        if(!node) return defs

        // ID
        defs.push({
            name:'ID',
            key:'id',
            value:node['id'],
            type:'string',
            locked:true,
        })
        defs.push({
            name:'x',
            key:'x',
            value:node.x,
            type:'number',
            locked:false
        })
        defs.push({
            name:'y',
            key:'y',
            value:node.y,
            type:'number',
            locked:false
        })

        //INPUTS
        if(node.type === 'node') {
            const template = this.getTemplate(node)
            if (!template) {
                console.log("coult not find template for node", node)
            }
            Object.keys(template.inputs).forEach((key) => {
                const t = template.inputs[key]
                let v = t.default
                if(node.inputs[key]) v = node.inputs[key]
                defs.push({
                    name: key,
                    key: key,
                    value: v,
                    type: t.type,
                    dir:'input'
                })
            });
            Object.keys(template.outputs).forEach((key) => {
                const t = template.outputs[key]
                defs.push({
                    name: key,
                    key: key,
                    value: 0,
                    type: t.type,
                    dir:'output',
                    locked:true
                })
            });
        }

        return defs
    }
    hasChildren(node) {
        return (node.children)
    }
    getTemplate(node) {
        return templates[node.template]
    }
    findNodeById(id) {
        return this.id_index[id]
    }
    findNodeByTemplate(temp) {
        return this.root.children.find((ch)=>ch.template === temp)
    }
    getRendererForItem(node) {
        if(node.type === 'root') return <div>root</div>
        return <div>node: {this.getTemplate(node).title}</div>
    }
    setPropertyValue(item,def,value) {
        if(def.type === 'number') value = parseFloat(value);
        if(def.dir === 'input') item.inputs[def.key] = value
        if(def.dir === 'output') item.outputs[def.key] = value
        if(!def.dir) item[def.key] = value
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,item)
    }
    getPropertyValue(node,key) {
        let val = node[key]
        if (typeof val === 'undefined') {
            const temp = this.getTemplate(node)
            val = temp.inputs[key].default
        }
        return val
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

    getChildren(node) {
        return node.children
    }
    generateSelectionPath(node) {
        if(!node) return []
        if(node.type === 'root') return [this.root.id]
        return [this.root.id,node.id]
    }
    findNodeFromSelectionPath(node,path) {
        if(path.length === 1) return node
        return node.children.find((ch)=>ch.id === path[1])
    }
    appendChild(parent,ch) {
        parent.children.push(ch)
        this.id_index[ch.id] = ch
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,parent);
    }
    deleteNode(child) {
        if(child.type === 'root') return;
        const index = this.root.children.indexOf(child)
        if(index<0) return console.log("not really the parent. invalid!")
        this.root.children.splice(index,1)
        this.root.connections = this.root.connections.filter((conn)=>{
            return (conn.from !== child.id && conn.to !== child.id)
        })
        console.log("connects now", this.root.connections)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,child);
        SelectionManager.setSelection(this.root)
    }
    deleteConnection(id,key) {
        const conn1 = this.root.connections.find((conn)=>{
            return (conn.from === id && conn.fromProp === key)
        })
        if(conn1) this.root.connections.splice(this.root.connections.indexOf(conn1),1)
        // console.log("found conn",conn1)
        const conn2 = this.root.connections.find((conn)=>{
            return (conn.to === id && conn.toProp === key)
        })
        // console.log("found conn",conn2)
        if(conn2) this.root.connections.splice(this.root.connections.indexOf(conn2),1)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
    }

    getTreeActions() {
        return [
            {
                title:'sin',
                icon:'plus',
                fun: () => {
                    this.appendChild(this.getSceneRoot(),this.makeSinNode())
                }
            },
            {
                title:'graph',
                icon:'plus',
                fun: () => {
                    this.appendChild(this.getSceneRoot(),this.makeGraphNode())
                }
            },
            {
                icon:'close',
                fun: () => {
                    this.deleteNode(SelectionManager.getSelection())
                }
            },
        ]
    }
    makeSinNode() {
        return {
            type: 'node',
            id: this.genID('node'),
            template: 'sin',
            x: 50,
            y: 50,
            inputs: {
                frequency: 8,
                amplitude:3,
            }
        }
    }
    makeGraphNode() {
        return {
            type:'node',
            id: this.genID('node'),
            template: 'graph',
            x: 50,
            y: 100,
            inputs: {
                value: 0
            }
        }
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
            from: fromId,
            to: toId,
            fromProp: fromKey,
            toProp: toKey
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
            this.setState({selection:sel})
        })
        setInterval(this.drawGraph,100)
    }
    drawGraph = () => {
        if(!this.canvas) return
        const c = this.canvas.getContext('2d')
        c.fillStyle = 'red'
        c.fillRect(0,0,100,100)
        const graph = this.props.provider.findNodeByTemplate('graph')
        const prov = this.props.provider
        if(!graph) {
            console.log("no graph yet")
        } else {
            c.beginPath()
            for(let t=0; t<Math.PI*2; t+=0.2) {
                const v = prov.computePropertyValueAtT(graph.id,'value',t)
                c.lineTo(t*(100/(Math.PI*2)),v*50+50)
            }
            c.strokeStyle = 'black'
            c.stroke()
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
            this.props.provider.deleteConnection(ch.id,key)
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
                console.log('same node, just delete it')
                return;
            }
            if(!e.target.hasAttribute("data-propname")) {
                // console.log("not a valid target. abort!")
                return
            }
            const toDir = e.target.getAttribute("data-direction")
            const toKey = e.target.getAttribute('data-propname')
            const toId   = e.target.getAttribute('data-nodeid')
            if(toDir === dir) {
                // console.log("can't join same directions",toDir,dir)
                return
            }
            this.props.provider.addConnection(ch.id,key,toId,toKey)
        }
        window.addEventListener('mousemove',l1)
        window.addEventListener('mouseup',l2)
    }

    clickCircle = (e, ch, key, dir) =>{
        const prov = this.props.provider
        if(prov.isConnected(ch.id,key)) prov.deleteConnection(ch.id,key)
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
        return <g>{scene.children.map((ch,i)=>{
            const temp = this.props.provider.getTemplate(ch)
            const ins = Object.keys(temp.inputs).map((key,i)=>{
                let clss = "handle"
                if(this.props.provider.isConnected(ch.id,key)) {
                    clss += " connected"
                }
                return <g key={key} transform={`translate(0,${i*25})`}>
                    <circle className={clss}
                            cx="0" cy="-5" r="5"
                            onMouseDown={(e)=>this.pressCircle(e,ch,key,"input")}
                            onClick={(e)=>this.clickCircle(e,ch,key,"input")}
                            data-propname={key}
                            data-nodeid={ch.id}
                            data-direction="input"
                    />
                    <text x={10} y={0} textAnchor="start">{key}</text>
                </g>
            })
            const outs = Object.keys(temp.outputs).map((key,i)=>{
                let clss = "handle"
                if(this.props.provider.isConnected(ch.id,key)) {
                    clss += " connected"
                }
                return <g key={key} transform={`translate(0,${i*25})`}>
                    <circle className={clss}
                            cx="0" cy="-5" r="5"
                            data-propname={key}
                            data-nodeid={ch.id}
                            data-direction="output"
                            onClick={(e)=>this.clickCircle(e,ch,key,"output")}
                            onMouseDown={(e)=>this.pressCircle(e,ch,key,"output")}
                    />
                    <text x={-10} y={0} textAnchor="end">{key}</text>
                </g>
            })
            const w = 170
            const r = 10
            let clss = ""
            if(ch === SelectionManager.getSelection()) clss += " selected"
            return <g key={i} transform={`translate(${ch.x},${ch.y})`} className={clss}>
                <rect className="bg" x={0} y={0} width={w} height={100} rx={r} ry={r}
                      onMouseDown={(e)=>this.startMovingBG(e,ch)}/>
                <rect className="header-bg" x={0} y={0} width={w} height={20}/>
                <text className="header" x={5} y={15} content="foo">{temp.title}</text>
                <g transform="translate(10,40)">{ins}</g>
                <g transform={`translate(${w-10},${40})`}>{outs}</g>
                <rect className="selection" x={0} y={0} width={w} height={100} rx={r} ry={r}/>
            </g>
        })}</g>
    }
    renderConnections(scene) {
        if(!scene.connections) return
        const conns = scene.connections.map((conn,i) => {
            const from = this.props.provider.findNodeById(conn.from)
            const to = this.props.provider.findNodeById(conn.to)
            if(!from) return ""
            if(!to) return ""
            const w = 170
            const path = `M ${from.x+w-10} ${from.y+40-5} ${to.x+10} ${to.y+40-5}`
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