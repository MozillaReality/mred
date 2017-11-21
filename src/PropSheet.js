import React, { Component } from 'react';

import selMan, {SELECTION_MANAGER} from "./SelectionManager";

class PropEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value:this.props.def.value
        }
    }
    changed = (e) => {
        if(this.props.def.type === 'string') this.setState({value:e.target.value})
        if(this.props.def.type === 'number') this.setState({value:e.target.value})
    }
    keypressed = (e) => {
        if(e.charCode === 13) this.commit();
    }
    commit = () => {
        const sel = selMan.getSelection();
        this.props.provider.setPropertyValue(sel,this.props.def,this.state.value);
    }
    render() {
        const prop = this.props.def;
        if (prop.locked === true) return <i>{prop.value}</i>
        if (prop.type === 'string')  return <input type='string'   value={this.state.value} onChange={this.changed} onKeyPress={this.keypressed} onBlur={this.commit}/>
        if (prop.type === 'number')  return <input type='string'   value={this.state.value} onChange={this.changed} onKeyPress={this.keypressed} onBlur={this.commit}/>
        if (prop.type === 'boolean') return <input type='checkbox' value={prop.value}/>
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

