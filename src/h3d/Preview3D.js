import React, {Component} from 'react'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import Hypercard3DEditor from '../Hypercard3DEditor'
import QRCanvas from "./QRCanvas"
import {parseOptions} from '../utils'
import ThreeDeeViewer from './ThreeDeeViewer'

export default class Preview3D extends Component {
    navTo = (target) => {
        console.log('navigating')
    }

    constructor(props) {
        super(props)
        this.state = {
            doc: null,
            valid: false,
            current: null,
        }
    }

    componentDidMount() {
        const opts = parseOptions({})
        console.log("preview starting with options",opts)
        this.provider = new Hypercard3DEditor()
        this.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
        this.provider.loadDoc(opts.doc)
    }
    structureChanged = () => {
        const doc = this.provider.getSceneRoot()
        this.setState({doc: doc, current: doc.children[0], valid: true})
    }

    render() {
        if (!this.state.valid) return <div>invalid preview. please close and try again</div>
        return <div style={{margin: 0, padding: 0, borderWidth: 0}}>
            <ThreeDeeViewer scene={this.state.current} live={true} navTo={this.navTo} fillScreen={true}/>
            <QRCanvas url={window.location.href}
                      width={300} height={300}
                      style={{position: 'absolute', right: 10, bottom: 10}}
            />
        </div>
    }
}
