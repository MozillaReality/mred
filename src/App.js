import React, {Component} from 'react'
import './App.css'
import {DialogContainer, PopupContainer, PopupManager, VBox} from "appy-comps"

import MetadocEditor from "./metadoc/Editor1"
import VREditor from './vr/VREditor'

export default class App extends Component {
    constructor(props) {
        super(props)

        this.state = {
            switcher:true,
        }
        this.providers = ['vr','metadoc']
        const sw = this.props.options.switcher
        if(typeof sw !== 'undefined' && sw === false || sw === 'false') {
            this.state.switcher = false
        }
    }

    getApp() {
        const doctype = this.props.options.doctype || "vr"
        if(doctype === 'vr') {
            this.provider = new VREditor(this.props.options)
            return this.provider.getApp()
        }
        if(doctype === 'metadoc') {
            this.provider = new MetadocEditor(this.props.options)
            return this.provider.getApp()
        }
    }


//        provider.loadDoc(this.props.options.doc)

    openNewProvider(name){
        PopupManager.hide()
        window.open(`./?mode=edit&doctype=${name}`)
    }

    showProviderList = (e) => {
        PopupManager.show(
            <VBox>
                {this.providers.map((name)=>{
                    return <button key={name} onClick={()=>this.openNewProvider(name)}>{name}</button>
                })}
            </VBox>,
            e.target
        )
    }
    render() {
        if(!this.state.switcher) return this.getApp()
        return (
            <VBox fill>
                <button
                    style={{position:'absolute',zIndex: 10,}}
                    onClick={this.showProviderList}
                    >
                    <img src="icon.png" alt="switch apps" height="20" style={{padding:'0em'}}/>
                </button>
                <div style={{position: 'relative', flex: '1'}}>{this.getApp()}</div>
                <DialogContainer/>
                <PopupContainer/>
            </VBox>
        );
    }
}



