import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import {toQueryString} from '../../utils'
import {AuthModule} from '../AuthModule'
import {getLoginURL} from '../../TreeItemProvider'

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
        return <Dialog visible={true}>
            <VBox grow>
                <h3>Github Auth</h3>
                <p>To log into MrEd you need a github account. Press the button
                below to log into github and approve MrEd's access. The app will only use
                Github for authentication. It does not have access to any of your projects or code.
                </p>
                <button onClick={this.okay}>Open Github</button>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                </HBox>
            </VBox>
        </Dialog>
    }
}

