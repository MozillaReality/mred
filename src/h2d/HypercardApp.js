import React, {Component} from 'react'
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import HypercardCanvas from './HypercardCanvas'
import {toQueryString} from '../utils'
import Selection from '../SelectionManager'
import PropSheet from '../PropSheet'

export default class HypercardApp extends Component {
    constructor(props) {
        super(props)
    }
    preview = () => {
        this.props.provider.save().then(()=>{
            const query = toQueryString({
                mode:'preview',
                provider:this.state.providerName,
                doc:this.state.provider.getDocId()
            })
            window.open('./?'+query)
        })
    }

    addCard = () => {
        let card = this.props.provider.createCard();
        let root = this.props.provider.getSceneRoot()
        this.props.provider.appendChild(root,card)
    }

    addSquare = () => {
        const prov = this.props.provider
        let sel = prov.findSelectedCard()
        let rect = prov.createRect();
        prov.appendChild(sel,rect)
    }

    addText = () => {
        const prov = this.props.provider
        prov.appendChild(prov.findSelectedCard(),prov.createText())
    }

    addImage = () => {
        const prov = this.props.provider
        prov.appendChild(prov.findSelectedCard(),prov.createImage())
    }

    deleteItem = () => {
        let node = Selection.getSelection()
        const prov = this.props.provider
        prov.deleteNode(node)
    }

    render() {
        const prov = this.props.provider
        return <GridEditorApp provider={prov}>
            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>

            <Toolbar left bottom>
                <button className="fa fa-vcard" onClick={this.addCard}/>
                <button className="fa fa-square" onClick={this.addSquare}/>
                <button className="fa fa-text-width" onClick={this.addText}/>
                <button className="fa fa-image" onClick={this.addImage}/>
                <button className="fa fa-close" onClick={this.deleteItem}/>
            </Toolbar>

            <Panel center middle scroll>
                <HypercardCanvas provider={prov}/>
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>


            <Toolbar center top>
                <button className="fa fa-save" onClick={prov.save}/>
                <button className="fa fa-play-circle" onClick={this.preview}/>
            </Toolbar>

            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }
}