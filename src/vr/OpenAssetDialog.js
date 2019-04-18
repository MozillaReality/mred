import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import {getAssetsURL} from '../TreeItemProvider'
import {isAudioType, isImageType, MIME_TYPES} from './Common'

export class OpenAssetDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            assetList:[]
        }
    }
    componentDidMount() {
        this.props.provider.loadAssetList()
            .then((assets) => {
                if(this.props.filter) assets = assets.filter(this.props.filter)
                this.setState({assetList:assets})
            })
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
        if(info.mimeType === MIME_TYPES.JAVASCRIPT) {
            if(!info.url) info.url = `${getAssetsURL()}${info.id}`
            return this.props.provider.addBehaviorAssetFromURL(info.url, info.mimeType, info.title)
        }
        console.log("can't add this type")
    }

    okay = () => {
        DialogManager.hide()
    }
    render() {
        return <Dialog visible={true}>
            <VBox grow>
                <h3>Add Asset</h3>
                <VBox scroll style={{ maxHeight:'60vh'}}>
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
                    <button onClick={this.okay}>close</button>
                </HBox>
            </VBox>
        </Dialog>
    }

}
