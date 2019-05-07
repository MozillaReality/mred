import React, {Component} from 'react'
import QRCode from 'qrcode'

export default class QRCanvas extends Component {
    componentDidMount() {
        if (this.canvas) this.redraw()
    }

    componentWillReceiveProps(newProps) {
        if (this.canvas) this.redraw()
    }

    redraw() {
        QRCode.toCanvas(this.canvas, this.props.url, {width: this.props.width, height: this.props.height})
    }

    render() {
        let style = {}
        if (this.props.style) Object.assign(style, this.props.style)
        return <canvas width={this.props.width} height={this.props.height} ref={(canvas) => this.canvas = canvas} style={style}/>
    }
}