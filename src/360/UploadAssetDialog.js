import React, {Component} from 'react'
import {DialogManager, Dialog, HBox, VBox} from 'appy-comps'

const USETYPES = {
    NONE:'none',
    IMAGE2D:'image2d',
    IMAGE360:'image360',
    IMAGE180:'image180',
}

const PREVIEW_TYPE = {
    IMAGE:'image',
    AUDIO:'audio'
}

export default class UploadAssetDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            file: null,
            title: 'unnamed asset',
            assetType:'',
            assetSubtype:'',
            originalFilename:'',
            lastModified: new Date(0),
            fileSize:0,
            previewType:'',
            previewData:null,
            usetype:'none',
            origin_author: 'unknown',
            origin_infourl:'',
            origin_license:'unknown',
        }
    }
    chooseFile = (e) => {
        const file = e.target.files[0]
        const mimeType = file.type.split('/')
        if(mimeType[0] === 'image') {
            this.loadImagePreview(file)
        }
        if(mimeType[0] === 'audio') {
            this.loadAudioPreview(file)
        }
        this.setState({
            file:file,
            assetType: mimeType[0],
            assetSubtype: mimeType[1],
            originalFilename: file.name,
            lastModified: new Date(file.lastModified),
            fileSize:file.size,
        })
    }
    editedName = (e) => this.setState({title:e.target.value})
    editedOriginAuthor = (e) => this.setState({origin_author:e.target.value})
    editedOriginInfourl = (e) => this.setState({origin_infourl:e.target.value})
    editedOriginLicense = (e) => this.setState({origin_license:e.target.value})
    uploadFile = () => {
        this.props.provider.uploadFile(this.state.file).then((resource)=>{
            const info = {
                usetype:this.state.usetype,
            }
            if(this.state.previewType === PREVIEW_TYPE.IMAGE) {
                info.width = this.state.naturalWidth
                info.height = this.state.naturalHeight
            }
            if(this.state.previewType === PREVIEW_TYPE.AUDIO) {
                info.duration = this.state.naturalDuration
            }
            const asset = this.props.provider.createAssetWithInfo({
                id:resource.id,
                title:this.state.title,
                assetType:this.state.assetType,
                assetSubtype:this.state.assetSubtype,
                originalFilename:this.state.originalFilename,
                lastModified:this.state.lastModified,
                fileSize:this.state.fileSize,
                author:this.state.origin_author,
                infourl:this.state.origin_infourl,
                license:this.state.origin_license,
                info: info,
            })
            this.props.provider.appendChild(this.props.provider.getAssetsRoot(),asset)
            this.props.provider.setSelectedObject(asset)
            DialogManager.hide()
        })
    }
    cancel = () =>  DialogManager.hide()
    render() {
        return <Dialog visible={true}>
            <header>Upload an Image or Audio File</header>
            <VBox>
                <HBox>
                    <label>Name:</label>
                    <input type="text" value={this.state.title} onChange={this.editedName}/>
                </HBox>
                <HBox>
                    <label>File:</label>
                    <input type="file" onChange={this.chooseFile}/>
                    <label>{this.state.originalFilename}</label>
                </HBox>
                <HBox>
                    <label>Author</label>
                    <input type="text" value={this.state.origin_author} onChange={this.editedOriginAuthor}/>
                </HBox>
                <HBox>
                    <label>Info URL</label>
                    <input type="text" value={this.state.origin_infourl} onChange={this.editedOriginInfourl}/>
                </HBox>
                <HBox>
                    <label>License</label>
                    <input type="text" value={this.state.origin_license} onChange={this.editedOriginLicense}/>
                </HBox>
            </VBox>

            {this.renderInfo()}

            {this.renderPreview()}

            <footer>
                <button onClick={this.cancel}>cancel</button>
                <button onClick={this.uploadFile}>upload</button>
            </footer>
        </Dialog>
    }

    renderInfo() {
        if(!this.state.file) return <div>no info</div>
        return <VBox>
            <HBox><label>Original Filename:</label><b>{this.state.originalFilename}</b></HBox>
            <HBox><label>Type:</label><b>{this.state.assetType}</b></HBox>
            <HBox><label>Subtype:</label><b>{this.state.assetSubtype}</b></HBox>
            <HBox><label>Last modified:</label><b>{this.state.lastModified.toDateString()}</b></HBox>
            <HBox><label>File size:</label><b>{this.state.fileSize} bytes</b></HBox>
        </VBox>
    }

    renderPreview() {
        if(!this.state.previewData) return <div>no preview</div>
        if(this.state.previewType === PREVIEW_TYPE.IMAGE ) {
            return <VBox>
                <HBox><label>Size:</label><b>{this.state.naturalWidth} x {this.state.naturalHeight}</b></HBox>
                <img src={this.state.previewData} style={{maxHeight: '300px', maxWidth: '300px'}}/>
            </VBox>
        }
        if(this.state.previewType === PREVIEW_TYPE.AUDIO) {
            return <VBox>audio
                <HBox>
                    <label>duration</label>
                    <b>{this.state.naturalDuration} seconds</b>
                </HBox>
                <audio controls src={this.state.previewData}/>
            </VBox>
        }
        return <VBox>nothing</VBox>
    }

    loadImagePreview(file) {
        const reader = new FileReader()
        reader.onload = (e) =>{
            this.setState({
                previewType:PREVIEW_TYPE.IMAGE,
                previewData:e.target.result,
            })
            const img = new Image()
            img.onload = () => {
                this.setState({
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                })
            }
            img.src = e.target.result
        }
        reader.readAsDataURL(file)
    }

    loadAudioPreview(file) {
        const reader = new FileReader()
        reader.onload = (e) =>{
            this.setState({
                previewType:PREVIEW_TYPE.AUDIO,
                previewData:e.target.result,
            })
            const audio = new Audio(e.target.result)
            audio.addEventListener('loadeddata',()=>{
                this.setState({
                    naturalDuration:audio.duration
                })
            })
        }
        reader.readAsDataURL(file)
    }
}

