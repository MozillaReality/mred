import React, {Component} from 'react'
import {DialogManager, HBox} from 'appy-comps'
import {Dialog} from '../../common/Dialog'
import {Spacer} from '../../common/GridEditorApp'


export class SaveDocumentAsDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            newTitle:"Copy of " + props.provider.getDocTitle()
        }
    }
    edited = (e) => {
        this.setState({newTitle:e.target.value})
    }
    dismiss = () => {
        DialogManager.hide()
    }
    saveAs = () => {
        DialogManager.hide()
        this.props.provider.duplicateDocument(this.state.newTitle)
    }
    render() {
        return <Dialog visible={true} onScrimClick={this.dismiss} width="600px" height="auto">
            <header>Save Document As</header>
            <section>
                <label>title</label>
                <input type="text" value={this.state.newTitle} onChange={this.edited} style={{flex:1.0}}/>
            </section>
            <footer>
                <Spacer/>
                <button onClick={this.dismiss}>cancel</button>
                <button onClick={this.saveAs}>save as</button>
            </footer>
        </Dialog>
    }

}
