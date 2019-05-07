import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'

export class MissingDocDialog extends Component {
    constructor(props) {
        super(props)
    }

    cancel = () => {
        DialogManager.hide()
    }

    okay = () => {
        DialogManager.hide()
        this.props.provider.createNewDocument(this.props.docid)
    }

    render() {
        return <Dialog visible={true}>
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