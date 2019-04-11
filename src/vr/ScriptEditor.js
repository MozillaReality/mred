import React, {Component} from "react"
import {fetchGraphObject} from '../syncgraph/utils'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import selMan, {SELECTION_MANAGER} from '../SelectionManager'

export default class ScriptEditor extends Component {
    constructor(props) {
        super(props)
        this.refresh = () => {
            const id = selMan.getSelection()
            const action = fetchGraphObject(this.props.provider.getDataGraph(),id)
            this.setState({id:selMan.getSelection(), text:action.scriptBody})
        }
        this.state = {
            id:null,
            text:'empty',
        }
    }
    componentDidMount() {
        this.refresh()
        this.props.provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,this.refresh)
    }

    componentWillUnmount() {
        this.props.provider.off(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,this.refresh)
    }
    changeText = (e) => this.setState({text:e.target.value})
    save = (e) => {
        const acc = this.props.provider.accessObject(this.state.id)
        this.props.provider.quick_setPropertyValue(this.state.id,'scriptBody',this.state.text)
    }
    render() {
        const prov = this.props.provider
        if(this.state.id === null) return <div>loading</div>
        return <div>
            <textarea value={this.state.text}
                      style={{
                          width:'99%',
                          height:'600px',
                      }}
                      onChange={this.changeText}
                      onBlur={this.save}
            />
        </div>
    }

}