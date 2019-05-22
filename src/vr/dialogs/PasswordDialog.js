import React, {Component} from 'react'
import {DialogManager, HBox, VBox} from 'appy-comps'
import {AuthModule} from '../AuthModule'
import {Dialog} from '../../common/Dialog'
import {Spacer} from '../../common/GridEditorApp'

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
    keyDown = (e) => {
        if(e.key === 'Enter') this.okay()
    }
    render() {
        return <Dialog visible={true} onScrimClick={this.cancel} width="600px" height="auto">
            <VBox grow>
                <h3>login with the password from your env file</h3>
                <label>password</label>
                <input type={"password"} value={this.state.field}
                       onKeyDown={this.keyDown}
                       onChange={(e)=>{
                    this.setState({field:e.target.value})
                }}/>
                <HBox>
                    <Spacer/>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }
}

