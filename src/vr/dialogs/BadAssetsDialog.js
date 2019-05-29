import React, {Component} from 'react'
import {DialogManager, HBox, VBox} from 'appy-comps'
import {Dialog} from '../../common/Dialog'

export class BadAssetsDialog extends Component {
    dismiss = () => {
        DialogManager.hide()
    }
    render() {
        return <Dialog visible={true} onScrimClick={this.cancel}>
            <VBox grow>
                <h3>Warning. There were errors loading some assets</h3>
                <ul>
                {this.props.provider.badAssets.map((asset,i) => {
                    return <li key={i}><b>{asset.title}</b>
                        <br/>{asset.src}
                    </li>
                })}
                </ul>
                <HBox>
                    <button onClick={this.dismiss}>keep going anyway</button>
                </HBox>
            </VBox>
        </Dialog>
    }
}

