import React, {Component} from 'react'
import GridEditorApp from '../GridEditorApp'
import HypercardCanvas from './HypercardCanvas'

export default class HypercardApp extends Component {
    constructor(props) {
        super(props)
    }
    render() {
        const prov = this.props.provider
        const canvas = <HypercardCanvas provider={prov} />
        const treeActions = prov.getTreeActions()
        return <GridEditorApp
            provider={prov}
            treeActions={treeActions}
            mainView={canvas}
        />
    }
}