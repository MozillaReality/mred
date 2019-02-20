import React, {Component} from 'react'
import {DEFAULT_DPI, UNITS} from './Dimension'
import {fetchGraphObject, propToArray} from '../syncgraph/utils'
import SelectionManager from '../SelectionManager'

export class PageCanvasView extends Component {
    constructor(props) {
        super(props)
        this.state = {
            scale: 1.0,
        }
    }

    componentDidMount() {
        this.canvas.focus()
        this.redraw()
    }

    componentDidUpdate(prevProps) {
        this.redraw()
    }

    redraw = () => {
        if (!this.canvas) return
        const c = this.canvas.getContext('2d')
        const size = this.props.provider.getPageSize(this.props.page).as(UNITS.PIXEL, 1, DEFAULT_DPI)
        this.canvas.width = size.width
        this.canvas.height = size.height
        c.fillStyle = 'white'
        c.fillRect(0, 0, this.canvas.width, this.canvas.height)
        c.save()
        c.scale(this.state.scale, this.state.scale)
        const graph = this.props.provider.getRawGraph()
        const page = this.props.page
        if (page) this.drawPage(c, graph, page)
        c.restore()
    }

    drawPage(c, g, page) {
        propToArray(g, page.children).forEach(id => this.drawLayer(c, g, fetchGraphObject(g, id)))
    }

    drawLayer(c, g, layer) {
        propToArray(g, layer.children).forEach(id => this.drawShape(c, g, fetchGraphObject(g, id)))
    }

    drawShape(c, g, shape) {
        const def = this.props.provider.getShapeDef(shape.type)
        if (def) def.draw(c, g, shape, SelectionManager.getSelection() === shape.id, this.props.provider)
    }

    render() {
        return <canvas
            tabIndex={-1}
            width={100} height={100} ref={(e) => this.canvas = e}
            style={{
                width: '100vw',
            }}
            onClick={this.props.onNext}
            onKeyDown={this.handleKeypress}
        ></canvas>
    }

    handleKeypress = (e) => {
        if (e.key === 'ArrowRight') this.props.onNext()
        if (e.key === 'ArrowLeft') this.props.onPrev()
    }
}