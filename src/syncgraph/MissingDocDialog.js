import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
import {Dialog} from '../common/Dialog'

export class MissingDocDialog extends Component {

    cancel = () => {
        DialogManager.hide()
    }

    okay = () => {
        DialogManager.hide()
        this.props.provider.createNewDocument(this.props.docid)
    }

    render() {
        return <Dialog visible={true} onScrimClick={this.cancel}>
                <header>Document "<b>{this.props.docid}</b>" not found</header>
                <section>
                    Create a new document?
                </section>
                <footer>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </footer>
        </Dialog>
    }

}