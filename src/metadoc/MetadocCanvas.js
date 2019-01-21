import React, {Component} from "react";
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import {TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import {createGraphObjectFromObject, fetchGraphObject, propToArray} from "../syncgraph/utils";

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
        console.log("===== redrawing canvas with scale",this.props.scale)
        const c = this.canvas.getContext('2d')
        c.fillStyle = 'blue'
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
            c.fillStyle = 'gray'
            if (SelectionManager.getSelection() === shape.id) c.fillStyle = 'red'
            c.fillRect(shape.x, shape.y, shape.width, shape.height)
        }
        if(shape.type === 'circle') {
            c.fillStyle = 'gray'
            if (SelectionManager.getSelection() === shape.id) c.fillStyle = 'red'
            c.beginPath()
            c.arc(shape.x, shape.y, shape.radius, 0, Math.PI*2)
            c.fill()
        }
    }

    isInside(pt, objid) {
        const graph = this.props.prov.getRawGraph()
        const shape = fetchGraphObject(graph,objid)
        if(shape.type === 'rect') {
            if (pt.x < shape.x) return false
            if (pt.x > shape.x + shape.w) return false
            if (pt.y < shape.y) return false
            if (pt.y > shape.y + shape.h) return false
            return true
        }
        if(shape.type === 'circle') {
            if(Math.pow(shape.x-pt.x,2) + Math.pow(shape.y - pt.y,2) < Math.pow(shape.radius,2)) return true
            return false
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