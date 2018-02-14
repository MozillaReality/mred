import React, {Component} from 'react'
import {SELECTION_MANAGER} from '../SelectionManager'
import SelectionManager from '../SelectionManager'
import CardComponent from './CardComponent'

export default class HypercardCanvas extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selection:null
        }
    }
    componentDidMount() {
        this.sel_listener = SelectionManager.on(SELECTION_MANAGER.CHANGED, (sel)=> {
            this.setState({selection:sel})
        })
    }
    render() {
        if(!this.state.selection) return <div>nothing selected</div>
        const sel = this.state.selection.getSelection()
        if(!sel) return <div>nothing selected</div>
        if(sel.type === 'card') {
            return <CardComponent
                card={sel} live={false}
                scale={this.props.scale}
                provider={this.props.provider}/>
        }
        if(sel.type === 'text' || sel.type === 'rect' || sel.type === 'image') {
            const card = this.props.provider.getParent(sel)
            return <CardComponent
                card={card} live={false}
                scale={this.props.scale}
                provider={this.props.provider}
                showBounds={this.props.showBounds}/>
        }
        return <div>invalid selection</div>
    }
}
