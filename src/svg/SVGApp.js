import React, {Component} from 'react'
import GridEditorApp from '../GridEditorApp'
import CanvasSVG from './CanvasSVG'

export default class SVGApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            scale: 2
        }
    }
    zoomIn = ()=> this.setState({scale:this.state.scale+1})
    zoomOut = ()=> this.setState({scale:this.state.scale-1})
    render() {
        const prov = this.props.provider
        const canvas = <CanvasSVG root={prov.getSceneRoot()} provider={prov} scale={this.state.scale}/>
        const treeActions = prov.getTreeActions()
        return <GridEditorApp
            provider={prov}
            treeActions={treeActions}
            mainView={canvas}
            viewActions={[
                <button className="fa fa-save" onClick={prov.save}/>,
                <button className="fa fa-plus-circle" onClick={this.zoomIn}/>,
                <button className="fa fa-minus-circle" onClick={this.zoomOut}/>,
            ]}
        />
    }
}