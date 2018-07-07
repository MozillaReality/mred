import React, {Component} from 'react'
import {PopupManager, VBox} from 'appy-comps'
import {makePoint} from './utils'

const GridLayout = (props) => {
    let clss = "grid fill";
    if (!props.showLeft) clss += ' hide-left';
    if (!props.showRight) clss += ' hide-right';
    const cols = `
    [left] ${props.leftWidth}px
    [left-resize] 2px
    [center] auto
    [right-resize] 2px
    [right] ${props.rightWidth}px
    `
    const style = {gridTemplateColumns:cols}
    return <div className={clss} style={style}>{props.children}</div>
};

export const Toolbar = (props) => {
    let cls = "toolbar";
    if (props.left) cls += " left";
    if (props.right) cls += " right";
    if (props.bottom) cls += " bottom";
    if (props.top) cls += " top";
    if (props.center) cls += " center";
    if (props.middle) cls += " middle";
    if (props.scroll) cls += " scroll";
    return <div className={cls}>{props.children}</div>
};
export const Panel = (props) => {
    let cls = 'panel';
    if (props.left) cls += " left";
    if (props.right) cls += " right";
    if (props.bottom) cls += " bottom";
    if (props.top) cls += " top";
    if (props.center) cls += " center";
    if (props.middle) cls += " middle";
    if (props.scroll) cls += " scroll";
    return <div className={cls}>{props.children}</div>
};
export const Spacer = (props) => {
    return <span className='spacer'/>
};

export const ToggleButton = (props) => {
    const {selected, ...rest} = props
    const clss = selected?"selected":""
    return <button className={clss} {...rest}></button>
}

export const MenuPopup = (props) => {
    return <VBox className="popup-menu">
        {props.actions.map((act,i)=>{
            return <div  key={i} onClick={()=>{
                PopupManager.hide();
                if(act.fun) act.fun()
            }}><i className={'fa fa-' + act.icon}/> {act.title}</div>
        })}
    </VBox>

}

export default class GridEditorApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            showLeft: true,
            showRight: true,
            leftWidth:250,
            rightWidth:250,
            dragSide:'none'
        }
    }
    toggleLeftPane = (e) => this.setState({showLeft: !this.state.showLeft})
    toggleRightPane = (e) => this.setState({showRight: !this.state.showRight})
    onMouseDownLeft = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.setState({dragSide:'left'})
        window.addEventListener('mousemove',this.onMouseMove)
        window.addEventListener('mouseup',this.onMouseUp)
    }
    onMouseDownRight = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.setState({dragSide:'right'})
        window.addEventListener('mousemove',this.onMouseMove)
        window.addEventListener('mouseup',this.onMouseUp)
    }
    onMouseMove = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const cursor = makePoint(e.clientX, e.clientY)
        if(this.state.dragSide === 'left')  this.setState({leftWidth:cursor.x})
        if(this.state.dragSide === 'right') this.setState({rightWidth:window.innerWidth-cursor.x})
    }
    onMouseUp = (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.removeEventListener('mousemove', this.onMouseMove)
        window.removeEventListener('mouseup', this.onMouseUp)
    }
    render() {
        return <GridLayout showLeft={this.state.showLeft}
                           showRight={this.state.showRight}
                           leftWidth={this.state.leftWidth}
                           rightWidth={this.state.rightWidth}
        >
            <Toolbar center bottom>
                <button className={'fa' + (this.state.showLeft ? ' fa-caret-left' : ' fa-caret-right')}
                        onClick={this.toggleLeftPane}/>
                <Spacer/>
                <button className={'fa' + (this.state.showRight ? ' fa-caret-right' : ' fa-caret-left')}
                        onClick={this.toggleRightPane}/>
            </Toolbar>

            <div className={'left-resize'}  onMouseDown={this.onMouseDownLeft}/>
            <div className={'right-resize'} onMouseDown={this.onMouseDownRight}/>

            {this.props.children}
        </GridLayout>
    }
}
