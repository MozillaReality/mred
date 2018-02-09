import React, {Component} from 'react'
import HypercardCanvas3D from './HypercardCanvas3D'
import GridEditorApp from '../GridEditorApp'

export default class Hypercard3DApp extends Component {
    constructor(props) {
        super(props)
    }
    render() {
        const prov = this.props.provider
        const canvas = <HypercardCanvas3D provider={prov}/>
        const treeActions = prov.getTreeActions()
        return <GridEditorApp
            provider={prov}
            treeActions={treeActions}
            mainView={canvas}
        />
    }
}