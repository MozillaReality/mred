import React, {Component} from 'react'
import ScriptManager from './ScriptManager'

export class ImmersivePlayer extends Component {
    constructor(props) {
        super(props)
        this.obj_node_map = {}
        this.scriptManager = new ScriptManager(this.props.provider)
    }

    render() {
        return <div>vr player for doc {this.props.provider.getDocId()}</div>
    }
}