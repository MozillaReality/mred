import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import {listToArray} from '../syncgraph/utils'

export class AddImageAssetDialog extends Component {
    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
        listToArray(this.fileinput.files).forEach(file => {
            this.props.provider.addImageAssetFromFile(file)
        })
    }

    render() {
        return <Dialog visible={true}>
            <VBox>
                <h3>add image to assets</h3>
                <input type="file" ref={(obj) => this.fileinput = obj} onChange={this.selectedFile}/>
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
