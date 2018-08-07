import React, {Component} from 'react'
import {Toolbar, Panel, Spacer, MenuPopup} from '../GridEditorApp'
import TreeTable from '../TreeTable'
import {DialogManager, DialogContainer, Dialog, HBox, VBox, PopupManager} from "appy-comps"
import GridEditorApp from '../GridEditorApp'
import Editor360Canvas2D from './Editor360Canvas2D'
import PropSheet from '../PropSheet'
import {SERVER_URL, SERVER_URL_ASSETS, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import InputManager from "../common/InputManager";
import UndoManager from "../common/UndoManager";
import {PRIMS, TYPES} from "./Editor360Editor";
import ReactGA from 'react-ga'
import JSZip from "jszip"
import {saveAs} from "file-saver/FileSaver"
import UploadAssetDialog from './UploadAssetDialog'

export default class App360 extends Component {
    constructor(props) {
        super(props)
        this.state = {}

        this.im = new InputManager();
        this.im.addKeyBinding({
            id:'save',
            key:InputManager.KEYS.S,
            modifiers:[InputManager.MODIFIERS.COMMAND]
        })
        this.im.addListener('save',this.save)
        this.uman = new UndoManager(this.prov())
        ReactGA.pageview('/360/')
        this.props.provider.on(TREE_ITEM_PROVIDER.SAVED, ()=> this.notify('saved'))
    }

    componentDidMount() {
        this.im.attachKeyEvents(document)
    }

    prov = () => this.props.provider
    notify = (txt) => {
        this.setState({notification:txt})
        setTimeout(()=>this.setState({notification:''}),1000)
    }
    renderNotification() {
        if(!this.state.notification || this.state.notification.trim() === '') return <div/>
        return <div style={{
            position:'absolute',
            bottom:'10px',
            left:'10px',
            backgroundColor:'rgba(0,0,0,0.6)',
            borderRadius:'1em',
            color:'white',
            fontSize:'24pt',
            padding:'1em'
        }}>{this.state.notification}</div>
    }

    render() {
        return <GridEditorApp provider={this.prov()}>
            <Toolbar left top>
                <label>{this.prov().getTitle()}</label>
            </Toolbar>
            <Panel scroll left middle>
                <TreeTable root={this.prov().getSceneRoot()} provider={this.prov()}/>
            </Panel>


            <Toolbar center top>
                <button className="fa fa-plus" onClick={this.showAddPopupMenu}>Object</button>
                <button className="fa fa-plus" onClick={this.showAddAssetMenu}>Asset</button>
                <button className="fa fa-plus" onClick={this.showAddActionMenu}>Action</button>
                <button className="fa fa-close" onClick={this.deleteObject}/>
                <Spacer/>
                <button className="fa fa-undo" onClick={this.undo}/>
                <button className="fa fa-repeat" onClick={this.redo}/>
                <Spacer/>
                <button className="fa fa-play" onClick={this.preview}/>
                <button className="fa fa-save" onClick={this.save}/>
                <button className="fa fa-download" onClick={this.exportProject}/>
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
            {this.renderNotification()}
            <DialogContainer/>
        </GridEditorApp>
    }
    showAddPopupMenu = (e) => {
        const acts = Object.keys(PRIMS).map((key) => {
            const info = PRIMS[key]
            return {
                title:info.title,
                icon:info.icon,
                fun:() => {
                    const layer = this.prov().findSelectedLayer()
                    if(!layer) return this.showWarning("3D Objects can only be added to layers.")
                    const obj = info.make(this.prov())
                    this.prov().appendChild(layer,obj)
                    this.prov().setSelectedObject(obj)
                }
            }
        })
        acts.push({
            title:'Layer',
            icon:'window-maximize',
            fun: this.addLayer
        })
        acts.push({
            title:'Scene',
            icon:'globe',
            fun: this.addScene
        })
        PopupManager.show(<MenuPopup actions={acts}/>,e.target)
    }
    showAddActionMenu = (e) => {
        const acts = [
            {
                title:'Go to...',
                icon:'arrow-right',
                fun: this.addNavAction
            },
            {
                title:'Play Sound',
                icon:'play',
                fun: this.addPlaySoundAction
            }
        ]
        PopupManager.show(<MenuPopup actions={acts}/>,e.target)
    }
    showAddAssetMenu = (e) => {
        const acts = [
            {
                title: 'Local Image or Sound',
                icon:'file-o',
                fun: this.uploadLocal
            },
            {
                title:'GLTF from URL',
                icon:'file-text-o',
                fun: this.addGLTFURLAsset,
            }
        ]
        PopupManager.show(<MenuPopup actions={acts}/>,e.target)
    }

    addScene  = () => {
        const scene = this.prov().createScene()
        this.prov().appendChild(this.prov().getScenesRoot(),scene)
        this.prov().setSelectedObject(scene)
    }
    addLayer  = () => {
        const layer = this.prov().createLayer()
        this.prov().appendChild(this.prov().findSelectedScene(),layer)
        this.prov().setSelectedObject(layer)
    }
    addAction = (action) => {
        const prim = this.prov().findSelectedPrimitive()
        if(!prim) return this.showWarning('Actions can only be added to 3d objects')
        this.prov().appendChild(prim, action)
        this.prov().setSelectedObject(action)
    }
    addNavAction = () => this.addAction(this.prov().createNavAction())
    addPlaySoundAction = () => this.addAction(this.prov().createPlaySoundAction())
    deleteObject = () => this.prov().deleteChild(this.prov().findSelectedNode())
    preview   = () => {
        ReactGA.event({action:'preview',doc:this.prov().getDocId()})
        const win = window.open()
        const location = `./viewer.html?mode=preview&doctype=${this.prov().getDocType()}&doc=${this.prov().getDocId()}`
        this.save().then(()=> win.location = location)
    }
    save = () => this.prov().save()
    exportProject = () => {
        this.prov().save().then(()=>{
            const zip = new JSZip()
            const folder = zip.folder('project')

            function fetchAsBlob(url) {
                return fetch(url).then(r => {
                    if (r.status === 200) return r.blob()
                    return Promise.reject(new Error(r.statusText))
                })
            }

            this.prov().getAssetsRoot().children.map(asset => {
                let url = null
                if(asset.assetType === TYPES.ASSETS.MODEL && asset.assetSubtype === TYPES.ASSETS.SUBTYPES.GLTF_JSON) {
                    url = asset.url
                } else {
                    url = SERVER_URL_ASSETS+asset.assetId
                }
                const name = url.substring(url.lastIndexOf('/'))
                console.log('adding',name,url)
                folder.file(name, fetchAsBlob(url))
            })

            folder.file('viewer.html',fetchAsBlob("./viewer.html"))
            folder.file('viewer.js',fetchAsBlob("./viewer.js"))
            folder.file('doc.json',fetchAsBlob(SERVER_URL+this.prov().getDocId()))

            zip.generateAsync({type:"blob"})
                .then(blob => saveAs(blob, 'project.zip'))
                .catch(e => console.log(e));
        })
    }
    undo = () => this.uman.undo()
    redo = () => this.uman.redo()
    uploadLocal  = () => DialogManager.show(<UploadAssetDialog provider={this.prov()}/>)
    addGLTFURLAsset = () => DialogManager.show(<AddGLTFFromURLDialog provider={this.prov()}
                                                                     title={"Add a GLTF from a URL"}/>)
    showWarning = (error) => DialogManager.show(<WarningDialog error={error}/>)

}

class WarningDialog extends Component {
    constructor(props) {
        super(props)
    }
    close = () => DialogManager.hide()
    render() {
        return <Dialog visible={true}>
            <header>Warning</header>
            <VBox>
                <p>{this.props.error}</p>
            </VBox>
            <footer>
                <button onClick={this.close}>Okay</button>
            </footer>
        </Dialog>
    }
}


class AddGLTFFromURLDialog extends Component {
    constructor(props) {
        super(props);
        this.state = {
            name:'unnamed GLTF model',
            url:''
        }
    }
    editedName = (e) => this.setState({name:e.target.value})
    editedURL = (e) => this.setState({url:e.target.value})
    cancel = () => DialogManager.hide()
    add = () => {
        const asset = this.props.provider.createAssetWithURLInfo({
            assetType: TYPES.ASSETS.MODEL,
            assetSubtype:TYPES.ASSETS.SUBTYPES.GLTF_JSON,
            remote:true,
            title:this.state.name,
            url: this.state.url
        })
        this.props.provider.appendChild(this.props.provider.getAssetsRoot(),asset)
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
                    <label>URL</label>
                    <input type="text" value={this.state.url} onChange={this.editedURL}/>
                </HBox>
            </VBox>

            <footer>
                <button onClick={this.cancel}>cancel</button>
                <button onClick={this.add}>add</button>
            </footer>
        </Dialog>

    }
}