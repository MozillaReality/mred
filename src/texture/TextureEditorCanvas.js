import React, {Component} from 'react'
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import {makePoint} from '../utils'

export default class TextureEditorCanvas extends Component {
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