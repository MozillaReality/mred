import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import QRCanvas from '../../common/QRCanvas'

export class QRDialog extends Component {

    okay = () => {
        DialogManager.hide()
    }

    render() {
        let url = document.documentURI
        url = url.replace("https","wxrv")
        url = url.replace("http","wxrv")
        console.log("URL is",url)
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
