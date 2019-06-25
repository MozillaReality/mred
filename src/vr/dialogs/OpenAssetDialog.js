import React, {Component} from 'react'
import {DialogManager, HBox, VBox} from 'appy-comps'
import {isAudioType, isGLTFType, isImageType, isVideoType} from '../Common'
import {AuthModule} from '../AuthModule'
import {
    addAudioAssetFromURL,
    addGLBAssetFromURL,
    addImageAssetFromExpandedURL,
    addVideoAssetFromURL
} from '../AssetActions'
import {Dialog} from '../../common/Dialog'

export class OpenAssetDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            assetList:[]
        }
    }
    refreshList = () => {
        this.props.provider.loadAssetList()
            .then((assets) => {
                if(this.props.filter) assets = assets.filter(this.props.filter)
                this.setState({assetList:assets})
            })
    }
    componentDidMount() {
        this.refreshList()
    }
    addAsset(info) {
        DialogManager.hide()
        if(isImageType(info.mimeType)) {
            return addImageAssetFromExpandedURL(info.id, info.url,info.mimeType, info.title, this.props.provider)
        }
        if(isAudioType(info.mimeType)) {
            return addAudioAssetFromURL(info.id, info.url, info.mimeType, info.title, this.props.provider)
        }
        if(isVideoType(info.mimeType)) {
            return addVideoAssetFromURL(info.id, info.url, info.mimeType, info.title, this.props.provider)
        }
        if(isGLTFType(info.mimeType)) {
            return addGLBAssetFromURL(info.id, info.url, info.mimeType, info.title, this.props.provider)
        }
        console.log("can't add this type",info.mimeType)
    }
    deleteAsset(info) {
        return this.props.provider.removeAssetSource(info).then((res)=>{
            console.log('removed?',res)
            this.refreshList()
        })
    }

    okay = () => {
        DialogManager.hide()
    }
    render() {
        return <Dialog visible={true} onScrimClick={this.okay}>
            <header>Add Asset</header>
            <section>
                <ul>{this.state.assetList.map((doc, i) => {
                    return <li key={i}>
                        <b>{doc.title} </b>
                        <i> {doc.mimeType}</i>
                        <button onClick={()=>this.addAsset(doc)}>add</button>
                        {this.renderDeleteButton(doc)}
                    </li>
                })}
                </ul>
            </section>
            <footer>
                <button onClick={this.okay}>close</button>
            </footer>
        </Dialog>
    }

    renderDeleteButton(doc) {
        if(!AuthModule.supportsAssetUpload()) return ""
        return <button onClick={()=>this.deleteAsset(doc)}>delete</button>

    }
}
