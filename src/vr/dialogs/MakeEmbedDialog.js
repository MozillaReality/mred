import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
import {Dialog} from 'react-visual-editor-framework'

export class MakeEmbedDialog extends Component {

    okay = () => {
        DialogManager.hide()
    }

    generateEmbedURL() {
        return `http://localhost:3000/?mode=embed-view&doctype=${this.props.provider.getDocType()}&doc=${this.props.provider.getDocId()}&switcher=false`
    }

    render() {
        return <Dialog visible={true}>
            <header>add image to assets</header>
            <section>
                <label>URL</label>
                <input type="text" value={this.generateEmbedURL()}/>
            </section>
            <footer>
                <button onClick={this.okay}>okay</button>
            </footer>
        </Dialog>
    }

}
