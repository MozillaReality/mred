import React, {Component} from 'react'
import './App.css'
import {PopupManager} from "appy-comps"
import PropSheet from './PropSheet'
import TreeTable from "./TreeTable"
import {TREE_ITEM_PROVIDER} from './TreeItemProvider'
import {PopupContainer, HBox, VBox, HToggleGroup} from "appy-comps"

import SVGEditor from "./svg/SVGEditor"
import HypercardEditor from "./h2d/HypercardEditor"
import Hypercard3DEditor from "./h3d/Hypercard3DEditor"
import FamilyTree from "./familytree/FamilyTree"
import TextureEditor from "./texture/TextureEditor"
import {toQueryString} from './utils'
import {MenuPopup} from './GridEditorApp'
import GLTFInspector from './gltfinspector/GLTFInspector'
import {Editor360Provider} from './360/Editor360Editor'

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
        this.addProvider(new Editor360Provider())
        this.state = {
            provider: null,//this.providers.familytree,
            providerName: '360',
        }
    }
    addProvider(prov) {
        this.providers[prov.getDocType()] = prov
    }

    componentDidMount() {
        let prov = '360'
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
        if(!this.state.provider) return <h1>no provider</h1>
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



