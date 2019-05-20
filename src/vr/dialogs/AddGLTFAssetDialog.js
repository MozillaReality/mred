import React, {Component} from 'react'
import {DialogManager, HBox, VBox} from 'appy-comps'
import {listToArray} from '../../syncgraph/utils'
import {Dialog} from '../../common/Dialog'

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
            <VBox>
                <h3>add GLTF file assets</h3>
                <p>
                    chose <b>the directory</b> containing the GLTF file
                </p>
                <input type="file" ref={(obj) => this.fileinput = obj} onChange={this.selectedFile} multiple={true}
                       webkitdirectory="true"/>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

    selectedFile = (e) => {
        console.log("selected a file", e.target)
    }
}
