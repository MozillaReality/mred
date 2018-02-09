import React, {Component} from 'react'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {SELECTION_MANAGER} from '../SelectionManager'
import Selection from '../SelectionManager'
import ThreeDeeViewer from './ThreeDeeViewer'

export default class HypercardCanvas3D extends Component {
    constructor(props) {
        super(props)
        this.state = {
            scene: null,
        }
    }

    setSceneFromSelection() {
        let scene = Selection.getSelection()
        if (!scene) return
        if (scene === this.props.provider.getSceneRoot()) return
        if (scene.type !== 'scene') scene = this.props.provider.findParent(this.props.provider.getSceneRoot(), scene)
        if(!scene) scene = this.props.provider.getSceneRoot().children[0]
        this.setState({scene: scene})
    }
    switchScene = (id) => {
        const root = this.props.provider.getSceneRoot()
        const scene = root.children.find((sc)=>sc.id === id)
        this.setState({scene:scene})
    }
    componentDidMount() {
        this.listener2 = this.props.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, (sel) => this.setSceneFromSelection())
        this.listener = Selection.on(SELECTION_MANAGER.CHANGED, (sel) => this.setSceneFromSelection())
    }

    render() {
        return <ThreeDeeViewer scene={this.state.scene} live={true} navToScene={this.switchScene}/>
    }
}
