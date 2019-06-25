import React, {Component} from 'react'
import {DialogManager, HBox, VBox} from 'appy-comps'
import {listToArray} from '../../syncgraph/utils'
import {addGLBAssetFromFile} from '../AssetActions'
import {Dialog} from '../../common/Dialog'

export class AddGLBAssetDialog extends Component {
    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
        listToArray(this.fileinput.files).forEach(file => {
            addGLBAssetFromFile(file, this.props.provider)
        })
    }

    render() {
        return <Dialog visible={true} onScrimClick={this.cancel}>
            <header>add GLB to assets</header>
            <section>
                <p>choose a local GLB file</p>
                <input type="file" ref={(obj) => this.fileinput = obj} onChange={this.selectedFile} multiple={true}/>
            </section>
            <footer>
                <button onClick={this.cancel}>cancel</button>
                <button onClick={this.okay}>okay</button>
            </footer>
        </Dialog>
    }

    selectedFile = (e) => {
        console.log("selected a file", e.target)
    }
}
