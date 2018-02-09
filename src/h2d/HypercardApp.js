import React, {Component} from 'react'
import GridEditorApp from '../GridEditorApp'
import HypercardCanvas from './HypercardCanvas'
import {toQueryString} from '../utils'

export default class HypercardApp extends Component {
    constructor(props) {
        super(props)
    }
    preview = () => {
        this.props.provider.save().then(()=>{
            const query = toQueryString({
                mode:'preview',
                provider:this.state.providerName,
                doc:this.state.provider.getDocId()
            })
            window.open('./?'+query)
        })
    }

    render() {
        const prov = this.props.provider
        const canvas = <HypercardCanvas provider={prov} />
        const treeActions = prov.getTreeActions()
        return <GridEditorApp
            provider={prov}
            treeActions={treeActions}
            mainView={canvas}
            viewActions={[
                <button className="fa fa-save" onClick={prov.save}/>,
                <button className="fa fa-play-circle" onClick={this.preview}/>
            ]}
        />
    }
}