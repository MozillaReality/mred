import React, {Component} from 'react'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {PageCanvasView} from './PageCanvasView'


export default class PresentationApp extends Component {
    constructor(props) {
        super(props)

        this.state = {
            pageIndex:-1
        }
    }

    componentDidMount() {
        this.props.provider.on(TREE_ITEM_PROVIDER.DOCUMENT_SWAPPED, this.docSwapped)
    }

    docSwapped = () => this.setState({pageIndex:0})

    getPages() {
        const provider = this.props.provider
        const root = provider.accessObject(provider.getSceneRoot())
        return root.array('children').map(ch => provider.accessObject(ch) ).filter(ch => ch.type === 'page')
    }

    render() {
        const provider = this.props.provider
        const pages = this.getPages()
        if(this.state.pageIndex < 0) return <div>no pages loaded</div>
        const page = pages[this.state.pageIndex]
        return <PageCanvasView page={page} provider={provider} onNext={this.onNext} onPrev={this.onPrev}/>
    }

    onNext = () => {
        const pages = this.getPages()
        if(this.state.pageIndex === pages.length-1) this.state.pageIndex = -1
        this.setState({pageIndex:this.state.pageIndex+1})
    }

    onPrev = () => {
        const pages = this.getPages()
        if(this.state.pageIndex === 0) this.state.pageIndex = pages.length
        this.setState({pageIndex:this.state.pageIndex-1})
    }
}

