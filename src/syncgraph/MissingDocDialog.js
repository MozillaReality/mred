import React, {Component} from 'react'
import {DialogManager, HBox, VBox} from 'appy-comps'
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
            <VBox grow>
                <h3>Document "<b>{this.props.docid}</b>" not found</h3>
                <VBox grow>
                    Create a new document?
                </VBox>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

}