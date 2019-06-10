import React, {Component} from "react"
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import selMan, {SELECTION_MANAGER} from '../SelectionManager'
import {TOTAL_OBJ_TYPES} from './Common'
import AceEditor from 'react-ace'
import 'brace/mode/javascript'
import 'brace/theme/github'
import * as ToasterManager from '../vr/ToasterManager'

export default class ScriptEditor extends Component {
    constructor(props) {
        super(props)
        this.refresh = () => {
            const id = selMan.getSelection()
            const obj = this.props.provider.accessObject(id)
            if(obj.exists() && obj.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT) {
                this.props.provider.fetchBehaviorAssetContents(id).then(text => {
                    this.setState({id:id, text:text})
                })
            } else {
            }
        }
        this.state = {
            id:null,
            text:'empty',
        }
    }
    componentDidMount() {
        this.refresh()
        this.props.provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,this.refresh)
        selMan.on(SELECTION_MANAGER.CHANGED,this.swap)
    }

    componentWillUnmount() {
        this.props.provider.off(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,this.refresh)
        selMan.off(SELECTION_MANAGER.CHANGED,this.swap)
    }
    swap = () => {
        const obj = this.props.provider.accessObject(selMan.getSelection())
        if(obj.exists()  && obj.type === TOTAL_OBJ_TYPES.BEHAVIOR_SCRIPT) {
            this.refresh()
        }
    }
    changeText = (value) => this.setState({text:value})
    save = (e) => {
        const ann = this.editor.editor.getSession().getAnnotations()
        const errors = ann.filter(a => a.type === 'error')
        if(errors.length > 0) {
            ToasterManager.add("errors in behavior")
        } else {
            ToasterManager.add("saved behavior")
            this.props.provider.updateBehaviorAssetContents(this.state.id,this.state.text)
        }
    }
    render() {
        if(this.state.id === null) return <div>loading</div>
        return <AceEditor mode="javascript"
                          theme="github"
                          name="script-editor"
                          value={this.state.text}
                          onChange={this.changeText}
                          onBlur={this.save}
                          showGutter={true}
                          width={'100%'}
                          height={'100%'}
                          ref={ed => this.editor = ed}
        />
    }

}