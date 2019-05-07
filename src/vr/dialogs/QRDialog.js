import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import QRCanvas from '../../common/QRCanvas'

export class QRDialog extends Component {
    constructor(props) {
        super(props)
    }

    okay = () => {
        DialogManager.hide()
    }

    render() {
        const url = document.documentURI
        return <Dialog visible={true}>
            <VBox grow>
                <h3>Scan</h3>
                <VBox grow>
                    <label>{url}</label>
                    <QRCanvas url={url} width={160} height={160}/>
                </VBox>
                <HBox>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

}
