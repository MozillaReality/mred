import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import {AuthModule} from '../AuthModule'

export class PasswordDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            field:""
        }
    }
    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
        AuthModule.doPasswordLogin(this.state.field)
    }
    render() {
        return <Dialog visible={true} onScrimClick={this.cancel}>
            <VBox grow>
                <h3>login with the password from your env file</h3>
                <label>password</label>
                <input type={"text"} value={this.state.field} onChange={(e)=>{
                    this.setState({field:e.target.value})
                }}/>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }
}

