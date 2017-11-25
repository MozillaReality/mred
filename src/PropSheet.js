import React, { Component } from 'react';
import {PopupManager} from "appy-comps";

import selMan, {SELECTION_MANAGER} from "./SelectionManager";

const COLORS = [
    'red','green','blue','purple'
]
class PaletteColorPicker extends Component {
    chooseColor(c) {
        console.log('chose',c,this.props)
        this.props.onSelect(c);
    }
    render() {
        const style = {
            display:'flex',
            flexDirection:'row',
            flexWrap:'wrap'
        }
        return <div style={style}>
            {COLORS.map((c,i)=> <button key={c} onClick={this.chooseColor.bind(this,c)}>{c}</button>)}
        </div>
    }
}
class PropEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value:this.props.def.value
        }
    }
    componentWillReceiveProps(nextProps) {
        if(this.props.def !== nextProps.def) {
            this.setState({value:nextProps.def.value})
        }
    }
    changed = (e) => {
        if(this.props.def.type === 'string') this.setState({value:e.target.value})
        if(this.props.def.type === 'number') this.setState({value:e.target.value})
        if(this.props.def.type === 'boolean') this.setState({value:e.target.checked})
    }
    keypressed = (e) => {
        if(e.charCode === 13) this.commit();
    }
    booleanChanged = (e) => {
        this.setState({value:e.target.checked});
        const sel = selMan.getSelection();
        this.props.provider.setPropertyValue(sel,this.props.def,e.target.checked);
    }
    colorChanged = (color) => {
        this.setState({value:color});
        const sel = selMan.getSelection();
        this.props.provider.setPropertyValue(sel,this.props.def,color);
        PopupManager.hide();
    }
    commit = () => {
        const sel = selMan.getSelection();
        this.props.provider.setPropertyValue(sel,this.props.def,this.state.value);
    }
    openColorEditor = (e) => {
        PopupManager.show(<PaletteColorPicker onSelect={this.colorChanged}/>, e.target)
    }
    render() {
        const prop = this.props.def;
        if (prop.locked === true) return <i>{prop.value}</i>
        if (prop.type === 'string')  return <input type='string'   value={this.state.value} onChange={this.changed} onKeyPress={this.keypressed} onBlur={this.commit}/>
        if (prop.type === 'number')  return <input type='string'   value={this.state.value} onChange={this.changed} onKeyPress={this.keypressed} onBlur={this.commit}/>
        if (prop.type === 'boolean') return <input type='checkbox' checked={this.state.value} onChange={this.booleanChanged}/>
        if (prop.type === 'color') return <button onClick={this.openColorEditor}>{this.state.value} color</button>
        return <b>{prop.value}</b>
    }
}

export default class PropSheet extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selection:null
        }
    }
    componentDidMount() {
        this.listener = selMan.on(SELECTION_MANAGER.CHANGED, (selection) => this.setState({selection:selection}))
    }
    componentWillUnmount() {
        selMan.off(SELECTION_MANAGER.CHANGED, this.listener);
    }
    render() {
        const props = this.calculateProps();
        return <ul className="prop-sheet">{props.map((prop, i) => {
            return <li key={i}><label>{prop.name}</label> <PropEditor def={prop} provider={this.props.provider}/></li>
        })}</ul>
    }
    calculateProps() {
        return this.props.provider.getProperties(selMan.getSelection());
    }
}

