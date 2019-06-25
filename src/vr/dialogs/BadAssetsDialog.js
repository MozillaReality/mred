import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
import {Dialog} from '../../common/Dialog'

export class BadAssetsDialog extends Component {
    dismiss = () => {
        DialogManager.hide()
    }
    render() {
        return <Dialog visible={true} onScrimClick={this.cancel}>
            <header>Warning. There were errors loading some assets</header>
            <section>
                <ul>
                    {this.props.provider.badAssets.map((asset,i) => {
                        return <li key={i}><b>{asset.title}</b>
                            <br/>{asset.src}
                        </li>
                    })}
                </ul>
            </section>
            <footer>
                <button onClick={this.dismiss}>keep going anyway</button>
            </footer>
        </Dialog>
    }
}

