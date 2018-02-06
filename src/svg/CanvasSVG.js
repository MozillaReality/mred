import React, {Component} from "react"
import {SELECTION_MANAGER} from '../SelectionManager'
import Selection from '../SelectionManager'
import {makePoint} from '../utils'


export default class CanvasSVG extends Component {
    constructor(props) {
        super(props);
        this.down = false
        this.state = {
            selection:null
        }
    }
    componentDidMount() {
        Selection.on(SELECTION_MANAGER.CHANGED,()=>{
            this.setState({selection:Selection.getSelection()})
        })
    }

    mouseDown = (e,item) => {
        e.stopPropagation()
        e.preventDefault()
        const svgcanvas = document.getElementById('svg-canvas');
        const canvasBounds = svgcanvas.getBoundingClientRect()
        this.start = makePoint(canvasBounds.x,canvasBounds.y)
        this.scale = svgcanvas.viewBox.baseVal.width/canvasBounds.width
        const translate = makePoint(item.tx, item.ty)
        this.inset = makePoint(e.clientX, e.clientY).minus(this.start).multiply(this.scale).minus(translate)
        this.down = true
        this.item = item
        Selection.setSelection(item)
        window.document.addEventListener('mousemove',this.mouseMove)
        window.document.addEventListener('mouseup',this.mouseUp)
    }
    mouseMove = (e) => {
        if(!this.down) return
        e.stopPropagation()
        e.preventDefault()
        const off = makePoint(e.clientX,e.clientY).minus(this.start).multiply(this.scale).minus(this.inset)
        const defX = this.props.provider.getDefForProperty(this.item,'tx')
        this.props.provider.setPropertyValue(this.item,defX,off.x)
        const defY = this.props.provider.getDefForProperty(this.item,'ty')
        this.props.provider.setPropertyValue(this.item,defY,off.y)
    }
    mouseUp = (e) => {
        this.start = null
        this.scale = 1
        this.down = false
        this.item = null
        window.document.removeEventListener('mousemove',this.mouseMove)
        window.document.removeEventListener('mouseup',this.mouseUp)
    }

