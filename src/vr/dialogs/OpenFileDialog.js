import React, {Component} from 'react'
import {DialogManager} from 'appy-comps'
import {AuthModule} from '../AuthModule'
import {Dialog, toQueryString} from 'react-visual-editor-framework'


export class OpenFileDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            docList:[]
        }
    }
    refreshList = () => {
        this.props.provider.loadDocList().then((docs) => this.setState({docList:docs}))
    }
    componentDidMount() {
        this.refreshList()
    }
    generateDocUrl(doc) {
        const opts = Object.assign({},this.props.provider.options,{
            mode:'edit',
            doc:doc.id
        })
        delete opts.AuthModule
        const url = `./?${toQueryString(opts)}`
        return url
    }
    deleteDoc(info) {
        return this.props.provider.removeDoc(info).then((res)=>{
            console.log('removed?',res)
            this.refreshList()
        })
    }

    dismiss = () => {
        DialogManager.hide()
    }
    render() {
        return <Dialog visible={true} onScrimClick={this.dismiss}>
            <header>Open document</header>
            <section>
                <ul>{this.state.docList.map((doc, i) => {

                    return <li key={i}>
                        <b>{doc.title}</b>
                        <a className={"button"} href={this.generateDocUrl(doc)}>open</a>
                        {this.renderDeleteButton(doc)}
                    </li>
                })}
                </ul>
            </section>
            <footer>
                <button onClick={this.dismiss}>dismiss</button>
            </footer>
        </Dialog>
    }

    renderDeleteButton(doc) {
        if(!AuthModule.supportsDocDelete()) return ""
        return <button onClick={()=>this.deleteDoc(doc)}>delete</button>

    }

}
