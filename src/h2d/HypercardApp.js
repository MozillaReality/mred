import React, {Component} from 'react'
import GridEditorApp, {Panel, Spacer, Toolbar} from '../GridEditorApp'
import HypercardCanvas from './HypercardCanvas'
import {GET_JSON, toQueryString} from '../utils'
import Selection from '../SelectionManager'
import PropSheet from '../PropSheet'
import {TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import {HBox, PopupManager, VBox} from 'appy-comps'
import InputManager from '../common/InputManager'
import UndoManager from '../common/UndoManager'
import {BLOCK_STYLES} from './HypercardEditor'

export default class HypercardApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            dirty:false,
            showBounds:false,
            scale: 0,
            sidepanel:'props'
        }
        this.im = new InputManager()
        this.im.addKeyBinding({
            id:'save',
            key:InputManager.KEYS.S,
            modifiers:[InputManager.MODIFIERS.COMMAND]
        })
        this.im.addListener('save',this.save)
        this.im.addKeyBinding({ id:'undo', key:InputManager.KEYS.Z,  modifiers:[InputManager.MODIFIERS.COMMAND]})
        this.im.addListener('undo',this.undo)
        this.im.addKeyBinding({ id:'redo', key:InputManager.KEYS.Z,
            modifiers:[InputManager.MODIFIERS.COMMAND, InputManager.MODIFIERS.SHIFT]})
        this.im.addListener('redo',this.redo)

        this.uman = new UndoManager(this.prov())
    }

    componentDidMount() {
        this.im.attachKeyEvents(document)
        this.props.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, ()=> this.setDirty())
        this.props.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_ADDED, ()=> this.setDirty())
        this.props.provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, ()=> this.setDirty())
        this.props.provider.on(TREE_ITEM_PROVIDER.SAVED, ()=> this.clearDirty())
        this.props.provider.on(TREE_ITEM_PROVIDER.CLEAR_DIRTY, ()=> this.clearDirty())
    }
    setDirty = () => {
        if(this.state.dirty === false) this.setState({dirty:true})
        if(this.dirtyTimeout) clearTimeout(this.dirtyTimeout)
        //save every 5 minutes
        this.dirtyTimeout = setTimeout(this.checkDirty,5*60*1000)
    }
    checkDirty = () => {
        if(this.state.dirty) {
            this.props.provider.save().then(()=>{
                console.log("successfully saved")
            })
        }

    }

    prov = () => this.props.provider
    clearDirty = () => (this.state.dirty === true)?this.setState({dirty:false}):""

    createPopupAction = (act,title) => {
        return <button onClick={(e)=>{
            PopupManager.hide()
            act(e)
        }}>{title}</button>
    }
    showCardMenu = (e) => {
        PopupManager.show(<VBox>
            {this.createPopupAction(this.addCard,'empty')}
            {this.createPopupAction(this.addTitleSubtitleCard,'Title & Subtitle')}
            {this.createPopupAction(this.addTitleCenterCard,'Title Center')}
            {this.createPopupAction(this.addStandardCard,'Title & Bullets')}
        </VBox>, e.target)
    }
    addCard =   () => {
        const card = this.prov().createCard()
        this.prov().appendChild(this.prov().getSceneRoot(),card)
        Selection.setSelection(card)
    }
    addTitleSubtitleCard = () => {
        const prov = this.prov()
        const card = prov.createCard()
        const root = prov.getSceneRoot()
        const title = prov.createText()
        title.blockStyle = BLOCK_STYLES.TITLE
        title.text = "The Title"
        title.w = 1280-200
        title.h = 150
        title.x = 100
        title.y = 250
        prov.appendChild(card,title)

        const subtitle = prov.createText()
        subtitle.blockStyle = BLOCK_STYLES.SUBTITLE
        subtitle.text = "Subtitle"
        subtitle.w = 1280-200
        subtitle.h = 100
        subtitle.x = 100
        subtitle.y = 400
        prov.appendChild(card,subtitle)

        prov.appendChild(root,card)
        Selection.setSelection(card)
    }
    addTitleCenterCard = () => {
        const prov = this.prov()
        const card = prov.createCard()
        const root = prov.getSceneRoot()
        const title = prov.createText()
        title.blockStyle = BLOCK_STYLES.TITLE
        title.text = "The Title"
        title.w = 1280-200
        title.h = 100
        title.x = 100
        title.y = 275
        prov.appendChild(card,title)

        prov.appendChild(root,card)
        Selection.setSelection(card)
    }
    addStandardCard = () => {
        const prov = this.prov()
        const card = prov.createCard()
        const root = prov.getSceneRoot()
        const header = prov.createText()
        header.blockStyle = BLOCK_STYLES.HEADER
        header.text = "card header"
        header.w = 1280-200
        header.h = 60
        header.x = 100
        header.y = 100
        prov.appendChild(card,header)

        const body = prov.createText()
        body.blockStyle = BLOCK_STYLES.LIST
        body.text = "some body\ntext"
        body.w = 1280-200
        body.h = 400
        body.x = 100
        body.y = 200
        prov.appendChild(card,body)

        prov.appendChild(root,card)
        Selection.setSelection(card)
    }
    addSquare = () => this.prov().appendChild(this.prov().findSelectedCard(),this.prov().createRect())
    addText =   () => this.prov().appendChild(this.prov().findSelectedCard(),this.prov().createText())
    addImage =  () => this.prov().appendChild(this.prov().findSelectedCard(),this.prov().createImage())
    addFont =   () => this.prov().appendFont(this.prov().createFont())

    deleteItem = () => Selection.getFullSelection().forEach((node)=>this.prov().deleteChild(node))

    toggleBounds = () => this.setState({showBounds:!this.state.showBounds})
    zoomIn = () => this.setState({scale:this.state.scale+1})
    zoomOut = () => this.setState({scale:this.state.scale-1})

    save = () => this.prov().save()
    undo = () => this.uman.undo()
    redo = () => this.uman.redo()

    render() {
        return <GridEditorApp provider={this.prov()}>
            <Toolbar left top>
                <label>{this.prov().getTitle()}</label>
            </Toolbar>

            <Toolbar left bottom>
                <button className="fa fa-vcard" onClick={this.showCardMenu}/>
                <button className="fa fa-font" onClick={this.addFont}/>
            </Toolbar>

            <Panel center middle scroll>
                <HypercardCanvas provider={this.prov()}
                                 showBounds={this.state.showBounds}
                                 scale={this.state.scale}
                                 undoManager={this.uman}
                />
            </Panel>

            {this.renderSidePanel(this.state.sidepanel)}


            <Toolbar center top>
                <button className="fa fa-square" onClick={this.addSquare}/>
                <button className="fa fa-text-width" onClick={this.addText}/>
                <button className="fa fa-image" onClick={this.addImage}/>
                <button className="fa fa-close" onClick={this.deleteItem}/>
                <Spacer/>
                <button className="fa fa-save" onClick={this.save} disabled={!this.state.dirty}/>
                <button onClick={this.toggleBounds}>{this.state.showBounds?"hide bounds":"show bounds"}</button>
                <button onClick={this.zoomIn} className="fa fa-plus-circle"/>
                <button onClick={this.zoomOut} className="fa fa-minus-circle"/>
                <button className="fa fa-undo" onClick={this.undo}>undo</button>
                <button className="fa fa-repeat" onClick={this.redo}>redo</button>
            </Toolbar>

            <Toolbar right top>
                <button onClick={()=>this.setState({sidepanel:'props'})}>Properties</button>
                <button onClick={()=>this.setState({sidepanel:'clipart'})}>Clip Art</button>
            </Toolbar>
            <Toolbar right bottom/>

        </GridEditorApp>
    }
    renderSidePanel(sidepanel) {
        if(sidepanel === 'clipart') {
            return <Panel scroll right>
                <ClipartSearchPanel provider={this.props.provider}/>
            </Panel>
        }
        if(sidepanel === 'props') {
            return <Panel scroll right>
                <PropSheet provider={this.prov()}/>
            </Panel>
        }
        return <Panel scroll right>empty</Panel>
    }
}

