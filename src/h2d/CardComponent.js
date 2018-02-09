import React, {Component} from 'react'
import SelectionManager from '../SelectionManager'
import {makePoint} from '../utils'

export default class CardComponent extends Component {
    clicked(item) {
        if(this.props.live && item.target) {
            console.log("going to the target",item.target)
            this.props.navTo(item.target)
        }
    }
    localToContainer = (e) => {
        const bounds = e.target.getBoundingClientRect()
        return makePoint(e.clientX - bounds.x, e.clientY - bounds.y)
    }
    windowToContainer = (e) => {
        const bds = this.container.getBoundingClientRect()
        return makePoint(e.clientX - bds.x, e.clientY - bds.y)
    }
    startDrag = (e, obj) => {
        e.stopPropagation()
        e.preventDefault()
        SelectionManager.setSelection(obj)

        this.setState({
            dragging:true,
            start:this.localToContainer(e),
        })
        const l1 = (e) => {
            let pt = this.windowToContainer(e).minus(this.state.start)
            this.props.provider.setPropertyValueByName(obj,'x',pt.x)
            this.props.provider.setPropertyValueByName(obj,'y',pt.y)
        }
        const l2 = (e) => {
            window.removeEventListener('mousemove',l1)
            window.removeEventListener('mouseup',l2)
            this.setState({dragging:false})
        }
        window.addEventListener('mousemove',l1)
        window.addEventListener('mouseup',l2)
    }
    render() {
        const card = this.props.card
        return <div style={{position:'relative'}} ref={(ref)=>this.container = ref}>
            {card.children.map((item,i)=> { return this['renderItem_'+item.type](item,i)  })}
        </div>
    }
    renderItem_text(item,key) {
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    style={{
                        position: 'absolute',
                        left:item.x+'px',
                        top:item.y+'px',
                        width:item.w+'px',
                        height:item.h+'px',
                        border:'1px solid black',
                        color:item.color,
                        fontSize:item.fontSize+'pt',
                    }}
                    onClick={()=>this.clicked(item)}
        >
            {item.text}
        </div>
    }
    renderItem_rect(item,key) {
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    style={{
                        position: 'absolute',
                        left:item.x+'px',
                        top:item.y+'px',
                        width:item.w+'px',
                        height:item.h+'px',
                        backgroundColor: item.color,
                        border:'1px solid black'
                    }}>
        </div>
    }
    renderItem_image(item,key) {
        return <div key={key}
                    onMouseDown={(e)=>this.startDrag(e,item)}
                    style={{
                        position: 'absolute',
                        left: item.x + 'px',
                        top: item.y + 'px',
                        width: item.w + 'px',
                        height: item.h + 'px',
                        border: '1px solid black',
                        padding:0,
                        margin:0,
                    }}
        ><img src={item.src} width={item.w}/></div>
    }
}
