import React, {Component} from 'react'
import {DialogManager, HBox, VBox} from 'appy-comps'
import {Spacer} from '../../common/GridEditorApp'
import {AuthModule} from '../AuthModule'
import {Dialog} from '../../common/Dialog'

export class OpenScriptDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            scripts:[]
        }
    }
    refreshList = () => {
        this.props.provider.loadScriptList()
            .then((scripts) => this.setState({scripts:scripts}))
    }
    componentDidMount() {
        this.refreshList()
    }
    addScript(info) {
        DialogManager.hide()
        console.log("URL is",info.url)
        info.url = info.name
        console.log("Now URL is",info.url)
        const beh = this.props.provider.addBehaviorAssetFromURL(info)
        if(this.props.onAdd) this.props.onAdd(beh)
    }
    deleteScript(info) {
        return this.props.provider.removeBehaviorAssetSource(info.name)
            .then(()=> this.refreshList())
    }

    okay = () => DialogManager.hide()

    render() {
        return <Dialog visible={true} onScrimClick={this.okay}>
            <header>Choose Behavior Script</header>
            <section>
                <ul className="behaviors-list">{this.state.scripts.map((doc, i) => {
                    return <HBox key={doc.name}>
                        <VBox>
                            <div>
                                <i>{doc.name}</i> -  <b>{doc.title}</b>
                            </div>

                            <p>{doc.description}</p>
                        </VBox>
                        <Spacer/>
                        <button onClick={()=>this.addScript(doc)}>add</button>
                        {this.renderDeleteButton(doc)}
                    </HBox>
                })}
                </ul>
            </section>
            <footer>
                <button onClick={this.okay}>close</button>
            </footer>
        </Dialog>
    }

    renderDeleteButton(doc) {
        if(!AuthModule.supportsScriptEdit()) return ""
        return <button onClick={()=>this.deleteScript(doc)}>delete</button>
    }

}