class ClipartSearchPanel extends Component {
    constructor(props) {
        super(props)
        this.state = {
            query:'cat',
            results:[]
        }
    }
    edited = (e) => {
        this.setState({query:e.target.value})
    }
    doSearch = () => {
        console.log("searching for ",this.state.query)
        GET_JSON(`https://openclipart.org/search/json/?query=${this.state.query}`).then((res)=> {
            console.log("got the result", res)
            if (res.msg !== 'success') {
                console.log("not a success!")
                return;
            }

            console.log("total result count", res.info.results, 'cross pages', res.info.pages)
            res.payload.forEach((item) => console.log(item))
            this.setState({results:res.payload})
        })
    }
    render() {
        return <VBox>
            <HBox><input type="text" value={this.state.query} onChange={this.edited}/><button onClick={this.doSearch}>search</button></HBox>
            <ul>
                {this.state.results.map((res,i)=><ClipartResult result={res} key={i} provider={this.props.provider}/>)}
            </ul>
        </VBox>
    }
}

class ClipartResult extends Component {
    addToDocument = () => {
        const prov = this.props.provider;
        const url = this.props.result.svg.png_2400px
        prov.appendChild(prov.findSelectedCard(),prov.createImageFromURL(url))
    }
    render() {
        const res = this.props.result;
        return <li>
            {res.title}
            {res.svg_filesize}
            <a href={res.svg.url}>web</a>
            <button className="fa fa-plus-circle" onClick={this.addToDocument}>add</button>
            <br/>
            <img src={res.svg.png_thumb} width='100px'/>
        </li>
    }
}