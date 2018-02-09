import React, {Component} from 'react'
import GridEditorApp from '../GridEditorApp'
import CanvasSVG from './CanvasSVG'

export default class SVGApp extends Component {
    constructor(props) {
        super(props)
    }
    render() {
        const prov = this.props.provider
        const canvas = <CanvasSVG root={prov.getSceneRoot()} provider={prov} scale={1}/>
        const treeActions = prov.getTreeActions()
        return <GridEditorApp
            provider={prov}
            treeActions={treeActions}
            mainView={canvas}
        />
    }
}