    handleMouseDown = (e, item, prop) => {
        e.stopPropagation()
        e.preventDefault()
        const svgcanvas = document.getElementById('svg-canvas');
        const canvasBounds = svgcanvas.getBoundingClientRect()
        this.start = makePoint(canvasBounds.x,canvasBounds.y)
        this.scale = svgcanvas.viewBox.baseVal.width/canvasBounds.width
        const l1 = (e)=>{
            const off = makePoint(e.clientX,e.clientY).minus(this.start).multiply(this.scale)
            let defX = null;
            let defY = null;
            if(prop === 'c1') {
                defX = this.props.provider.getDefForProperty(item, 'cx1')
                defY = this.props.provider.getDefForProperty(item, 'cy1')
            }
            if(prop === 'c2') {
                defX = this.props.provider.getDefForProperty(item, 'cx2')
                defY = this.props.provider.getDefForProperty(item, 'cy2')
            }
            if(prop === 'wh') {
                defX = this.props.provider.getDefForProperty(item, 'w')
                defY = this.props.provider.getDefForProperty(item, 'h')
            }
            if(prop === 'r') {
                defX = this.props.provider.getDefForProperty(item, 'r')
            }

            if(defX) this.props.provider.setPropertyValue(item,defX,off.x-item.tx)
            if(defY) this.props.provider.setPropertyValue(item,defY,off.y-item.ty)
        }
        const l2 = (e)=>{
            window.document.removeEventListener('mousemove',l1)
            window.document.removeEventListener('mouseup',l2)
        }
        window.document.addEventListener('mousemove',l1)
        window.document.addEventListener('mouseup',l2)
    }
    render() {
        return this.drawSVG(this.props.root, 0)
    }
    drawSVG(item,key) {
        if(!item) return "";
        const type = item.type;
        if (type === 'scene')  return this.drawSVGRoot(item,key);
        if (type === 'rect')   return this.drawRect(item,key)
        if (type === 'circle') return this.drawCircle(item,key)
        if (type === 'text')   return this.drawText(item,key);
        if (type === 'group')  return this.drawGroup(item,key);
        if (type === 'ellipse') return this.drawEllipse(item,key)
        if (type === 'arrow') return this.drawArrow(item,key)
        if (type === 'image') return this.drawImage(item,key)
    }
    drawChildren(item) {
        return item.children.map((it, i) => this.drawSVG(it, i));
    }
    drawRect(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let strokeDashArray = null;
        if(item.strokeStyle) {
            if(item.strokeStyle === 'solid') {
                strokeDashArray = null
            }
            if(item.strokeStyle === 'dotted') {
                strokeDashArray = `${strokeWidth},${strokeWidth}`
            }
            if(item.strokeStyle === 'dashed') {
                strokeDashArray = `${strokeWidth*4},${strokeWidth*4}`
            }
        }
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <rect key={key}
                     x={item.x} y={item.y} width={item.w} height={item.h}
                     rx={item.rx} ry={item.ry}
                     fill={item.color} visibility={vis}
                     className={classname}
                     stroke={stroke} strokeWidth={strokeWidth}
                     strokeDasharray={strokeDashArray}
                     transform={`translate(${item.tx},${item.ty})`}
                     onMouseDown={(e)=>this.mouseDown(e,item)}
        />
    }
    drawCircle(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <circle cx={item.cx} cy={item.cy} r={item.r} fill={item.color} key={key}
                       className={classname}
                       transform={`translate(${item.tx},${item.ty})`}
                       onMouseDown={(e)=>this.mouseDown(e,item)}
                       visibility={vis} stroke={stroke} strokeWidth={strokeWidth}/>
    }
    drawEllipse(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <ellipse
            cx={item.cx}
            cy={item.cy}
            rx={item.w}
            ry={item.h}
            fill={item.color}
            key={key}
            className={classname}
            transform={`translate(${item.tx},${item.ty})`}
            onMouseDown={(e)=>this.mouseDown(e,item)}
            visibility={vis} stroke={stroke} strokeWidth={strokeWidth}
        />
    }
    drawArrow(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return  <line
            key={key}
            transform={`translate(${item.tx},${item.ty})`}
            onMouseDown={(e)=>this.mouseDown(e,item)}
            x1={item.cx1}
            y1={item.cy1}
            x2={item.cx2}
            y2={item.cy2}
            stroke={stroke} strokeWidth={strokeWidth} markerEnd="url(#arrow-head)" />
    }
    drawImage(item,key) {
        const vis = item.visible?'visible':'hidden';
        const stroke = item.stroke?item.stroke:'black';
        const strokeWidth = item.strokeWidth?item.strokeWidth:0;
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <image key={key}
                      href={item.src}
                      width={item.w} height={item.h}
                      className={classname}
            // preserveAspectRatio="none"
                      stroke={stroke} strokeWidth={strokeWidth}
                      transform={`translate(${item.tx},${item.ty})`}
                      onMouseDown={(e)=>this.mouseDown(e,item)}
        />
    }
    drawText(item,key) {
        const vis = item.visible?'visible':'hidden';
        let classname = ""
        if(Selection.getSelection()===item) classname += " selected"
        return <text key={key} x={item.x} y={item.y}
                     className={classname}
                     transform={`translate(${item.tx},${item.ty})`}
                     onMouseDown={(e)=>this.mouseDown(e,item)}
                     fill={item.color} fontSize={item.fontSize}
                     fontFamily={item.fontFamily} visibility={vis} textAnchor={item.textAnchor}
                     style={{cursor:'default'}}
        >{item.text}</text>
    }
    drawGroup(item, key) {
        const vis = item.visible?'visible':'hidden';
        return <g key={key} transform={`translate(${item.tx},${item.ty})`} visibility={vis}>{this.drawChildren(item)}</g>
    }
    drawSVGRoot(item, key) {
        return <svg key={key} id="svg-canvas" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <marker id="arrow-head" markerWidth="5" markerHeight="5"
                        refX="0" refY="2.5"
                        orient="auto" markerUnits="strokeWidth"
                        fill="inherit"
                >
                    <path d="M0,0 L0,5 L5,2.5 z" />
                </marker>
            </defs>
            {this.drawChildren(item)}
            {this.drawSelectionHandles(Selection.getSelection())}
        </svg>
    }
    drawSelectionHandles(item) {
        if(!item) return
        if(item.type === 'arrow') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.cx1-15} y={item.cy1-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'c1')}
                />
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.cx2-15} y={item.cy2-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'c2')}
                />
            </g>
        }
        if(item.type === 'rect') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.w-15} y={item.h-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'wh')}
                />
            </g>
        }
        if(item.type === 'image') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.w-15} y={item.h-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'wh')}
                />
            </g>
        }
        if(item.type === 'ellipse') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.w-15} y={item.h-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'wh')}
                />
            </g>
        }
        if(item.type === 'circle') {
            return <g>
                <rect transform={`translate(${item.tx},${item.ty})`} x={item.r-15} y={item.cy-15}
                      width="30" height="30"
                      fill="green" stroke="white" strokeWidth="3.0"
                      onMouseDown={(e)=>this.handleMouseDown(e,item,'r')}
                />
            </g>
        }
    }
}
