import React, {Component} from "react"
import {fetchGraphObject} from '../syncgraph/utils'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import selMan, {SELECTION_MANAGER} from '../SelectionManager'

export default class ScriptEditor extends Component {
    constructor(props) {
        super(props)
        this.h2 = () => this.setState({selection:selMan.getSelection()})
        this.state = {
            selection:null,
        }
    }
    componentDidMount() {
        this.setState({selection:selMan.getSelection()})
        this.props.provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,this.h2)
    }

    componentWillUnmount() {
        this.props.provider.off(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,this.h2)
    }
    changeText = (e) => {
        const acc = this.props.provider.accessObject(this.state.selection)
        this.props.provider.quick_setPropertyValue(this.state.selection,'scriptBody',e.target.value)
    }
    render() {
        const prov = this.props.provider
        if(this.state.selection === null) return <div>loading</div>
        const action = fetchGraphObject(prov.getDataGraph(),this.state.selection)
        return <div>
            <textarea value={action.scriptBody}
                      style={{
                          width:'99%',
                          height:'600px',
                      }}
                      onChange={this.changeText}
            />
        </div>
    }

}