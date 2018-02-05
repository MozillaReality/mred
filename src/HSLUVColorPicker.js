import React, { Component } from 'react'
import {makePoint} from "./utils"
import hsluv from 'hsluv'

export default class HSLUVColorPicker extends Component {
    constructor(props) {
        super(props)
        this.state = {
            v:0
        }
    }
    componentDidMount() {
        this.redraw();
    }
    mousePress = (e) => {
        this.redraw()
        const canvasBounds = this.canvas.getBoundingClientRect()
        const pt = makePoint(e.clientX, e.clientY).minus(makePoint(canvasBounds.x,canvasBounds.y))
        const w = this.canvas.width;
        const h = this.canvas.height;
        const f = makePoint(pt.x/w, pt.y/h)

        const hu = this.state.v*360
        const s = f.x*100
        const l = f.y*100

        const col = hsluv.hsluvToHex([Math.floor(hu), Math.floor(s),Math.floor(l)])
        this.props.onSelect(col)
    }
    updatedValue = (e) => {
        const v = e.target.value/360;
        this.setState({v:v})
        setTimeout(this.redraw,100)
    }
    redraw = () => {
        const canvas = this.canvas
        if(!canvas) return
        const c = this.canvas.getContext('2d')
        const w = this.canvas.width;
        const h = this.canvas.height;
        const g = 10
        const hu = this.state.v*360
        for(let x=0; x<w; x+=g) {
            for(let y=0; y<h; y+=g) {
                const s = x/w*100
                const l = y/h*100
                let color = hsluv.hsluvToHex([Math.floor(hu),Math.floor(s),Math.floor(l)])
                if(color.length > 7) color = '#000000'
                c.fillStyle = color
                c.fillRect(x,y,g,g)
            }
        }
    }
    render() {
        return <div style={{
            display:'flex',
            flexDirection:'column'
        }}>
            <canvas
                ref={(can)=>this.canvas = can}
                width={255} height={255}
                onMouseDown={this.mousePress}
            />
            <input type="range" value={this.state.v*360}
                   min={0}
                   max={360}
                   onChange={this.updatedValue}
            />
        </div>
    }
}