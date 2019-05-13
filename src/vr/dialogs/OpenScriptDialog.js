import React, {Component} from 'react'
import {Dialog, DialogManager, HBox, VBox} from 'appy-comps'
import {getScriptsURL} from '../../TreeItemProvider'
import {Spacer} from '../../common/GridEditorApp'
import {AuthModule} from '../AuthModule'

export class OpenScriptDialog extends Component {
    constructor(props) {
        super(props)
        this.state = {
            scripts:[]
        }
    }
    refreshList = () => {
        this.props.provider.loadScriptList()
            .then((scripts) => {
                this.setState({scripts:scripts})
            })
    }
    componentDidMount() {
        this.refreshList()
    }
    addScript(info) {
        DialogManager.hide()
        if(!info.url) info.url = `${getScriptsURL()}${info.name}`
        const beh = this.props.provider.addBehaviorAssetFromURL(info)
        if(this.props.onAdd) this.props.onAdd(beh)
    }
    deleteScript(info) {
        return this.props.provider.removeBehaviorAssetSource(info.name).then((res)=>{
            console.log("removed?",res)
            this.refreshList()
        })
    }

    okay = () => {
        DialogManager.hide()
    }
    render() {
        return <Dialog visible={true}>
            <VBox grow>
                <h3>Choose Behavior Script</h3>
                <VBox scroll style={{ maxHeight:'60vh'}}>
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
                </VBox>
                <HBox>
                    <button onClick={this.okay}>close</button>
                </HBox>
            </VBox>
        </Dialog>
    }

    renderDeleteButton(doc) {
        if(!AuthModule.supportsScriptEdit()) return ""
        return <button onClick={()=>this.deleteScript(doc)}>delete</button>
    }

}
