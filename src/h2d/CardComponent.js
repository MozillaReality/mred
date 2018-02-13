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
                return pt.minus(makePoint(bds.x,bds.y))
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
    render() {
        const card = this.props.card
        const prov = this.props.provider
        const style = {
            position: 'relative',
            backgroundColor: prov.getPropertyValue(card,'backgroundColor'),
            width: '800px',
            height: '800px'
        }
        let clss = "hypercard-card"
        if(this.props.showBounds === true) clss += " show-bounds"
        return <div
            style={style}
            ref={(ref)=>this.container = ref}
            className={clss}
            onMouseDown={this.clearSelection}
        >
            {card.children.map((item,i)=> { return this['renderItem_'+item.type](item,i)  })}
            {this.drawSelectionHandles(SelectionManager.getSelection())}
        </div>
    }
    renderItem_text(item,key) {
        let clss = "rect "
        if(SelectionManager.isSelected(item)) clss += " selected"
        const prov = this.props.provider
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    onContextMenu={(e)=>this.showContextMenu(e,item)}
                    className={clss}
                    style={{
                        position: 'absolute',
                        left:prov.getPropertyValue(item,'x')+'px',
                        top:prov.getPropertyValue(item,'y')+'px',
                        width:prov.getPropertyValue(item,'w')+'px',
                        height:prov.getPropertyValue(item,'h')+'px',
                        color:prov.getPropertyValue(item,'color'),
                        fontSize:prov.getPropertyValue(item,'fontSize')+'pt',
                    }}
                    onClick={()=>this.clicked(item)}
        >
            {item.text}
        </div>
    }
    renderItem_rect(item,key) {
        const prov = this.props.provider
        let clss = "rect "
        if(SelectionManager.isSelected(item)) clss += " selected"
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    onContextMenu={(e)=>this.showContextMenu(e,item)}
                    className={clss}
                    style={{
                        position: 'absolute',
                        left:prov.getPropertyValue(item,'x')+'px',
                        top:prov.getPropertyValue(item,'y')+'px',
                        width:prov.getPropertyValue(item,'w')+'px',
                        height:prov.getPropertyValue(item,'h')+'px',
                        backgroundColor: prov.getPropertyValue(item,'color'),
                    }}>
        </div>
    }
    renderItem_image(item,key) {
        const prov = this.props.provider
        let clss = "image "
        if(SelectionManager.isSelected(item)) clss += " selected"
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    onContextMenu={(e)=>this.showContextMenu(e,item)}
                    className={clss}
                    style={{
                        position: 'absolute',
                        left:prov.getPropertyValue(item,'x')+'px',
                        top:prov.getPropertyValue(item,'y')+'px',
                        width:prov.getPropertyValue(item,'w')+'px',
                        height:prov.getPropertyValue(item,'h')+'px',
                        padding:0,
                        margin:0,
                    }}
        ><img src={prov.getPropertyValue(item,'src')}
              width={prov.getPropertyValue(item,'w')}/></div>
    }
    mouseDownOnHandle(e,item) {
        new DragHandler(e,{
            target:item,
            provider:this.props.provider,
            toLocal: (pt) => {
                const bds = this.container.getBoundingClientRect()
                return pt.minus(makePoint(bds.x,bds.y))
            },
            xpropname: 'w',
            ypropname: 'h'
        })
    }
    drawSelectionHandles(item) {
        if(!item) return
        if(item.type === 'card') return
        const size = 8
        return <div>
            <div className="resize handle" style={{
                width:size*2+'px',
                height:size*2+'px',
                backgroundColor:'red',
                position:'absolute',
                left:(item.x+item.w-size)+'px',
                top:(item.y+item.h-size)+'px',
                borderRadius:'3px'
            }}
                 onMouseDown={(e)=>this.mouseDownOnHandle(e,item)}
            ></div>
        </div>

    }
}
