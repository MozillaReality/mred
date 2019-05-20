import React, {Component} from 'react'
import {DialogManager, HBox, VBox} from 'appy-comps'
import {Dialog} from '../../common/Dialog'

export class UnsavedDocumentDialog extends Component {
    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
        this.props.onAnyway()
    }
    render() {
        return <Dialog visible={true} onScrimClick={this.cancel}>
            <VBox grow>
                <h3>Warning. Your document has unsaved changes.</h3>
                <p>Press cancel to go back</p>
                <p>Press continue to continue anyway and lose the unsaved changes</p>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>continue!</button>
                </HBox>
            </VBox>
        </Dialog>
    }
}

