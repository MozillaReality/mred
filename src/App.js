import React, {Component} from 'react'
import './App.css'
import {PopupContainer, PopupManager, VBox} from "appy-comps"

import MetadocEditor from "./metadoc/Editor1"
import VREditor from './vr/VREditor'

export default class App extends Component {
    constructor(props) {
        super(props)
        this.providers = {}
        // this.addProvider(new Hypercard3DEditor())
        // this.addProvider(new HypercardEditor())
        // this.addProvider(new SVGEditor())
        // this.addProvider(new FamilyTree())
        // this.addProvider(new TextureEditor())
        // this.addProvider(new GLTFInspector())
        this.addProvider(new VREditor(props.options))
        this.addProvider(new MetadocEditor(props.options))
        this.state = {
            provider: this.providers.metadoc,
            providerName: 'vr',
            // selectedTool: this.providers.svg.getTools()[0]
        }
    }
    addProvider(prov) {
        this.providers[prov.getDocType()] = prov
    }

    componentDidMount() {
        let prov = 'vr'
        if(this.props.options.doctype) prov = this.props.options.doctype
        this.switchProvider(prov)
    }

    switchProvider(name) {
        let provider = this.state.provider
        if(provider) {
        }
        provider = this.providers[name]
        if(!provider) {
            console.log('couldnt find the provider for ',name)
            return
        }
        this.setState({provider: provider, providerName: name})

        provider.loadDoc(this.props.options.doc)
    }

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
        const content = this.state.provider.getApp()
        return (
            <VBox fill>
                <button
                    style={{position:'absolute',zIndex: 10,}}
                    onClick={this.showProviderList}
                    >
                    <img src="icon.png" height="20" style={{padding:'0em'}}/>
                </button>
                <div style={{position: 'relative', flex: '1'}}>{content}</div>
                <PopupContainer/>
            </VBox>
        );
    }
}



