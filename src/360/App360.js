import React, {Component} from 'react'
import {Toolbar, Panel, Spacer} from '../GridEditorApp'
import TreeTable from '../TreeTable'
import {DialogManager, DialogContainer, Dialog} from "appy-comps"
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
                <button className="fa fa-image" onClick={this.add2DImage}>2D</button>
                <button className="fa fa-image" onClick={this.add360Image}>360</button>
            </Toolbar>


            <Toolbar center top>
                <button className="fa fa-laptop" onClick={this.addLayer}/>
                <button className="fa fa-square" onClick={this.addCube}/>
                <button className="fa fa-text-width" onClick={this.addText}/>
                <button className="fa fa-image" onClick={this.addBGImage}/>
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

    addLayer  = () => this.prov().appendChild(this.prov().findSelectedScene(),this.prov().createLayer())
    addCube   = () => this.prov().appendChild(this.prov().findSelectedLayer(),this.prov().createCube())
    addText   = () => this.prov().appendChild(this.prov().findSelectedLayer(),this.prov().createText())
    preview   = () => window.open(`./?mode=preview&doctype=${this.prov().getDocType()}&doc=${this.prov().getDocId()}`)
    save = () => this.prov().save()
    add2DImage = () => {
        DialogManager.show(<Upload2DImageDialog provider={this.prov()}/>)
    }

}

class Upload2DImageDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            file: null,
            name: ''
        }
    }
    choseFile = (e) => {
        this.setState({
            file:e.target.files[0],
            name:e.target.files[0].name
        })
    }
    uploadFile = () => {
        this.props.provider.uploadFile(this.state.file).then((ans)=>{
            console.log("uploaded asset",ans)
            const asset = this.props.provider.create2DImageAssetWithId(ans.id)
            this.props.provider.appendChild(this.props.provider.getAssetsRoot(),asset)
            DialogManager.hide()
        })
    }
    render() {
        return <Dialog visible={true}>
            <header>upload an image</header>
            <input type="file" onChange={this.choseFile}/>
            <label>{this.state.name}</label>

            <footer>
                <button>cancel</button>
                <button onClick={this.uploadFile}>upload</button>
            </footer>
        </Dialog>
    }
}
