import React, {Component} from "react";
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import {TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import {createGraphObjectFromObject, fetchGraphObject, propToArray} from "../syncgraph/utils";
import RectDef from "./RectDef";

export class MetadocCanvas extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed: false,
            selection: null
        }
        props.prov.onRawChange(e => {
            if (this.props.list === -1) return
            this.redraw()
        })
    }

    componentDidMount() {
        this.sel_listener = SelectionManager.on(SELECTION_MANAGER.CHANGED, (sel) => {
            this.setState({selection: sel})
        })
        this.props.prov.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, () => {
            this.redraw()
        })
    }

    toCanvas(e) {
        const rect = e.target.getBoundingClientRect()
        // console.log("clicked at",e.clientX,rect)
        return {
            x: Math.floor((e.clientX - rect.left) / this.props.scale),
            y: Math.floor((e.clientY - rect.top) / this.props.scale),
        }
    }


    componentDidUpdate(prevProps) {
        this.redraw()
    }

    redraw() {
        // console.log("===== redrawing canvas with scale",this.props.scale)
        const c = this.canvas.getContext('2d')
        c.fillStyle = 'white'
        c.fillRect(0, 0, this.canvas.width, this.canvas.height)
        c.save()
        c.scale(this.props.scale, this.props.scale)
        const list = this.props.prov.getRootList()
        if (!list) return
        const graph = this.props.prov.getRawGraph()
        const page = this.props.prov.getSelectedPage()
        if(page) this.drawPage(c,graph,page)
        c.restore()
    }

    drawPage(c,g,page) {
        propToArray(g,page.children).forEach(id => this.drawLayer(c,g,fetchGraphObject(g,id)))
    }

    drawLayer(c,g,layer) {
        propToArray(g,layer.children).forEach(id => this.drawShape(c,g,fetchGraphObject(g,id)))
    }

    drawShape(c,g,shape) {
        if(shape.type === 'rect') {
            new RectDef().draw(c,g,shape,SelectionManager.getSelection() === shape.id)
        }
        if(shape.type === 'circle') {
            c.fillStyle = 'gray'
            if (SelectionManager.getSelection() === shape.id) c.fillStyle = 'red'
            c.beginPath()
            c.arc(shape.x, shape.y, shape.radius, 0, Math.PI*2)
            c.fill()
        }
        if(shape.type === 'text') {
            c.fillStyle = 'black'
            c.font = 'normal 30px sans-serif'
            c.fillText(shape.text,shape.x,shape.y)
            if (SelectionManager.getSelection() === shape.id) {
                c.strokeStyle = 'red'
                const metrics = c.measureText(shape.text)
                c.strokeRect(shape.x,shape.y-30,metrics.width,30)
            }
        }
    }

    isInside(pt, objid) {
        const graph = this.props.prov.getRawGraph()
        const shape = fetchGraphObject(graph,objid)
        if(shape.type === 'rect') return new RectDef().isInside(pt,shape)
        if(shape.type === 'circle') {
            if(Math.pow(shape.x-pt.x,2) + Math.pow(shape.y - pt.y,2) < Math.pow(shape.radius,2)) return true
            return false
        }
        if(shape.type === 'text') {
            const c = this.canvas.getContext('2d')
            c.font = 'normal 30px sans-serif'
            const metrics = c.measureText(shape.text)
            const w = metrics.width
            const h = 30
            if (pt.x < shape.x) return false
            if (pt.x > shape.x + w) return false
            if (pt.y < shape.y - h) return false
            if (pt.y > shape.y) return false
            return true
        }
        return false
    }

    onClick = (e) => {
        const pt = this.toCanvas(e)
        const shape = this.findShape(pt)
        if (shape) this.props.onSelect(shape)
    }

    findShape(pt) {
        const prov = this.props.prov
        const layer = prov.getSelectedLayer()
        if (!layer) return null
        const graph = prov.getRawGraph()
        return propToArray(graph,layer.children).find((ch)=> this.isInside(pt,ch))
    }

    mouseDown = (e) => {
        this.props.prov.pauseQueue()
        const pt = this.toCanvas(e)
        const rect = this.findShape(pt)
        if (rect) {
            this.setState({
                pressed: true,
                start: pt,
                rect: rect,
            })
        }
    }
    mouseMove = (e) => {
        if (!this.state.pressed) return
        const pt = this.toCanvas(e)
        const graph = this.props.prov.getRawGraph()
        graph.process(this.props.prov.cmd.setProperty(this.state.rect, 'x', pt.x))
        graph.process(this.props.prov.cmd.setProperty(this.state.rect, 'y', pt.y))
    }
    mouseUp = (e) => {
        this.setState({pressed: false})
        this.props.prov.unpauseQueue()
    }

    render() {
        return <div className="panel">
            <canvas style={{border: '1px solid red'}}
                    width={500} height={300} ref={(e) => this.canvas = e}
                    onClick={this.onClick}
                    onMouseDown={this.mouseDown}
                    onMouseUp={this.mouseUp}
                    onMouseMove={this.mouseMove}
            ></canvas>
        </div>
    }
}