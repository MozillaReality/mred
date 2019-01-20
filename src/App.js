import React, {Component} from 'react'
import './App.css'
import {PopupContainer, PopupManager, VBox} from "appy-comps"

import MetadocEditor from "./metadoc/Editor1"
import VREditor from './vr/VREditor'

export default class App extends Component {
    constructor(props) {
        super(props)
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
                {Object.keys(this.providers).map((name)=>{
                    return <button key={name} onClick={()=>this.openNewProvider(name)}>{name}</button>
                })}
            </VBox>,
            e.target
        )
    }
    render() {
        console.log("======== rendering top level app")
        return (
            <VBox fill>
                {/*<button*/}
                    {/*style={{position:'absolute',zIndex: 10,}}*/}
                    {/*onClick={this.showProviderList}*/}
                    {/*>*/}
                    {/*<img src="icon.png" height="20" style={{padding:'0em'}}/>*/}
                {/*</button>*/}
                <div style={{position: 'relative', flex: '1'}}>{this.getApp()}</div>
                <PopupContainer/>
            </VBox>
        );
    }
}



