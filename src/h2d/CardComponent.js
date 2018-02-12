import React, {Component} from 'react'
import SelectionManager from '../SelectionManager'
import {makePoint} from '../utils'
import DragHandler from '../texture/DragHandler'

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
    render() {
        const card = this.props.card
        const style = {
            position: 'relative',
            backgroundColor: card.backgroundColor?card.backgroundColor:"white",
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
        </div>
    }
    renderItem_text(item,key) {
        const selected = SelectionManager.getSelection() === item
        let clss = "rect "
        if(selected) clss += " selected"
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    className={clss}
                    style={{
                        position: 'absolute',
                        left:item.x+'px',
                        top:item.y+'px',
                        width:item.w+'px',
                        height:item.h+'px',
                        color:item.color,
                        fontSize:item.fontSize+'pt',
                    }}
                    onClick={()=>this.clicked(item)}
        >
            {item.text}
        </div>
    }
    renderItem_rect(item,key) {
        const selected = SelectionManager.getSelection() === item
        let clss = "rect "
        if(selected) clss += " selected"
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    className={clss}
                    style={{
                        position: 'absolute',
                        left:item.x+'px',
                        top:item.y+'px',
                        width:item.w+'px',
                        height:item.h+'px',
                        backgroundColor: item.color,
                    }}>
        </div>
    }
    renderItem_image(item,key) {
        const selected = SelectionManager.getSelection() === item
        let clss = "image "
        if(selected) clss += " selected"
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    className={clss}
                    style={{
                        position: 'absolute',
                        left: item.x + 'px',
                        top: item.y + 'px',
                        width: item.w + 'px',
                        height: item.h + 'px',
                        padding:0,
                        margin:0,
                    }}
        ><img src={item.src} width={item.w}/></div>
    }
}
