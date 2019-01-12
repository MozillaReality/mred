import React, {Component} from "react";
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import {TREE_ITEM_PROVIDER} from "../TreeItemProvider";

export class MetadocCanvas extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed: false,
            scale: 1,
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
            x: Math.floor((e.clientX - rect.left) / this.state.scale),
            y: Math.floor((e.clientY - rect.top) / this.state.scale),
        }
    }


    componentDidUpdate(prevProps) {
        this.redraw()
    }

    redraw() {
        let sel = -1
        if (this.state.selection) {
            sel = this.state.selection.getSelection()
        }
        const c = this.canvas.getContext('2d')
        c.fillStyle = 'blue'
        c.fillRect(0, 0, this.canvas.width, this.canvas.height)
        c.save()
        c.scale(this.state.scale, this.state.scale)
        const list = this.props.prov.getRootList()
        if (!list) return
        const graph = this.props.prov.getRawGraph()
        const len = graph.getArrayLength(list)
        for (let i = 0; i < len; i++) {
            const objid = graph.getElementAt(list, i)
            const x = graph.getPropertyValue(objid, 'x')
            const y = graph.getPropertyValue(objid, 'y')
            const w = graph.getPropertyValue(objid, 'width')
            const h = graph.getPropertyValue(objid, 'height')
            // console.log(objid,x,y,w,h)
            c.fillStyle = 'gray'
            if (sel === objid) {
                c.fillStyle = 'red'
            }
            c.fillRect(x, y, w, h)
        }
        c.restore()
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
        const graph = this.props.prov.getRawGraph()
        const list = this.props.prov.getRootList()
        if (!list) return null
        const len = graph.getArrayLength(list)
        for (let i = 0; i < len; i++) {
            const objid = graph.getElementAt(list, i)
            if (this.isInside(pt, objid)) return objid
        }
        return null
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
            <h3>Canvas</h3>
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