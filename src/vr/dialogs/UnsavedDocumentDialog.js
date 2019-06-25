import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
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
        return <Dialog visible={true} onScrimClick={this.cancel} width="600px" height="auto">
            <header>Warning. Your document has unsaved changes.</header>
            <section>
            <p>Press cancel to go back</p>
            <p>Press continue to continue anyway and lose the unsaved changes</p>
            </section>
            <footer>
                <button onClick={this.cancel}>cancel</button>
                <button onClick={this.okay}>continue!</button>
            </footer>
        </Dialog>
    }
}

