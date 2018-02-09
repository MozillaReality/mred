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

export default class App extends Component {
    constructor(props) {
        super(props)
        this.providers = {}
        this.addProvider(new Hypercard3DEditor())
        this.addProvider(new HypercardEditor())
        this.addProvider(new SVGEditor())
        this.addProvider(new FamilyTree())
        this.addProvider(new TextureEditor())
        this.state = {
            provider: this.providers.familytree,
            providerName: 'familytree',
            // selectedTool: this.providers.svg.getTools()[0]
        }
    }
    addProvider(prov) {
        this.providers[prov.getDocType()] = prov
    }

    propertyChanged = (prop) => {
        this.setState({root: this.state.provider.getSceneRoot()})
    }

    structureChanged = (prop) => {
        console.log("the structure changed");
        this.setState({root: this.state.provider.getSceneRoot()})
    }
    componentDidMount() {
        let prov = 'hypercard-3d'
        if(this.props.options.doctype) prov = this.props.options.doctype
        this.switchProvider(prov)
    }

    switchProvider(name) {
        let provider = this.state.provider
        if(provider) {
            provider.off(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, this.propertyChanged)
            provider.off(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
        }
        console.log("switching to provider",name)
        provider = this.providers[name]
        if(!provider) {
            console.log('couldnt find the provider for ',name)
            return
        }
        this.setState({provider: provider, root: provider.getSceneRoot(), providerName: name})
        provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, this.propertyChanged)
        provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
        provider.loadDoc(this.props.options.doc)
    }


    renderProviderList() {
        return <HBox className="toolbar" style={{border:'1px solid #909090', borderWidth:"0 0 1px 0"}}>
            <img src="icon.png" height="20" style={{padding:'0.25em'}}/>
            <label>General Ed</label>

            {Object.keys(this.providers).map((name)=>{
            return <button key={name} onClick={()=>this.switchProvider(name)}>{name}</button>
        })}</HBox>
    }
    render() {
        console.log("using the provider",this.state.provider.getDocType())
        const content = this.state.provider.getApp()
        return (
            <VBox fill>
                {this.renderProviderList()}
                <div style={{position: 'relative', flex: '1'}}>
                    {content}
                </div>
                <PopupContainer/>
            </VBox>
        );
    }
}



