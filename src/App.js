import React, {Component} from 'react'
// import './App.css'
import VREditor from './vr/VREditor'
import {ImmersivePlayer} from './vr/ImmersivePlayer'
import {PopupManager, PopupManagerContext} from 'appy-comps'

export default class App extends Component {
    getApp() {
            if(this.props.options.mode === 'play') {
                return <ImmersivePlayer options={this.props.options}/>
            }
            this.provider = new VREditor(this.props.options)
            this.provider.popupManager = this.context
            return this.provider.getApp()
        }

    render() {
        return this.getApp()
    }
}
App.contextType = PopupManagerContext



