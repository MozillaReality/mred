import React, { Component } from 'react';

import SMM, {SELECTION_MANAGER} from "./SelectionManager";

export default class PropSheet extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selection:null
        }
    }
    componentDidMount() {
        this.listener = SMM.on(SELECTION_MANAGER.CHANGED, (selection) => this.setState({selection:selection}))
    }
    componentWillUnmount() {
        this.props.provider.off(SELECTION_MANAGER.CHANGED, this.listener);
    }
    render() {
        const props = this.calculateProps(this.props.selectedItem);
        return <ul className="prop-sheet">{props.map((prop, i) => {
            return <li key={i}><label>{prop.name}</label> <b>{prop.value}</b></li>
        })}
        </ul>
    }
    calculateProps(item) {
        return this.props.provider.getProperties(SMM.getSelection());
    }
}
