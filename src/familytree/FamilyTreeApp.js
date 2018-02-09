import React, {Component} from 'react'
import GridEditorApp from '../GridEditorApp'

export default class FamilyTreeApp extends Component {
    render() {
        return <GridEditorApp
            provider={this.props.provider}
            treeActions={this.props.provider.getTreeActions()}
            mainView={this.props.provider.getCanvas()}
        />
    }

}