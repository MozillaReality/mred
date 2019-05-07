import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'

export class MakeEmbedDialog extends Component {

    okay = () => {
        DialogManager.hide()
    }

    generateEmbedURL() {
        return `http://localhost:3000/?mode=embed-view&doctype=${this.props.provider.getDocType()}&doc=${this.props.provider.getDocId()}&switcher=false`
    }

    render() {
        return <Dialog visible={true}>
            <VBox grow>
                <h3>add image to assets</h3>
                <VBox grow>
                    <label>URL</label>
                    <input type="text" value={this.generateEmbedURL()}/>
                </VBox>
                <HBox>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

}
