import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
import {listToArray} from '../../syncgraph/utils'
import {Dialog} from 'react-visual-editor-framework'

export class AddGLTFAssetDialog extends Component {
    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
        listToArray(this.fileinput.files).forEach(file => {
            console.log("got the file", file)
        })
    }

    render() {
        return <Dialog visible={true} onScrimClick={this.cancel}>
            <header>add GLTF file assets</header>
            <section>
                <p>
                    chose <b>the directory</b> containing the GLTF file
                </p>
                <input type="file" ref={(obj) => this.fileinput = obj} onChange={this.selectedFile} multiple={true}
                       webkitdirectory="true"/>
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
