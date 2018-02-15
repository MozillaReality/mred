import React, { Component } from 'react'
import {makePoint} from "./utils"
import hsluv from 'hsluv'

export default class HSLUVColorPicker extends Component {
    constructor(props) {
        super(props)
        this.state = {
            v:180
        }
    }
    componentDidMount() {
        this.redraw();
    }
    mousePress = (e) => {
        this.redraw()
        const canvasBounds = this.canvas.getBoundingClientRect()
        const pt = makePoint(e.clientX, e.clientY).minus(makePoint(canvasBounds.x,canvasBounds.y))
        const g = 10
        const h = this.canvas.height - g;
        const w = this.canvas.width;
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
        let w = this.canvas.width;
        const g = 10
        let h = this.canvas.height - g;
        const hu = this.state.v
        for(let x=0; x<w; x+=g) {
            for(let y=0; y<=h; y+=g) {
                const s = x/w*100
                const l = y/h*100
                let color = hsluv.hsluvToHex([Math.floor(hu),Math.floor(s),Math.floor(l)])
                if(color.length > 7) color = '#000000'
                c.fillStyle = color
                c.fillRect(x,y,g,g)
                c.strokeStyle = 'black'
                c.strokeRect(x,y,g,g)
            }
        }


        const c2 = this.slider.getContext('2d')
        w = this.slider.width
        h = this.slider.height
        c2.fillStyle = 'red';
        c2.fillRect(0,0,w,h)
        for(let x=0; x<w; x+=g) {
            let hu = x/w*360
            let color = hsluv.hsluvToHex([Math.floor(hu),100,50])
            if(color.length > 7) color = '#000000'
            c2.fillStyle = color
            c2.fillRect(x,0,g,h)
        }
        c2.fillStyle = 'black'
        console.log("x = ", this.state.v/360*w)
        c2.fillRect(this.state.v/360*w,0,2,h)
    }
    mousePressSlider = (e) => {
        const bounds = this.slider.getBoundingClientRect()
        const pt = makePoint(e.clientX, e.clientY).minus(makePoint(bounds.x,bounds.y))
        const v = Math.floor(pt.x/this.slider.width*360);
        this.setState({v:v})
        setTimeout(this.redraw,100)
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
            />
            <canvas
                ref={(can)=>this.slider = can}
                width={100} height={30}
                onMouseDown={this.mousePressSlider}
            />
        </div>
    }
}