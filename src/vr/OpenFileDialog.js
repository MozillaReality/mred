import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import {ToggleButton, Toolbar} from '../GridEditorApp'
import {toQueryString} from '../utils'

export class OpenFileDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            docList:[]
        }
    }
    componentDidMount() {
        this.props.provider.loadDocList()
            .then((docs) => this.setState({docList:docs}))
    }
    openDoc(info) {
        const opts = Object.assign({},this.props.provider.options,{
            mode:'edit',
            switcher:false,
            doc:info.doc
        })
        window.open(`./?${toQueryString(opts)}`)
    }

    cancel = () => {
        DialogManager.hide()
    }
    okay = () => {
        DialogManager.hide()
    }
    render() {
        return <Dialog visible={true}>
            <VBox grow>
                <h3>Open document</h3>
                <ul>{this.state.docList.map((doc, i) => {
                    return <li key={i}>
                        <b>{doc.title}</b> <button onClick={()=>this.openDoc(doc)}>open</button>
                    </li>
                })}
                </ul>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

}
