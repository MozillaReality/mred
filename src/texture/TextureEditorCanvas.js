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
                const v = prov.computeInputPropertyValueAt(graph.id,'value',t)
                c.lineTo(t*(100/(Math.PI*2)),v*50+50)
            }
            c.strokeStyle = 'black'
            c.stroke()
        }
        const fillout = prov.findNodeByTemplate('fillout')
        if(fillout) {
            // const pt = makePoint(0,0)
            // const v = prov.computeInputPropertyValueAt(fillout.id,'a',pt)
        }
    }

    clickedCanvas = () => {
        if(!this.canvas) return
        const c = this.canvas.getContext('2d')
        c.fillStyle = 'red'
        c.fillRect(0,0,100,100)
        const prov = this.props.provider
        const fillout = prov.findNodeByTemplate('fillout')
        if(fillout) {
            for(let x = 0; x<5; x++) {
                for(let y=0; y<5; y++) {
                    const v = prov.computeInputPropertyValueAt(fillout.id,'a',makePoint(x,y))
                    c.fillStyle = v
                    c.fillRect(x*10,y*10,10,10)
                }
            }
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
            <canvas width="100" height="100" ref={(can)=>this.canvas = can} className="graph-output-canvas" onClick={this.clickedCanvas}/>
        </div>
    }

    getPoint(e) {
        const rect2 = this.svg.getBoundingClientRect()
        return makePoint(e.clientX - rect2.x, e.clientY - rect2.y);
    }
    makePossibleInputConnection(e, outId, outProp) {
        return {
            output: {
                node:outId,
                prop:outProp
            },
            input: {
                prop:e.target.getAttribute('data-propname'),
                node:e.target.getAttribute('data-nodeid'),
            }
        }
    }
    makePossibleOutputConnection(e, inId, inProp) {
        return {
            output: {
                prop:e.target.getAttribute('data-propname'),
                node:e.target.getAttribute('data-nodeid'),
            },
            input: {
                node:inId,
                prop:inProp
            },
        }
    }

    pressInputCircle = (e, ch, key)=>{
        e.stopPropagation()
        e.preventDefault()
        const prov = this.props.provider;

        const pt = this.getPoint(e)
        this.setState({connecting:true,start:pt,end:pt})
        const l1 = (e) => {
            this.setState({end: this.getPoint(e)})
            const inputDir   = e.target.getAttribute('data-direction')
            const conn = this.makePossibleOutputConnection(e,ch.id,key);
            if(prov.isValidOutputConnection(conn,inputDir)) {
                // console.log("can make the connection")
            }
        }
        const l2 = (e) => {
            window.removeEventListener('mousemove',l1)
            window.removeEventListener('mouseup',l2)
            this.setState({connecting:false})
            if(this.getPoint(e).distance(this.state.start) < 10) {
                const conn = this.props.provider.findInputConnectionById(ch.id, key)
                this.props.provider.deleteConnection(conn)
                return;
            }
            const conn = this.makePossibleOutputConnection(e,ch.id,key);
            const outputDir   = e.target.getAttribute('data-direction')
            if(prov.isValidOutputConnection(conn,outputDir)) {
                this.props.provider.addConnection(conn.output.node, conn.output.prop, ch.id, key)
            }
        }
        window.addEventListener('mousemove',l1)
        window.addEventListener('mouseup',l2)
    }
    pressOutputCircle = (e, ch, key)=>{
        e.stopPropagation()
        e.preventDefault()

        const pt = this.getPoint(e)
        this.setState({connecting:true,start:pt,end:pt})
        const prov = this.props.provider;
        const l1 = (e) => {
            this.setState({end: this.getPoint(e)})
            const conn = this.makePossibleInputConnection(e,ch.id,key);
            const inputDir   = e.target.getAttribute('data-direction')
            if(prov.isValidInputConnection(conn,inputDir)) {
                // console.log("can make the connection")
            }
        }
        const l2 = (e) => {
            window.removeEventListener('mousemove',l1)
            window.removeEventListener('mouseup',l2)

            this.setState({connecting:false})
            if(this.getPoint(e).distance(this.state.start) < 10) {
                const conn = this.props.provider.findOutputConnectionById(ch.id, key)
                this.props.provider.deleteConnection(conn)
                return;
            }

            const conn = this.makePossibleInputConnection(e,ch.id,key);
            const inputDir   = e.target.getAttribute('data-direction')
            if(prov.isValidInputConnection(conn,inputDir)) {
                this.props.provider.addConnection(ch.id,key,conn.input.node, conn.input.prop)
            }
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
                            onMouseDown={(e)=>this.pressInputCircle(e,node,prop,"input")}
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
                            onMouseDown={(e)=>this.pressOutputCircle(e,node,prop,"output")}
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

}