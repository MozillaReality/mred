import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import {ToggleButton, Toolbar} from '../GridEditorApp'
import {toQueryString} from '../utils'
import {getAssetsURL, SERVER_URL_ASSETS} from '../TreeItemProvider'
import {isAudioType, isImageType} from './Common'

export class OpenAssetDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            assetList:[]
        }
    }
    componentDidMount() {
        this.props.provider.loadAssetList()
            .then((assets) => this.setState({assetList:assets}))
    }
    addAsset(info) {
        DialogManager.hide()
        console.log("adding info",info)
        if(isImageType(info.mimeType)) {
            if(!info.url) info.url = `${getAssetsURL()}${info.id}`
            return this.props.provider.addImageAssetFromExpandedURL(info.url,info.mimeType, info.title)
        }
        if(isAudioType(info.mimeType)) {
            if(!info.url) info.url = `${getAssetsURL()}${info.id}`
            return this.props.provider.addAudioAssetFromURL(info.url, info.mimeType, info.title)
        }
        console.log("can't add this type")
    }

    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
    }
    render() {
        return <Dialog visible={true}>
            <VBox grow>
                <h3>Add Asset</h3>
                <VBox scroll>
                <ul>{this.state.assetList.map((doc, i) => {
                    return <li key={i}>
                        <b>{doc.mimeType}</b> -
                        <b>{doc.title}</b>
                        <button onClick={()=>this.addAsset(doc)}>add</button>
                    </li>
                })}
                </ul>
                </VBox>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

}
