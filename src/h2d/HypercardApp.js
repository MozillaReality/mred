import React, {Component} from 'react'
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import HypercardCanvas from './HypercardCanvas'
import {GET_JSON, toQueryString} from '../utils'
import Selection from '../SelectionManager'
import PropSheet from '../PropSheet'
import {TREE_ITEM_PROVIDER} from "../TreeItemProvider";
import {HBox, VBox} from "appy-comps";

export default class HypercardApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            dirty:false,
            showBounds:false,
            scale: 0,
            sidepanel:'props'
        }
    }

    componentDidMount() {
        this.props.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, ()=> this.setDirty())
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

    addCard =   () => this.prov().appendChild(this.prov().getSceneRoot(),this.prov().createCard())
    addSquare = () => this.prov().appendChild(this.prov().findSelectedCard(),this.prov().createRect())
    addText =   () => this.prov().appendChild(this.prov().findSelectedCard(),this.prov().createText())
    addImage =  () => this.prov().appendChild(this.prov().findSelectedCard(),this.prov().createImage())
    addFont =   () => this.prov().appendFont(this.prov().createFont())

    deleteItem = () => Selection.getFullSelection().forEach((node)=>this.prov().deleteChild(node))

    toggleBounds = () => this.setState({showBounds:!this.state.showBounds})
    zoomIn = () => this.setState({scale:this.state.scale+1})
    zoomOut = () => this.setState({scale:this.state.scale-1})

    render() {
        return <GridEditorApp provider={this.prov()}>
            <Toolbar left top>
                <label>{this.prov().getTitle()}</label>
            </Toolbar>

            <Toolbar left bottom>
                <button className="fa fa-vcard" onClick={this.addCard}/>
                <button className="fa fa-square" onClick={this.addSquare}/>
                <button className="fa fa-text-width" onClick={this.addText}/>
                <button className="fa fa-image" onClick={this.addImage}/>
                <button className="fa fa-font" onClick={this.addFont}/>
                <button className="fa fa-close" onClick={this.deleteItem}/>
            </Toolbar>

            <Panel center middle scroll>
                <HypercardCanvas provider={this.prov()}
                                 showBounds={this.state.showBounds}
                                 scale={this.state.scale}/>
            </Panel>

            {this.renderSidePanel(this.state.sidepanel)}


            <Toolbar center top>
                <button className="fa fa-save" onClick={this.prov().save}/>
                <label>{this.state.dirty?"dirty":""}</label>
                <button onClick={this.toggleBounds}>{this.state.showBounds?"hide bounds":"show bounds"}</button>
                <button onClick={this.zoomIn}>zoom in</button>
                <button onClick={this.zoomOut}>zoom out</button>
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