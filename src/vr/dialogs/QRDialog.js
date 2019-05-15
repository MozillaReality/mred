import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import QRCanvas from '../../common/QRCanvas'

export class QRDialog extends Component {

    okay = () => {
        DialogManager.hide()
    }

    render() {
        let url = document.documentURI
        if(this.props.url) url = this.props.url
        let wurl = url.replace("https","wxrv")
        wurl = wurl.replace("http","wxrv")
        return <Dialog visible={true}>
            <VBox grow>
                <h3>{this.props.text?this.props.text:'Scan'}</h3>
                <VBox grow>
                    <label><a href={url}>{url}</a></label>
                    <QRCanvas url={wurl} width={160} height={160}/>
                </VBox>
                <HBox>
                    <button onClick={this.okay}>dismiss</button>
                </HBox>
            </VBox>
        </Dialog>
    }

}
