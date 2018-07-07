import React, {Component} from 'react'
import {Toolbar, Panel, Spacer} from '../GridEditorApp'
import TreeTable from '../TreeTable'
import {DialogManager, DialogContainer, Dialog, HBox, VBox} from "appy-comps"
import GridEditorApp from '../GridEditorApp'
import Editor360Canvas2D from './Editor360Canvas2D'
import PropSheet from '../PropSheet'
import {SERVER_URL_ASSETS} from '../TreeItemProvider'

export default class App360 extends Component {
    constructor(props) {
        super(props)
    }
    prov = () => this.props.provider

    render() {
        return <GridEditorApp provider={this.prov()}>
            <Toolbar left top>
                <label>{this.prov().getTitle()}</label>
            </Toolbar>
            <Panel scroll left middle>
                <TreeTable root={this.prov().getSceneRoot()} provider={this.prov()}/>
            </Panel>

            <Toolbar left bottom>
                <button className="fa fa-globe" onClick={this.addScene}>Scene</button>
                <button className="fa fa-image" onClick={this.upload2DImage}>2D</button>
                <button className="fa fa-image" onClick={this.upload360Image}>360</button>
                <button className="fa fa-file-audio-o" onClick={this.uploadSound}>Sound</button>
                <button className="fa fa-close" onClick={this.deleteSelectedAsset}>asset</button>
            </Toolbar>


            <Toolbar center top>
                <button className="fa fa-laptop" onClick={this.addLayer}/>
                <button className="fa fa-square" onClick={this.addCube}/>
                <button className="fa fa-text-width" onClick={this.addText}/>
                <button className="fa fa-image" onClick={this.addImageObject}/>
                <button className="fa fa-imdb" onClick={this.add360BG}/>
                <button className="fa fa-battery" onClick={this.addNavAction}/>
                <button className="fa fa-close" onClick={this.deleteObject}/>
                <Spacer/>
                {/*<button className="fa fa-save" onClick={this.save} disabled={!this.state.dirty}/>*/}
                <button className="fa fa-undo" onClick={this.undo}/>
                <button className="fa fa-repeat" onClick={this.redo}/>
                <Spacer/>
                <button className="fa fa-play" onClick={this.preview}/>
                <button className="fa fa-save" onClick={this.save}/>
            </Toolbar>

            <Panel center middle scroll>
                <Editor360Canvas2D provider={this.prov()}/>
            </Panel>



            <Toolbar right top>
                <label>Properties</label>
            </Toolbar>
            <Panel scroll right>
                <PropSheet provider={this.prov()}/>
            </Panel>
            <DialogContainer/>
        </GridEditorApp>
    }

    addScene  = () => this.prov().appendChild(this.prov().getScenesRoot(),this.prov().createScene())
    addLayer  = () => this.prov().appendChild(this.prov().findSelectedScene(),this.prov().createLayer())
    addCube   = () => this.prov().appendChild(this.prov().findSelectedLayer(),this.prov().createCube())
    addText   = () => this.prov().appendChild(this.prov().findSelectedLayer(),this.prov().createText())
    addNavAction = () => this.prov().appendChild(this.prov().findSelectedPrimitive(), this.prov().createNavAction())
    addImageObject   = () => this.prov().appendChild(this.prov().findSelectedLayer(),this.prov().createImageObject())
    deleteObject = () => this.prov().deleteChild(this.prov().findSelectedNode())
    add360BG   = () => this.prov().appendChild(this.prov().findSelectedLayer(),this.prov().create360Background())
    preview   = () => window.open(`./?mode=preview&doctype=${this.prov().getDocType()}&doc=${this.prov().getDocId()}`)
    save = () => this.prov().save()
    upload2DImage  = () => DialogManager.show(<UploadAssetDialog provider={this.prov()} title={"Upload 2D Image"} resourceType="2d-image"/>)
    uploadSound  = () => DialogManager.show(<UploadAssetDialog provider={this.prov()} title={"Upload Sound"} resourceType="audio"/>)
    upload360Image = () => DialogManager.show(<UploadAssetDialog provider={this.prov()} title={"Upload 360 Image"} resourceType="360-image"/>)
    deleteSelectedAsset = () => this.prov().deleteChild(this.prov().findSelectedAsset())

}


class UploadAssetDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            file: null,
            filename:'',
            name: ''
        }
    }
    choseFile = (e) => {
        this.setState({
            file:e.target.files[0],
            filename:e.target.files[0].name
        })
    }
    editedName = (e) => {
        this.setState({name:e.target.value})
    }
    uploadFile = () => {
        this.props.provider.uploadFile(this.state.file).then((resource)=>{
            const asset = this.props.provider.createAssetWithInfo({
                id:resource.id,
                title:this.state.name,
                resourceType:this.props.resourceType
            })
            this.props.provider.appendChild(this.props.provider.getAssetsRoot(),asset)
            DialogManager.hide()
        })
    }
    cancel = () => {
        DialogManager.hide()
    }
    render() {
        return <Dialog visible={true}>
            <header>{this.props.title}</header>
            <VBox>
                <HBox>
                    <label>name</label>
                    <input type="text" value={this.state.name} onChange={this.editedName}/>
                </HBox>
                <HBox>
                    <label>file</label>
                    <input type="file" onChange={this.choseFile}/>
                    <label>{this.state.filename}</label>
                </HBox>
            </VBox>

            <footer>
                <button onClick={this.cancel}>cancel</button>
                <button onClick={this.uploadFile}>upload</button>
            </footer>
        </Dialog>
    }
}
