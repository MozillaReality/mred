import React, {Component} from 'react'
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import {PopupManager} from "appy-comps"
import TextureEditorCanvas from './TextureEditorCanvas'
import PropSheet from '../PropSheet'
import SelectionManager from '../SelectionManager'

export default class TextureApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            scale: 1
        }
    }
    showAddPopup = (e) => {
        const prov = this.props.provider
        PopupManager.show(<div className="popup-menu">
            <button className="fa fa-plus" onClick={()=>prov.appendNode(prov.makeNodeFromTemplate('sin'))}>Sin</button>
            <button className="fa fa-plus" onClick={()=>prov.appendNode(prov.makeNodeFromTemplate('checkerboard'))}>Checkerboard</button>
            <button className="fa fa-plus" onClick={()=>prov.appendNode(prov.makeNodeFromTemplate('fillcolor'))}>Fill Color</button>
            <button className="fa fa-plus" onClick={()=>prov.appendNode(prov.makeNodeFromTemplate('fillout'))}>Fill Out</button>
            <button className="fa fa-plus" onClick={()=>prov.appendNode(prov.makeNodeFromTemplate('valueToColor'))}>Value to Color</button>
        </div>,e.target)
    }
    zoomIn  = () => this.setState({scale:this.state.scale+1})
    zoomOut = () => this.setState({scale:this.state.scale-1})
    render() {
        const prov = this.props.provider
        return <GridEditorApp provider={prov}>

            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>

            <Toolbar left bottom>
                <button className="fa fa-plus" onClick={this.showAddPopup}>block</button>
                <button className="fa fa-close" onClick={()=>prov.deleteChild(SelectionManager.getSelection())}/>
            </Toolbar>

            <Toolbar center top>
                <button className="fa fa-save" onClick={prov.save}/>
                <button className="fa fa-plus-circle" onClick={this.zoomIn}/>
                <button className="fa fa-minus-circle" onClick={this.zoomOut}/>
            </Toolbar>

            <Panel center middle scroll>
                <TextureEditorCanvas provider={prov} scale={this.state.scale}/>
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>

            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }

}