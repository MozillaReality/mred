import React, {Component} from 'react'
import GridEditorApp, {MenuPopup, Panel, Toolbar} from '../GridEditorApp'
import CanvasSVG from './CanvasSVG'
import PropSheet from '../PropSheet'
import Selection from '../SelectionManager'
import {PopupManager} from 'appy-comps'

export default class SVGApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            scale: 2,
            showProps:true
        }
    }
    zoomIn = ()=> this.setState({scale:this.state.scale+1})
    zoomOut = ()=> this.setState({scale:this.state.scale-1})
    deleteSelectedItem = () => this.props.provider.deleteNode(Selection.getSelection())
    showCreateObjectMenu = (e) => {
        const acts = [
            {
                title: 'rect',
                icon: 'square',
                fun: () => this.props.provider.addToNearestSelectedParent(this.props.provider.createRect())
            },
            {
                title: 'circle',
                icon: 'circle',
                fun: () => this.props.provider.addToNearestSelectedParent(this.props.provider.createCircle())
            },
            {
                title: 'ellipse',
                icon: 'circle',
                fun: () => this.props.provider.addToNearestSelectedParent(this.props.provider.createEllipse())
            },
            {
                title: 'arrow',
                icon: 'long-arrow-right',
                fun: () => this.props.provider.addToNearestSelectedParent(this.props.provider.createArrow())
            },
            {
                title: 'text',
                icon: 'text-width',
                fun: () => this.props.provider.addToNearestSelectedParent(this.props.provider.createText())
            },
            {
                title: 'image',
                icon: 'image',
                fun: () => this.props.provider.addToNearestSelectedParent(this.props.provider.createImage())
            },
            ]
        PopupManager.show(<MenuPopup actions={acts}/>,e.target)
    }
    render() {
        const prov = this.props.provider
        const canvas = <CanvasSVG root={prov.getSceneRoot()} provider={prov} scale={this.state.scale}/>
        return <GridEditorApp provider={prov}>

            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Toolbar left bottom>
                <button onClick={this.showCreateObjectMenu} className="fa fa-plus"> object</button>
                <button className="fa fa-close" onClick={this.deleteSelectedItem}/>
                <button className="fa fa-save" onClick={prov.exportToSVG}>export SVG</button>
            </Toolbar>

            <Toolbar center top>
                <button className="fa fa-save" onClick={prov.save}/>
                <button className="fa fa-plus-circle" onClick={this.zoomIn}/>
                <button className="fa fa-minus-circle" onClick={this.zoomOut}/>
            </Toolbar>
            <Panel center middle scroll>{canvas}</Panel>
            <Toolbar right top>
                <button onClick={()=>this.setState({showProps:true})}>props</button>
                <button onClick={()=>this.setState({showProps:false})}>search</button>
            </Toolbar>

            <Panel scroll right>{this.renderSidePanel()}</Panel>
            <Toolbar right bottom></Toolbar>

        </GridEditorApp>
    }

    renderSidePanel() {
        if(this.state.showProps) {
            return <PropSheet provider={this.props.provider}/>
        } else {
            return <div>search panel</div>
        }
    }
}