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
    }

    isInside(pt, objid) {
        const graph = this.props.prov.getRawGraph()
        const x = graph.getPropertyValue(objid, 'x')
        const y = graph.getPropertyValue(objid, 'y')
        const w = graph.getPropertyValue(objid, 'width')
        const h = graph.getPropertyValue(objid, 'height')
        if (pt.x < x) return false
        if (pt.x > x + w) return false
        if (pt.y < y) return false
        if (pt.y > y + h) return false
        return true
    }

    onClick = (e) => {
        const pt = this.toCanvas(e)
        const rect = this.findRect(pt)
        if (rect) this.props.onSelect(rect)
    }

    findRect(pt) {
        const prov = this.props.prov
        const layer = prov.getSelectedLayer()
        if (!layer) return null
        const graph = prov.getRawGraph()
        return propToArray(graph,layer.children).find((ch)=> this.isInside(pt,ch))
    }

    mouseDown = (e) => {
        this.props.prov.pauseQueue()
        const pt = this.toCanvas(e)
        const rect = this.findRect(pt)
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