import React, {Component} from 'react'
import SelectionManager from '../SelectionManager'
import {makePoint} from '../utils'
import DragHandler from '../texture/DragHandler'
import { PopupManager, VBox}  from "appy-comps";

export default class CardComponent extends Component {
    clicked(item) {
        if(this.props.live && item.target) {
            console.log("going to the target",item.target)
            this.props.navTo(item.target)
        }
    }

    startDrag = (e, obj) => {
        new DragHandler(e, {
            target: obj,
            provider: this.props.provider,
            toLocal: (pt) => {
                const bds = this.container.getBoundingClientRect()
                return pt.minus(makePoint(bds.x,bds.y)).divide(this.calcScale())
            },
            xpropname: 'x',
            ypropname: 'y'
        })
    }
    clearSelection = () => {
        SelectionManager.setSelection(this.props.card)
    }
    showContextMenu = (e,item) => {
        e.preventDefault()
        PopupManager.show(<VBox>
            <button onClick={()=>this.moveNodeToBack(item)}>move to back</button>
            <button onClick={()=>this.deleteNode(item)}>delete</button>
        </VBox>, e.target)
    }
    moveNodeToBack = (item) => {
        PopupManager.hide()
        this.props.provider.moveChildToBack(item)
    }
    deleteNode = (item) => {
        PopupManager.hide()
        this.props.provider.deleteChild(item)
    }
    calcScale() {
        return Math.pow(2,this.props.scale)
    }
    render() {
        const scale = this.calcScale()
        const card = this.props.card
        const prov = this.props.provider
        const style = {
            position: 'relative',
            backgroundColor: card.backgroundColor?card.backgroundColor:"white",
            width: `${800*scale}px`,
            height: `${800*scale}px`
        }
        let clss = "hypercard-card"
        if(this.props.showBounds === true) clss += " show-bounds"
        return <div
            style={style}
            ref={(ref)=>this.container = ref}
            className={clss}
            onMouseDown={this.clearSelection}
        >
            {card.children.map((item,i)=> { return this['renderItem_'+item.type](item,i,scale)  })}
            {this.drawSelectionHandles(SelectionManager.getSelection(),scale)}
        </div>
    }
    renderItem_text(item,key,scale) {
        let clss = "rect "
        if(SelectionManager.isSelected(item)) clss += " selected"
        const prov = this.props.provider
        const fontFamily = this.props.provider.findNodeById(item.fontFamily)
        if(fontFamily) this.cacheFont(fontFamily)
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    onContextMenu={(e)=>this.showContextMenu(e,item)}
                    className={clss}
                    style={{
                        position: 'absolute',
                        left:`${item.x*scale}px`,
                        top:`${item.y*scale}px`,
                        width:`${item.w*scale}px`,
                        height:`${item.h*scale}px`,
                        color:item.color,
                        fontSize:`${item.fontSize*scale}pt`,
                        fontFamily:fontFamily?fontFamily.key:'sans-serif',
                    }}
                    onClick={()=>this.clicked(item)}
        >
            {item.text}
        </div>
    }
    renderItem_rect(item,key,scale) {
        const prov = this.props.provider
        let clss = "rect "
        if(SelectionManager.isSelected(item)) clss += " selected"
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    onContextMenu={(e)=>this.showContextMenu(e,item)}
                    className={clss}
                    style={{
                        position: 'absolute',
                        left:`${item.x*scale}px`,
                        top:`${item.y*scale}px`,
                        width:`${item.w*scale}px`,
                        height:`${item.h*scale}px`,
                        backgroundColor: item.color,
                    }}>
        </div>
    }
    renderItem_image(item,key,scale) {
        const prov = this.props.provider
        let clss = "image "
        if(SelectionManager.isSelected(item)) clss += " selected"
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    onContextMenu={(e)=>this.showContextMenu(e,item)}
                    className={clss}
                    style={{
                        position: 'absolute',
                        left:`${item.x*scale}px`,
                        top:`${item.y*scale}px`,
                        width:`${item.w*scale}px`,
                        height:`${item.h*scale}px`,
                        padding:0,
                        margin:0,
                    }}
        ><img src={item.src} width={item.w*scale}/></div>
    }
    mouseDownOnHandle(e,item) {
        new DragHandler(e,{
            target:item,
            provider:this.props.provider,
            toLocal: (pt) => {
                const bds = this.container.getBoundingClientRect()
                return pt.minus(makePoint(bds.x,bds.y)).divide(this.calcScale())
            },
            xpropname: 'w',
            ypropname: 'h'
        })
    }
    drawSelectionHandles(item,scale) {
        if(!item) return
        if(item.type === 'card') return
        const size = 8
        return <div>
            <div className="resize handle" style={{
                width: `${size * 2 * scale}px`,
                height: `${size * 2 * scale}px`,
                backgroundColor: 'red',
                position: 'absolute',
                left: (item.x + item.w-size) * scale + 'px',
                top: (item.y + item.h-size) * scale + 'px'
            }}
            onMouseDown={(e) => this.mouseDownOnHandle(e, item)}
            />
        </div>

    }

    cacheFont(font) {
        if (!document.getElementById(font.id) && font.url) {
            var head = document.getElementsByTagName('head')[0]
            var link = document.createElement('link')
            link.id = font.id
            link.rel = 'stylesheet'
            link.type = 'text/css'
            link.href = font.url
            link.media = 'all'
            console.log("adding",link)
            head.appendChild(link)
        }
    }
}
