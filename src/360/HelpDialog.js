import React, {Component} from "react"
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
export default class HelpDialog extends Component {
    close = () => DialogManager.hide()
    render() {
        return <Dialog visible={true}>
            <header>
                <h3>Getting Started</h3>
            </header>
            <VBox>
                <ul>
                    <li>
                        <p>Add <i className="fa fa-file-text-o"></i> <b>assets</b> to your project.</p>
                    </li>
                    <li>
                        <p>Add <i className="fa fa-cube"></i> <b>objects</b> to your scenes.</p>
                    </li>
                    <li>
                        <p>Add <i className="fa fa-arrow-right"></i> <b>actions</b> to your objects.</p>
                    </li>
                    <li>
                        <p>Then <i className="fa fa-play"></i> <b>preview</b> in full 3D.</p>
                    </li>
                </ul>
            </VBox>
            <footer>
                <button onClick={this.close}>Dismiss</button>
            </footer>
        </Dialog>
    }

}