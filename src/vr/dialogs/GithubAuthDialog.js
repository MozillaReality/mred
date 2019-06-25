import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
import {AuthModule} from '../AuthModule'
import {getLoginURL} from '../../TreeItemProvider'
import {Dialog} from '../../common/Dialog'

export class GithubAuthDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data:null
        }
    }
    componentDidMount() {
        console.log("opening dialog")
        AuthModule.getJSON(getLoginURL()).then(data => {
            console.log("got the data",data)
            this.setState({data:data})
        })
    }

    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
        console.log("opening window with the data",this.state.data)
        AuthModule.login(this.state.data)
    }
    render() {
        return <Dialog visible={true} onScrimClick={this.cancel}>
            <header>Github Auth</header>
            <section>
                <p>To log into MrEd you need a github account. Press the button
                below to log into github and approve MrEd's access. The app will only use
                Github for authentication. It does not have access to any of your projects or code.
                </p>
                <button onClick={this.okay}>Open Github</button>
            </section>
            <footer>
                <button onClick={this.cancel}>cancel</button>
            </footer>
        </Dialog>
    }
}

