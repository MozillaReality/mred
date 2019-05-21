import React, {Component} from "react"
import {fetchGraphObject} from '../syncgraph/utils'
import {ASSET_TYPES} from '../vr/Common'
import GLTFAssetView from '../vr/GLTFAssetView'
import GeoAssetView from '../vr/GeoAssetView'

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
        const prov = this.props.provider
        const url = prov.getAssetURL(asset)
        if(asset.subtype === ASSET_TYPES.IMAGE) return <img src={url} alt={asset.title}/>
        if(asset.subtype === ASSET_TYPES.AUDIO) return <audio src={url} controls/>
        // added playsinline so video shows in editor on ipad 
        if(asset.subtype === ASSET_TYPES.VIDEO) return <video src={url} controls playsInline crossOrigin="anonymous"/>
        if(asset.subtype === ASSET_TYPES.BEHAVIOR) return <div>{url}</div>
        if(asset.subtype === ASSET_TYPES.GLTF) return <GLTFAssetView asset={asset} provider={this.props.provider}/>
        if(asset.subtype === ASSET_TYPES.GEOLOCATION) return <GeoAssetView asset={asset} provider={this.props.provider}/>
        return <div>unknown type</div>
    }
}
