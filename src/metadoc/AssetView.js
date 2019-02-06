import React, {Component} from "react"
import {fetchGraphObject} from '../syncgraph/utils'

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
        if(asset.subtype === 'image') return <img src={asset.src} alt={asset.title}/>
        return <div>unknown type</div>
    }
}
