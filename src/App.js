import React, {Component} from 'react'
// import './App.css'
import VREditor from './vr/VREditor'
import {ImmersivePlayer} from './vr/ImmersivePlayer'

export default class App extends Component {
    getApp() {
            if(this.props.options.mode === 'play') {
                return <ImmersivePlayer options={this.props.options}/>
            }
            this.provider = new VREditor(this.props.options)
            return this.provider.getApp()
        }

    render() {
        return this.getApp()
    }
}



