import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import {toQueryString} from '../../utils'

export class OpenFileDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            docList:[]
        }
    }
    componentDidMount() {
        this.props.provider.loadDocList().then((docs) => this.setState({docList:docs}))
    }
    openDoc(info) {
        DialogManager.hide()
        const opts = Object.assign({},this.props.provider.options,{
            mode:'edit',
            switcher:false,
            doc:info.id
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
                <VBox scroll style={{ maxHeight:'60vh'}}>
                    <ul>{this.state.docList.map((doc, i) => {
                        return <li key={i}>
                            <b>{doc.title}</b> <button onClick={()=>this.openDoc(doc)}>open</button>
                        </li>
                    })}
                    </ul>
                </VBox>
                <HBox>
                    <button onClick={this.cancel}>cancel</button>
                    <button onClick={this.okay}>okay</button>
                </HBox>
            </VBox>
        </Dialog>
    }

}
