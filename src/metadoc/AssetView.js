import React, {Component} from "react"
import {fetchGraphObject} from '../syncgraph/utils'
import {ASSET_TYPES} from '../vr/Common'

export default class AssetView extends Component {
    render() {
        const prov = this.props.provider
        const asset = fetchGraphObject(prov.getDataGraph(),this.props.asset)
        return <div>asset view
            <h3>{asset.type} : <b>{asset.title}</b></h3>
            {this.renderAsset(asset)}
        </div>
    }

    renderAsset(asset) {
        if(asset.subtype === ASSET_TYPES.IMAGE) return <img src={asset.src} alt={asset.title}/>
        if(asset.subtype === ASSET_TYPES.AUDIO) return <audio src={asset.src} controls/>
        if(asset.subtype === ASSET_TYPES.VIDEO) return <video src={asset.src} controls/>
        if(asset.subtype === ASSET_TYPES.BEHAVIOR) return <div>{asset.src}</div>
        return <div>unknown type</div>
    }
}
