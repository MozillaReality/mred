import React, {Component} from "react"
import {map, tileLayer, marker, Icon, divIcon, latLng} from "leaflet/dist/leaflet-src.esm"
import "leaflet/dist/leaflet.css"
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'

export default class GeoAssetView extends Component {

    constructor(props, context) {
        super(props, context)
        this.updateLocation = (e) => {
            const obj = this.props.provider.accessObject(this.props.asset.id)
            const ll = latLng({
                lat: obj.latitude,
                lon: obj.longitude
            })
            this.marker.setLatLng(ll)
            this.mymap.panTo(ll)
        }
    }

    render() {
        const style = {
            width: '400px',
            height: '400px',
            border: '1px solid black',
        }
        return <div id="mapid" ref={d => this.div = d} style={style}></div>
    }
    componentDidMount() {
        this.mymap = map('mapid').setView([this.props.asset.longitude, this.props.asset.latitude], 3);
        tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'mapbox.streets'
        }).addTo(this.mymap);

        const customIcon = divIcon({className:'map-icon'})
        this.marker = marker([this.props.asset.longitude, this.props.asset.latitude],{
            title:'this is the geo location',
            icon: customIcon
        }).addTo(this.mymap)

        this.props.provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, this.updateLocation)
    }
    componentWillUnmount() {
        this.props.provider.off(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, this.updateLocation)
    }
}


