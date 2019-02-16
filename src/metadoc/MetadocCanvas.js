import React, {Component} from "react";
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";
import {TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import {fetchGraphObject, propToArray} from "../syncgraph/utils";
import {makePoint} from '../utils'
import {UNITS, DEFAULT_DPI} from "./Dimension"


export class MetadocCanvas extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed: false,
            selection: null,
            shape:null,
            hsnap:null,
            vsnap:null,
        }
        props.prov.onRawChange(e => {
            if (this.props.list === -1) return
            this.redraw()
        })
    }

    selectionChanged = (sel) => this.setState({selection: sel})
    componentDidMount() {
        SelectionManager.on(SELECTION_MANAGER.CHANGED, this.selectionChanged)
        this.props.prov.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.redraw)
    }
    componentWillUnmount() {
        SelectionManager.off(SELECTION_MANAGER.CHANGED, this.selectionChanged)
        this.props.prov.off(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.redraw)
    }

    toCanvas(e) {
        const rect = e.target.getBoundingClientRect()
        return makePoint(
            Math.floor((e.clientX - rect.left) / this.props.scale),
            Math.floor((e.clientY - rect.top) / this.props.scale))
    }


    componentDidUpdate(prevProps) {
        this.redraw()
    }

    redraw = () => {
        if(!this.canvas) return
        const c = this.canvas.getContext('2d')
        const size = this.props.prov.getPageSize(this.props.prov.getSelectedPage()).as(UNITS.PIXEL,this.props.scale,DEFAULT_DPI)
        this.canvas.width = size.width
        this.canvas.height = size.height
        c.fillStyle = 'white'
        c.fillRect(0, 0, this.canvas.width, this.canvas.height)
        c.save()
        c.scale(this.props.scale, this.props.scale)
        const graph = this.props.prov.getRawGraph()
        const page = this.props.prov.getSelectedPage()
        if(page) this.drawPage(c,graph,page)
        c.fillStyle = "rgba(0,255,255,0.5)"
        if(this.state.hsnap) c.fillRect(this.state.hsnap.value - 1,0,2,this.canvas.height)
        if(this.state.vsnap) c.fillRect(0, this.state.vsnap.value - 1,this.canvas.width,2)
        c.restore()
    }

    drawPage(c,g,page) {
        propToArray(g,page.children).forEach(id => this.drawLayer(c,g,fetchGraphObject(g,id)))
    }

    drawLayer(c,g,layer) {
        propToArray(g,layer.children).forEach(id => this.drawShape(c,g,fetchGraphObject(g,id)))
    }

    drawShape(c,g,shape) {
        const def = this.props.prov.getShapeDef(shape.type)
        if(def) def.draw(c,g,shape,SelectionManager.getSelection() === shape.id,this.props.prov)
    }

    isInside(pt, objid) {
        const graph = this.props.prov.getRawGraph()
        const shape = fetchGraphObject(graph,objid)
        const def = this.props.prov.getShapeDef(shape.type)
        if(def) return def.isInside(pt,shape,this.canvas)
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
        const arr = propToArray(graph,layer.children)
        arr.reverse()
        return arr.find((ch)=> this.isInside(pt,ch))
    }

    mouseDown = (e) => {
        this.props.prov.pauseQueue()
        const pt = this.toCanvas(e)
        const shapeid = this.findShape(pt)
        if (shapeid) {
            const shapeobj = fetchGraphObject(this.props.prov.getRawGraph(),shapeid)
            this.setState({
                pressed: true,
                initial: makePoint(shapeobj.x,shapeobj.y).minus(pt),
                start: pt,
                shape: shapeid,
            })
        } else {
            const layer = this.props.prov.getSelectedLayer()
            if(layer) SelectionManager.setSelection(layer.id)
        }
    }
    mouseMove = (e) => {
        if (!this.state.pressed) return
        let pt = this.toCanvas(e).add(this.state.initial)
        pt = this.snap(pt)
        const graph = this.props.prov.getRawGraph()
        graph.process(this.props.prov.cmd.setProperty(this.state.shape, 'x', pt.x))
        graph.process(this.props.prov.cmd.setProperty(this.state.shape, 'y', pt.y))
    }
    mouseUp = (e) => {
        this.setState({pressed: false, hsnap:null, vsnap:null})
        this.props.prov.unpauseQueue()
    }

    render() {
        return <div className="panel">
            <canvas style={{border: '0px solid red'}}
                    width={100} height={100} ref={(e) => this.canvas = e}
                    onClick={this.onClick}
                    onMouseDown={this.mouseDown}
                    onMouseUp={this.mouseUp}
                    onMouseMove={this.mouseMove}
            ></canvas>
        </div>
    }

    snap(pt) {
        const EDGES = {
            LEFT:'LEFT',
            RIGHT:'RIGHT',
            CENTER:'CENTER',
            TOP:'TOP',
            MIDDLE:'MIDDLE',
            BOTTOM:'BOTTOM',
            NONE:'NONE',
        }

        const snaps = [
            {value:0,type:EDGES.LEFT},
            {value:320,type:EDGES.CENTER},
            {value:640,type:EDGES.RIGHT},
            {value:0, type:EDGES.TOP},
            {value:240, type:EDGES.MIDDLE},
            {value:480, type:EDGES.BOTTOM},
        ]
        const SNAP_THRESHOLD = 20
        function isNearH(pt,snap) {
            if(snap.type === EDGES.LEFT && Math.abs(pt.x-snap.value) < SNAP_THRESHOLD) return EDGES.LEFT
            if(snap.type === EDGES.CENTER && Math.abs(pt.x + pt.width/2 - snap.value) < SNAP_THRESHOLD) return EDGES.CENTER
            if(snap.type === EDGES.RIGHT && Math.abs(pt.x + pt.width - snap.value) < SNAP_THRESHOLD) return EDGES.RIGHT
            return EDGES.NONE
        }
        function isNearV(pt,snap) {
            if(snap.type === EDGES.TOP && Math.abs(pt.y-snap.value) < SNAP_THRESHOLD) return EDGES.TOP
            if(snap.type === EDGES.MIDDLE && Math.abs(pt.y + pt.height/2 -snap.value) < SNAP_THRESHOLD) return EDGES.MIDDLE
            if(snap.type === EDGES.BOTTOM && Math.abs(pt.y + pt.height -snap.value) < SNAP_THRESHOLD) return EDGES.BOTTOM
            return EDGES.NONE
        }

        const graph = this.props.prov.getRawGraph()
        const shape = fetchGraphObject(graph,this.state.shape)
        const def = this.props.prov.getShapeDef(shape.type)
        let hsnap = null
        let vsnap = null
        if(def) {
            const bounds = def.getBounds(pt,shape,this.canvas)
            for(let i=0; i<snaps.length; i++)  {
                const snap = snaps[i]
                const nearH = isNearH(bounds,snap)
                if(nearH === EDGES.LEFT)   pt.x = snap.value
                if(nearH === EDGES.CENTER) pt.x = snap.value-bounds.width/2
                if(nearH === EDGES.RIGHT)  pt.x = snap.value-bounds.width

                const nearV = isNearV(bounds,snap)
                if(nearV === EDGES.TOP)    pt.y = snap.value
                if(nearV === EDGES.MIDDLE) pt.y = snap.value-bounds.height/2
                if(nearV === EDGES.BOTTOM) pt.y = snap.value-bounds.height

                if(nearH !== EDGES.NONE) hsnap = snap
                if(nearV !== EDGES.NONE) vsnap = snap
            }
        }
        this.setState({hsnap:hsnap, vsnap:vsnap})

        return pt
    }
}
