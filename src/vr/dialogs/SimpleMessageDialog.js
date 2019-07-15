import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
import {Dialog} from 'react-visual-editor-framework'

export class SimpleMessageDialog extends Component {
    okay = () => {
        DialogManager.hide()
    }

    render() {
        return <Dialog visible={true} onScrimClick={this.okay}>
            <header>Property Error</header>
            <section>
                <p>{this.props.text}</p>
            </section>
            <footer>
                <button onClick={this.okay}>dismiss</button>
            </footer>
        </Dialog>
    }

}
