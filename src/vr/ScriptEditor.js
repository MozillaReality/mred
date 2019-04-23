import React, {Component} from "react"
import {fetchGraphObject} from '../syncgraph/utils'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import selMan, {SELECTION_MANAGER} from '../SelectionManager'
import {ASSET_TYPES, TOTAL_OBJ_TYPES} from './Common'
import AceEditor from 'react-ace'
import 'brace/mode/javascript'
import 'brace/theme/github'
export default class ScriptEditor extends Component {
    constructor(props) {
        super(props)
        this.refresh = () => {
            const id = selMan.getSelection()
            const obj = this.props.provider.accessObject(id)
            console.log('id',id,obj.exists(), obj.type)
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
        this.props.provider.updateBehaviorAssetContents(this.state.id,this.state.text)
    }
    render() {
        const prov = this.props.provider
        if(this.state.id === null) return <div>loading</div>
        return <AceEditor mode="javascript"
                          theme="github"
                          name="UNIQUE_ID_OF_DIV"
                          value={this.state.text}
                          onChange={this.changeText}
                          onBlur={this.save}
                          showGutter={true}
                          width={'100%'}
                          height={'100%'}
        />
    }

}