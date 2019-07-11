import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
import {Dialog, QRCanvas} from 'react-visual-editor-framework'

export class QRDialog extends Component {

    okay = () => {
        DialogManager.hide()
    }

    render() {
        let url = null
        if(this.props.url) url = this.props.url
        let wurl = url.replace("https","wxrv")
        wurl = wurl.replace("http","wxrv")
        return <Dialog visible={true} onScrimClick={this.okay}>
                <header>{this.props.text?this.props.text:'Scan'}</header>
                <section>
                    <label><a href={url}>{url}</a></label>
                    <QRCanvas url={wurl} width={160} height={160}/>
                </section>
                <footer>
                    <button onClick={this.okay}>dismiss</button>
                </footer>
        </Dialog>
    }

}
