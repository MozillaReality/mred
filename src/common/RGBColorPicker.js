import React, { Component } from 'react';
import {makePoint} from "../utils";

export default class RGBColorPicker extends Component {
    constructor(props) {
        super(props)
        this.state = {
            b:0
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
        this.props.onSelect(this.RGBtoHEX(f.x,f.y,this.state.b))
    }
    updatedValue = (e) => {
        const b = e.target.value/100;
        this.setState({b:b})
        setTimeout(this.redraw,100)
    }
    RGBtoHEX = (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            if(x >= 1) x = 0.999
            const hex = Math.floor(Math.min(x,1)*256).toString(16)
            return hex.length === 1 ? '0' + hex : hex
        }).join('')
    }
    redraw = () => {
        const canvas = this.canvas
        if(!canvas) return
        const c = this.canvas.getContext('2d')
        const w = this.canvas.width;
        const h = this.canvas.height;
        const s = 10
        for(let x=0; x<w; x+=s) {
            for(let y=0; y<h; y+=s) {
                c.fillStyle = `rgb(${x/w*100}%,${y/h*100}%,${this.state.b*100}%)`
                c.fillRect(x,y,s,s)
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
            width={256} height={256}
            onMouseDown={this.mousePress}
            />
            <input type="range" value={this.state.b*100}
                   min={0}
                   max={100}
                   onChange={this.updatedValue}
            />
        </div>
    }
}