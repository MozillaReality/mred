import React, {Component} from 'react'
import {SELECTION_MANAGER} from '../SelectionManager'
import Selection from '../SelectionManager'
import './style.css'
import {SERVER_URL_ASSETS, TREE_ITEM_PROVIDER} from '../TreeItemProvider'

function toClassString(obj) {
    return Object.keys(obj).map((key)=> obj[key]?key:"").join(" ")
}

export default class Editor360Canvas2D extends Component {
    componentDidMount() {
        this.props.provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,this.refresh)
        this.props.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_REMOVED,this.refresh)
        this.props.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_ADDED,this.refresh)
        this.props.provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.refresh)
        Selection.on(SELECTION_MANAGER.CHANGED,this.refresh)
    }
    refresh = () => {
        this.setState({'foo':''})
    }
    prov = () => this.props.provider
    render() {
        const scene = this.prov().findSelectedScene()
        if(!scene) return <div>no scene selected</div>
        return <div className="canvas-360">{this.renderNode(scene,0)}</div>
    }

    renderNode(node,i) {
        const w = 600
        const h = 300
        if(node.type === 'scene') {
            return <div key={i}>{node.children.map((nd,i)=> {
                return this.renderNode(nd, i)
            })}</div>
        }
        if(node.type === 'layer') {
            const clss = {
                layer:true,
                selected:this.prov().findSelectedLayer() === node
            }
            return <div className={toClassString(clss)} key={i}>
                <h3>{node.title}</h3>
                {node.children.map((nd,i)=> {
                return this.renderNode(nd, i)
            })}</div>
        }
        if(node.type === 'primitive') {
            if(node.primitive === 'cube') {
                const style = {
                    width: (node.width*50)+'px',
                    height: (node.height*50)+'px',
                    left: (node.angle/360*w)+'px',
                    top: (h/2-(node.elevation)*3)+'px',
                }
                const clss = {
                    primitive:true,
                    cube:true,
                    selected:this.prov().findSelectedPrimitive() === node
                }
                return <div className={toClassString(clss)} style={style} key={i}>cube</div>
            }
            if(node.primitive === 'text') {
                const style = {
                    width: (node.width*50)+'px',
                    height: (node.height*50)+'px',
                    left: (node.angle/360*w)+'px',
                    top: (h/2-(node.elevation)*3)+'px',
                }
                const clss = {
                    primitive:true,
                    text:true,
                    selected:this.prov().findSelectedPrimitive() === node
                }
                return <div className={toClassString(clss)} style={style} key={i}>{node.text}</div>
            }
            if(node.primitive === 'image2d') {
                const style = {
                    width: (node.width*50)+'px',
                    height: (node.height*50)+'px',
                    left: (node.angle/360*w)+'px',
                    top: (h/2-(node.elevation)*3)+'px',
                }
                const clss = {
                    primitive:true,
                    image2d:true,
                    selected:this.prov().findSelectedPrimitive() === node
                }
                const img = this.props.provider.findAssetById(node.imageid)
                return <div className={toClassString(clss)} style={style} key={i}>
                    <img src={`${SERVER_URL_ASSETS}${img.assetid}`} width={50} height={50}/>
                </div>
            }
            if(node.primitive === 'image360') {
                const img = this.props.provider.findAssetById(node.imageid)
                const clss = {
                    primitive:true,
                    image360:true,
                    selected:this.prov().findSelectedPrimitive() === node
                }
                if(img) {
                    return <div className={toClassString(clss)} key={i}>
                        <img src={`${SERVER_URL_ASSETS}${img.assetid}`}/>
                    </div>
                } else {
                    return <div className={toClassString(clss)} key={i}>img broken</div>
                }
            }
            return <div className="primitive" key={i}>prim:{node.primitive}</div>

        }
        return <div key={i}>unknown</div>
    }
}
