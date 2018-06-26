import React, {Component} from 'react'
import {Toolbar, Panel, Spacer} from '../GridEditorApp'
import TreeTable from '../TreeTable'
import GridEditorApp from '../GridEditorApp'
import Editor360Canvas2D from './Editor360Canvas2D'
import PropSheet from '../PropSheet'

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
                <button className="fa fa-image" onClick={this.addBGImage}>2D</button>
                <button className="fa fa-image" onClick={this.addBGImage}>360</button>
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
        </GridEditorApp>
    }

    addLayer  = () => this.prov().appendChild(this.prov().findSelectedScene(),this.prov().createLayer())
    addCube   = () => this.prov().appendChild(this.prov().findSelectedLayer(),this.prov().createCube())
    addText   = () => this.prov().appendChild(this.prov().findSelectedLayer(),this.prov().createText())
    preview   = () => window.open(`./?mode=preview&doctype=${this.prov().getDocType()}&doc=${this.prov().getDocId()}`)
    save = () => this.prov().save()

}
