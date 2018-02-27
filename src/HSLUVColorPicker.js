import React, { Component } from 'react'
import {makePoint} from "./utils"
import hsluv from 'hsluv'
import {PopupManager} from "appy-comps"

export default class HSLUVColorPicker extends Component {
    constructor(props) {
        super(props)

        const comps = hsluv.hexToHsluv(props.value)
        this.state = {
            hue:comps[0],
            lightness:comps[1],
            value:comps[2],
        }
        console.log("the current value is",props.value, hsluv.hexToHsluv(props.value))
    }
    componentDidMount() {
        this.redraw();
    }
    canvasToPoint(e) {
        const canvasBounds = this.canvas.getBoundingClientRect()
        const pt = makePoint(e.clientX, e.clientY).minus(makePoint(canvasBounds.x,canvasBounds.y))
        const h = this.canvas.height;
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
        this.redraw()
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
        let w = 100
        let h = 100
        const hue = Math.floor(this.state.hue)
        for(let i=0; i<=4; i++) {
            for(let j=0; j<=4; j++) {
                let color = hsluv.hsluvToHex([hue,i*25,j*25])
                if(color.length > 7) color = '#000000'
                c.fillStyle = color
                c.fillRect(i*20,j*20,20,20)
            }
        }
        const g = 20
        const cp = this.livalToCanvas(this.state.lightness, this.state.value)
        c.strokeStyle = 'white'
        c.strokeRect(Math.floor(cp.x/g)*g, Math.floor(cp.y/g)*g,g,g)
        c.strokeStyle = 'black'
        c.strokeRect(Math.floor(cp.x/g)*g+1, Math.floor(cp.y/g)*g+1,g-2,g-2)

        c.strokeStyle = 'black';
        c.lineWidth = 1.0
        c.strokeRect(0,0,w,h)
    }

    livalToCanvas = (l,v) => {
        return makePoint(l/100*100,v/100*100)
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
        const c = this.slider.getContext('2d')
        const w = this.slider.width
        const h = this.slider.height
        c.fillStyle = 'red';
        c.fillRect(0,0,w,h)
        for(let x=0; x<w; x+=g) {
            let hue = this.canvasToHue(makePoint(x,0))
            let color = hsluv.hsluvToHex([hue,100,50])
            if(color.length > 7) color = '#000000'
            c.fillStyle = color
            c.fillRect(x,0,g,h)
        }
        c.strokeStyle = 'black'
        c.lineWidth = 1.0
        const x = Math.floor(this.hueToCanvas(this.state.hue)/g)*g
        c.strokeRect(x,0,g,h)
        c.strokeRect(0,0,w,h)
    }

    drawIndicator() {
        const c = this.indicator.getContext('2d')
        const w = this.indicator.width
        const h = this.indicator.height
        let color = hsluv.hsluvToHex([Math.floor(this.state.hue),Math.floor(this.state.lightness),Math.floor(this.state.value)])
        if(color.length > 7) color = '#000000'
        c.fillStyle = color
        c.fillRect(0,0,w,h)
        c.strokeStyle = 'black'
        c.lineWidth = 1.0
        c.strokeRect(0,0,w,h)
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
            flexDirection:'column',
            alignItems:'center'
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