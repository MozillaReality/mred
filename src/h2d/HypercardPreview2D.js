import {parseOptions} from '../utils'
import React, {Component} from 'react'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import HypercardEditor from './HypercardEditor'
import CardComponent from './CardComponent'

export default class HypercardPreview2D extends Component {
    constructor(props) {
        super(props)
        this.state = {
            doc:null,
            valid:false,
            current:null
        }
    }
    componentDidMount() {
        const opts = parseOptions({})
        console.log("preview starting with options",opts)
        this.provider = new HypercardEditor()
        this.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
        this.provider.loadDoc(opts.doc)
    }
    structureChanged = () => {
        const doc = this.provider.getSceneRoot()
        this.setState({doc: doc, current: doc.children[0], valid: true})
    }
    navTo = (target) => {
        const card = this.state.doc.children.find((card) => card.id === target)
        this.setState({current:card})
    }
    render() {
        if(!this.state.valid) return <div>invalid preview. please close and try again</div>
        return <CardComponent card={this.state.current} live={true} navTo={this.navTo}/>
    }
}