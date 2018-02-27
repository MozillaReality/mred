import React, {Component} from 'react'
import SelectionManager from '../SelectionManager'
import {makePoint} from '../utils'
import DragHandler from '../texture/DragHandler'
import { PopupManager, VBox}  from "appy-comps";
import {BLOCK_STYLES, HORIZONTAL_ALIGNMENT} from "./HypercardEditor"

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
            undoManager:this.props.undoManager,
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
        const bounds = prov.getCardBounds().multiply(scale)
        const style = {
            position: 'relative',
            backgroundColor: card.backgroundColor?card.backgroundColor:"white",
            width: `${bounds.x}px`,
            height: `${bounds.y}px`
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
        let clss = "hypercard-text "
        if(SelectionManager.isSelected(item)) clss += " selected"
        const prov = this.props.provider
        let color = item.color
        let fontSize = item.fontSize
        let fontFamily_str = item.fontFamily
        let blockStyle = item.blockStyle
        let horizontalAlignment = item.horizontalAlignment
        let text = item.text

        if(blockStyle !== BLOCK_STYLES.NONE && blockStyle !== null && typeof blockStyle !== 'undefined') {
            const style = prov.findBlockstyleById(blockStyle)
            color = style.color
            fontSize = style.fontSize
            fontFamily_str = style.fontFamily
            horizontalAlignment = style.horizontalAlignment
        }

        if(blockStyle === BLOCK_STYLES.LIST) {
            text = item.text.split("\n").map((t,i)=><li key={i}>{t}</li>)
        }
        if(blockStyle === BLOCK_STYLES.CODE) {
            clss += " code-block"
        }


        let halign = 'flex-start'
        if(horizontalAlignment === HORIZONTAL_ALIGNMENT.LEFT) halign = 'left'
        if(horizontalAlignment === HORIZONTAL_ALIGNMENT.CENTER) halign = 'center'
        if(horizontalAlignment === HORIZONTAL_ALIGNMENT.RIGHT) halign = 'right'


        let fontFamily_ins = prov.findFontById(fontFamily_str)
        if(fontFamily_ins) this.cacheFont(fontFamily_ins)
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
                        color:color,
                        fontSize:`${fontSize*scale}pt`,
                        fontFamily:fontFamily_ins?fontFamily_ins.key:'sans-serif',
                        textAlign:halign
                    }}
                    onClick={()=>this.clicked(item)}
        >
            {text}
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
