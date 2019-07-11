import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
import {AuthModule} from '../AuthModule'
import {Dialog} from 'react-visual-editor-framework'

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
            <header>login with the password from your env file</header>
            <section>
                <label>password</label>
                <input type={"password"} value={this.state.field}
                       onKeyDown={this.keyDown}
                       onChange={(e)=>{
                    this.setState({field:e.target.value})
                }}/>
            </section>
            <footer>
                <button onClick={this.cancel}>cancel</button>
                <button onClick={this.okay}>okay</button>
            </footer>
        </Dialog>
    }
}

