import React, {Component} from 'react'
import './App.css'
import {PopupContainer, PopupManager, VBox} from "appy-comps"
import {Editor360Provider} from './360/Editor360Editor'

export default class App extends Component {
    constructor(props) {
        super(props)
        this.providers = {}
        this.addProvider(new Editor360Provider())
        this.state = {
            provider: null,
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
                <div style={{position: 'relative', flex: '1'}}>{content}</div>
                <PopupContainer/>
            </VBox>
        );
    }
}



