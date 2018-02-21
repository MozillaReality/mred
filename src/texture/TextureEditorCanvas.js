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
        }
    }
    componentDidMount() {
        this.sel_listener = SelectionManager.on(SELECTION_MANAGER.CHANGED, (sel)=> this.setState({selection:sel}))
    }

    render() {
        const scene = this.props.provider.getSceneRoot()
        if(!scene) return <div>empty</div>
        const size = 700;
        const scale = this.calcScale()
        const style = {
            width:`${size}px`,
            height:`${size}px`,
            position:'absolute',
            top:0,
            left:0,
            border:'1px solid black',
            pointerEvents:'none'
        }
        return <div className="node-canvas">
            <svg style={style} ref={(svg)=>this.svg = svg} viewBox={`0 0 ${size*scale} ${size*scale}`}>
                {this.renderConnections(scene)}
            </svg>

            <div style={{border:"1px solid red"}}>
            {this.renderChildren(scene)}
            </div>

            <svg style={style} viewBox={`0 0 ${size*scale} ${size*scale}`}>
                {this.renderOverlay()}
            </svg>

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


    domInputToContainer(e) {
        const rect = this.container.getBoundingClientRect()
        return makePoint(e.clientX-rect.x,e.clientY-rect.y).multiply(1/this.calcScale())
    }

    containerToSVGContainer(pt) {
        const rect = this.container.getBoundingClientRect()
        const screenPt = makePoint(pt.x+rect.x,pt.y+rect.y)
        const svgpoint = this.svg.createSVGPoint()
        svgpoint.x = screenPt.x
        svgpoint.y = screenPt.y
        const pt2 = svgpoint.matrixTransform(this.svg.getScreenCTM().inverse())
        return makePoint(pt2.x,pt2.y)
    }

    pressInputCircle = (e, ch, key)=>{
        e.stopPropagation()
        e.preventDefault()
        const pt = this.domInputToContainer(e)
        const prov = this.props.provider;

        // const pt = this.getPoint(e)
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

    calcScale() {
        return Math.pow(2,this.props.scale/2)
    }
    renderChildren(scene) {
        const scale = this.calcScale()
        return <div ref={(c)=>this.container = c}>{scene.nodes.map((node,i)=> <GenericNode key={i} provider={this.props.provider} node={node} owner={this} scale={scale}/>)}</div>
    }
    renderConnections(scene) {
        const conns = this.props.provider.getConnections().map((conn,i) => {
            const output = this.props.provider.findNodeById(conn.output.node)
            const input = this.props.provider.findNodeById(conn.input.node)
            if(!output) return ""
            if(!input) return ""
            const iy = this.props.provider.getInputPropertyPosition(input,conn.input.prop);
            const oy = this.props.provider.getOutputPropertyPosition(output,conn.output.prop);
            const ioff = makePoint(12, iy*25+50).multiply(this.calcScale())
            const ooff = makePoint(231,oy*25+50).multiply(this.calcScale())
            const svgInput = this.containerToSVGContainer(input).add(ioff).multiply(this.calcScale())
            const svgOutput = this.containerToSVGContainer(output).add(ooff).multiply(this.calcScale())
            const path = `M ${svgInput.x} ${svgInput.y} L ${svgOutput.x} ${svgOutput.y}`
            return <path key={i} d={path} className="connection-line" strokeWidth={5*this.calcScale()}/>
        })
        return <g>{conns}</g>
    }
    renderOverlay() {
        if(!this.state.connecting) return ""
        const spt = this.containerToSVGContainer(this.state.start)
        const ept = this.containerToSVGContainer(this.state.end)
        const path = `M ${spt.x} ${spt.y} L ${ept.x} ${ept.y}`;
        return <path d={path} className="connection-line" strokeWidth={5*this.calcScale()}/>
    }

}


class GenericNode extends Component {
    componentDidMount() {
        // this.redraw()
    }

    redraw = () => {
        clearTimeout(this.tid)
        if(!this.canvas) return
        const c = this.canvas.getContext('2d')
        c.fillStyle = "white"
        c.fillRect(0,0,this.canvas.width, this.canvas.height)
        const node = this.props.node
        const prov = this.props.provider
        const templ = prov.getTemplateByName(this.props.node.template)
        const output = templ.outputs[Object.keys(templ.outputs)[0]]
        if(!output) return;
        if(output.type === 'number') {
            c.beginPath()
            c.moveTo(0, 50)
            for (let x = 0; x <= 100; x++) {
                let v = templ.generateValue(prov, node, (x / 100) * Math.PI * 2)
                c.lineTo(x, v * 10 + 50)
            }
            c.strokeStyle = 'black'
            c.stroke()
        }
        if(output.type === 'xyfill') {
            const w = 100
            const h = 100
            const cdata = c.getImageData(0,0,w,h)
            const rect = {
                x:0,
                y:0,
                w:w,
                h:h
            }
            for(let x = 0; x<w; x++) {
                for(let y=0; y<h; y++) {
                    rect.x = x/w
                    rect.y = y/h
                    const v = templ.generateValue(prov, node, rect)
                    const i = (y*w+x)*4
                    const v255 = Math.floor(v*255)
                    cdata.data[i+0] = v255
                    cdata.data[i+1] = v255
                    cdata.data[i+2] = v255
                    cdata.data[i+3] = 255
                }
            }
            c.putImageData(cdata,0,0)
        }
    }

    render() {
        // if(this.tid) clearTimeout(this.tid)
        // this.tid = setTimeout(this.redraw,500)
        const prov = this.props.provider
        const node = this.props.node
        const ins = Object.keys(node.inputs).map((prop,i)=>{
            let clss = "handle"
            if(prov.isInputConnected(node.id,prop)) clss += " connected"
            return <li key={prop}>
                <i className={"fa fa-circle-o "+clss}
                   onMouseDown={(e)=>this.props.owner.pressInputCircle(e,node,prop,"input")}
                   data-propname={prop}
                   data-nodeid={node.id}
                   data-direction="input"
                />
                <b>{prop}</b>
            </li>
        })
        const outs = Object.keys(node.outputs).map((prop,i)=>{
            let clss = "handle"
            if(this.props.provider.isOutputConnected(node.id,prop)) clss += " connected"
            return <li key={prop}>
                <b x={-10} y={0} textAnchor="end">{prop}</b>
                <i className={clss+" fa fa-circle-o"}
                        data-propname={prop}
                        data-nodeid={node.id}
                        data-direction="output"
                        onMouseDown={(e)=>this.props.owner.pressOutputCircle(e,node,prop,"output")}
                />
            </li>
        })
        const selected = (SelectionManager.getSelection()===node)
        const template = prov.getTemplate(node)

        return <div style={{
            position:'absolute',
            left:node.x*this.props.scale,
            top:node.y*this.props.scale,
            borderColor: selected?'red':'green',
            fontSize:(12*this.props.scale)+'pt'
        }}
                    onMouseDown={(e)=>this.startMovingBG(e,node)}
                    className="node-box"
        >
            <h3>{template.title}</h3>
            <ul className="ins">{ins}</ul>
            <ul className="outs">{outs}</ul>
            <canvas width="100" height="100" id="canvas" ref={(c)=>this.canvas=c}/>
        </div>
    }

    startMovingBG = (e,node) => {
        const container = this.props.owner.container
        new DragHandler(e, {
            target: node,
            provider: this.props.provider,
            toLocal: (pt) => {
                const bds = container.getBoundingClientRect()
                return pt.minus(makePoint(bds.x,bds.y)).multiply(1/this.props.scale)
            },
            xpropname: 'x',
            ypropname: 'y'
        })
    }

}