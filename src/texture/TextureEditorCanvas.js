import React, {Component} from 'react'
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import {makePoint} from '../utils'
import DragHandler from './DragHandler'

export default class TextureEditorCanvas extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selection:null,
            connecting:false,
            scale:1
        }
    }
    componentDidMount() {
        this.sel_listener = SelectionManager.on(SELECTION_MANAGER.CHANGED, (sel)=> {
            console.log("new selection is", SelectionManager.getSelection())
            this.setState({selection:sel})
        })
    }

    clickedCanvas = () => {
        if(!this.canvas) return
        const c = this.canvas.getContext('2d')
        c.fillStyle = 'red'
        c.fillRect(0,0,100,100)
        const prov = this.props.provider
        const fillout = prov.findNodeByTemplate('fillout')
        const s = 2
        if(fillout) {
            for(let x = 0; x<40; x++) {
                for(let y=0; y<40; y++) {
                    const rect = {
                        x:x,
                        y:y,
                        w:40,
                        h:40
                    }
                    const v = prov.computeInputPropertyValueAt(fillout.id,'a',rect)
                    c.fillStyle = v
                    c.fillRect(x*s,y*s,s,s)
                }
            }
        }
    }

    zoomIn = () => this.setState({scale:this.state.scale-1})
    zoomOut = () => this.setState({scale:this.state.scale+1})
    render() {
        const scene = this.props.provider.getSceneRoot()
        if(!scene) return <div>empty</div>
        const size = 600;
        const scale = Math.pow(2,this.state.scale/2)
        const style = {
            width:`${size}px`,
            height:`${size}px`,
            position:'absolute',
            top:'2em',
            left:100,
            border:'1px solid black'
        }
        return <div className="node-canvas">
            <div style={{
                position:'absolute',
                left:100,
                top:'0em'
            }}
                 className="toolbar"
            >
                <button className="fa fa-plus-circle" onClick={this.zoomIn}/>
                <button className="fa fa-minus-circle" onClick={this.zoomOut}/>
            </div>
            <svg style={style} ref={(svg)=>this.svg = svg}
            viewBox={`0 0 ${size*scale} ${size*scale}`}>
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
        new DragHandler(e, {
            target: node,
            provider: this.props.provider,
            toLocal: (pt) => {
                const svgppoint = this.svg.createSVGPoint()
                svgppoint.x = pt.x
                svgppoint.y = pt.y
                const cursor = svgppoint.matrixTransform(this.svg.getScreenCTM().inverse())
                return makePoint(cursor.x,cursor.y)
            },
            xpropname: 'x',
            ypropname: 'y'
        })
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