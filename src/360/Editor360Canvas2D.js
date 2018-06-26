import React, {Component} from 'react'
import {SELECTION_MANAGER} from '../SelectionManager'
import Selection from '../SelectionManager'
import './style.css'
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'

export default class Editor360Canvas2D extends Component {
    componentDidMount() {
        this.props.provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,()=>{
            console.log("property changed")
            this.setState({'foo':''})
        })
        Selection.on(SELECTION_MANAGER.CHANGED,()=>{
            console.log("selection changed")
            this.setState({'foo':''})
        })
    }
    prov = () => this.props.provider
    render() {
        const scene = this.prov().findSelectedScene()
        if(!scene) return <div>no scene selected</div>
        return <div className="canvas-360">{this.renderNode(scene,0)}</div>
    }
    renderNode(node,i) {
        if(node.type === 'scene') {
            return <div key={i}>scene{node.children.map((nd,i)=> {
                return this.renderNode(nd, i)
            })}</div>
        }
        if(node.type === 'layer') {
            return <div className="layer" key={i}>layer{node.children.map((nd,i)=> {
                return this.renderNode(nd, i)
            })}</div>
        }
        if(node.type === 'primitive') {
            if(node.primitive === 'cube') {
                const style = {
                    width: (node.width*50)+'px',
                    height: (node.height*50)+'px',
                    left: (node.angle)*2+'px',
                    top: (50-(node.elevation)*3)+'px',
                }
                return <div className="primitive cube" style={style}>cube</div>
            }
            if(node.primitive === 'text') {
                const style = {
                    width: (node.width*50)+'px',
                    height: (node.height*50)+'px',
                    left: (node.angle)*2+'px',
                    top: (50-(node.elevation)*3)+'px',
                }
                return <div className="primitive text" style={style}>{node.text}</div>
            }
            return <div className="primitive" key={i}>prim:{node.primitive}</div>

        }
        return <div key={i}>unknown</div>
    }
}
