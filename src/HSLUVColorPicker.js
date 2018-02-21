import React, { Component } from 'react'
import {makePoint} from "./utils"
import hsluv from 'hsluv'
import {PopupManager} from "appy-comps"

export default class HSLUVColorPicker extends Component {
    constructor(props) {
        super(props)
        this.state = {
            hue:180,
            lightness:0,
            value:0,
        }
    }
    componentDidMount() {
        this.redraw();
    }
    canvasToPoint(e) {
        const canvasBounds = this.canvas.getBoundingClientRect()
        const pt = makePoint(e.clientX, e.clientY).minus(makePoint(canvasBounds.x,canvasBounds.y))
        const g = 10
        const h = this.canvas.height - g;
        const w = this.canvas.width;
        const f = makePoint(pt.x/w*100, pt.y/h*100)
        return f;
    }
    mousePress = (e) => {
        const pt = this.canvasToPoint(e)
        this.setState({lightness:pt.x, value:pt.y})
        this.redraw()
        this.pressed = true;
    }
    mouseMove = (e) => {
        if(!this.pressed) return
        const pt = this.canvasToPoint(e)
        this.setState({lightness:pt.x, value:pt.y})
        this.redraw()
    }
    mouseUp = (e) => {
        this.pressed = false
    }
    redraw = () => {
        this.drawPicker()
        this.drawSlider()
        this.drawIndicator()
    }
    drawPicker() {
        const canvas = this.canvas
        if(!canvas) return
        const c = this.canvas.getContext('2d')
        let w = this.canvas.width;
        const g = 10
        let h = this.canvas.height;
        for(let x=0; x<w; x+=g) {
            for(let y=0; y<=h; y+=g) {
                const pt = makePoint(x/w*100, y/h*100)
                let color = hsluv.hsluvToHex([Math.floor(this.state.hue),Math.floor(pt.x),Math.floor(pt.y)])
                if(color.length > 7) color = '#000000'
                c.fillStyle = color
                c.fillRect(x,y,g,g)
            }
        }
        c.strokeStyle = 'black'
        const cp = this.livalToCanvas(this.state.lightness,this.state.value)
        c.strokeRect(Math.floor(cp.x/g)*g, Math.floor(cp.y/g)*g,g,g)
    }

    livalToCanvas = (l,v) => {
        return makePoint(l/100*this.canvas.width,v/100*this.canvas.height)
    }

    mouseToCanvas = (e) => {
        const bounds = e.target.getBoundingClientRect()
        return makePoint(e.clientX, e.clientY).minus(makePoint(bounds.x,bounds.y))
    }

    canvasToHue(pt) {
        return Math.floor(pt.x/this.slider.width*360);
    }
    hueToCanvas(hue) {
        return hue/360*this.slider.width
    }
    mousePressSlider = (e) => {
        this.sliderPressed = true
        const pt = this.mouseToCanvas(e)
        const hue = this.canvasToHue(pt)
        this.setState({hue:hue})
        setTimeout(this.redraw,100)
    }
    mouseMoveSlider = (e) => {
        if(!this.sliderPressed) return
        const pt = this.mouseToCanvas(e)
        const hue = this.canvasToHue(pt)
        this.setState({hue:hue})
        setTimeout(this.redraw,100)
    }
    mouseUpSlider = () => {
        this.sliderPressed = false
    }
    drawSlider() {
        const g = 10
        const c2 = this.slider.getContext('2d')
        const w = this.slider.width
        const h = this.slider.height
        c2.fillStyle = 'red';
        c2.fillRect(0,0,w,h)
        for(let x=0; x<w; x+=g) {
            let hue = this.canvasToHue(makePoint(x,0))
            let color = hsluv.hsluvToHex([hue,100,50])
            if(color.length > 7) color = '#000000'
            c2.fillStyle = color
            c2.fillRect(x,0,g,h)
        }
        c2.fillStyle = 'black'
        const x = Math.floor(this.hueToCanvas(this.state.hue)/g)*g
        c2.fillRect(x,0,2,h)
    }

    drawIndicator() {
        const c = this.indicator.getContext('2d')
        let color = hsluv.hsluvToHex([Math.floor(this.state.hue),Math.floor(this.state.lightness),Math.floor(this.state.value)])
        if(color.length > 7) color = '#000000'
        c.fillStyle = color
        c.fillRect(0,0,this.indicator.width, this.indicator.height)
    }

    close = () => {
        let color = hsluv.hsluvToHex([Math.floor(this.state.hue),Math.floor(this.state.lightness),Math.floor(this.state.value)])
        if(color.length > 7) color = '#000000'
        this.props.onSelect(color)
        PopupManager.hide()
    }

    render() {
        return <div style={{
            display:'flex',
            flexDirection:'column'
        }}>
            <canvas
                ref={(can)=>this.canvas = can}
                width={100} height={100}
                onMouseDown={this.mousePress}
                onMouseMove={this.mouseMove}
                onMouseUp={this.mouseUp}
            />
            <canvas
                ref={(can)=>this.slider = can}
                width={100} height={30}
                onMouseDown={this.mousePressSlider}
                onMouseMove={this.mouseMoveSlider}
                onMouseUp={this.mouseUpSlider}
            />
            <canvas
                ref={(can)=>this.indicator = can}
                width={32} height={32}
                onClick={this.close}
            />
        </div>
    }
}