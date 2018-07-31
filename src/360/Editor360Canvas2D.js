import React, {Component} from 'react'
import {SELECTION_MANAGER} from '../SelectionManager'
import Selection from '../SelectionManager'
import './style.css'
import {SERVER_URL_ASSETS, TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {VBox} from 'appy-comps'
import {PRIMS, TYPES} from "./Editor360Editor";
import {toClassString} from "../utils";

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
        if(this.prov().isAssetSelected()) {
            const asset = this.prov().findSelectedAsset()
            if(asset.assetType === TYPES.ASSETS.IMAGE) {
                const url = SERVER_URL_ASSETS+'thumbnail/w_512/'+asset.assetId
                return <VBox>
                    <h3>{asset.title}</h3>
                    <img src={url} style={{width:'900px',height:'auto'}}/>
                </VBox>
            }
            if(asset.assetType === TYPES.ASSETS.AUDIO) {
                return <VBox>
                    <h3>{asset.title}</h3>
                    <div>
                        <audio src={SERVER_URL_ASSETS+asset.assetId} controls={true}/>
                    </div>
                </VBox>
            }
            if(asset.assetType === TYPES.ASSETS.MODEL && asset.remote) {
                return <VBox>
                    <h3>{asset.title}</h3>
                    <div>
                        the url is {asset.url}
                    </div>
                </VBox>
            }
            return <div>showing an asset: <b>{asset.title}</b></div>
        }
        const scene = this.prov().findSelectedScene()
        if(!scene) return <div>no scene selected</div>
        return <div className="canvas-360">{this.renderNode(scene,0)}</div>
    }

    renderNode(node,i) {
        const w = 600
        const h = 300
        if(node.type === TYPES.NODES.SCENE) {
            const style = {}
            if(node.backgroundColor) style.backgroundColor = node.backgroundColor
            return <div key={i} style={style}>{node.children.map((nd,i)=> {
                return this.renderNode(nd, i)
            })}</div>
        }
        if(node.type === TYPES.NODES.LAYER) {
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
        if(node.type === TYPES.NODES.PRIMITIVE) {
            const info = PRIMS[node.primitive]
            if(info && info.render2D) return info.render2D(this.prov(),node,w,h,i)
            return <div className="primitive" key={i}>unknown prim:{node.primitive}</div>
        }
        return <div key={i}>unknown</div>
    }
}
