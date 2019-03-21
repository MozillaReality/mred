import {parseOptions} from '../utils'
import React, {Component} from 'react'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import HypercardEditor from './HypercardEditor'
import CardComponent from './CardComponent'
import InputManager from '../common/InputManager'

export default class HypercardPreview2D extends Component {
    constructor(props) {
        super(props)
        this.state = {
            doc:null,
            valid:false,
            current:null,
            currentIndex:0
        }
    }
    componentDidMount() {
        const opts = parseOptions({})
        console.log("preview starting with options",opts)
        this.provider = new HypercardEditor()
        this.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
        this.provider.loadDoc(opts.doc)


        this.im = new InputManager()

        this.im.addKeyBinding({
            id:'next',
            key:InputManager.KEYS.RIGHT_ARROW,
            modifiers:[]
        })
        this.im.addListener('next',this.nextSlide)
        this.im.addKeyBinding({
            id:'prev',
            key:InputManager.KEYS.LEFT_ARROW,
            modifiers:[]
        })
        this.im.addListener('prev',this.prevSlide)
        this.im.attachKeyEvents(document)

    }
    structureChanged = () => {
        const doc = this.provider.getSceneRoot()
        this.setState({doc: doc, current: doc.children[0], currentIndex:0, valid: true})
    }
    navTo = (target) => {
        const card = this.state.doc.children.find((card) => card.id === target)
        this.setState({current:card})
    }
    prevSlide = () => {
        const n = this.state.currentIndex-1
        if(n >= 0) {
            this.setState({
                currentIndex: n,
                current: this.state.doc.children[n]
            })
        }
    }
    nextSlide = () => {
        const n = this.state.currentIndex+1
        if(n < this.state.doc.children.length) {
            this.setState({
                currentIndex: n,
                current: this.state.doc.children[n]
            })
        }
    }
    render() {
        if(!this.state.valid) return <div>invalid preview. please close and try again</div>
        return <CardComponent card={this.state.current} live={true} navTo={this.navTo} provider={this.provider} scale={0}/>
    }
}
