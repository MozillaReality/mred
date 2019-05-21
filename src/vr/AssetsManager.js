import {ASSET_TYPES} from './Common'
import {DoubleSide, MeshLambertMaterial, TextureLoader, VideoTexture} from 'three'
import {AuthModule} from './AuthModule'
import {getAssetsURL} from '../TreeItemProvider'

export class AssetsManager {
    constructor(provider) {
        this.provider = provider
        this.assets_url_map = {}
        this.videocache = {}
    }

    cacheAssetsList() {
        return AuthModule.getJSON(`${getAssetsURL()}list`).then(assets => {
            if(!assets || !assets.forEach) return
            if(AuthModule.supportsAssetUpload()) {
                //doc server version
                assets.forEach(asset => {
                    this.assets_url_map[asset.id] = getAssetsURL()+asset.id
                })
            } else {
                assets.forEach(asset => {
                    this.assets_url_map[asset.id] = asset.url
                })
            }
        })
    }

    getAssetURL(asset) {
        console.log("getting asset url",asset)
        if(asset.assetId) {
            console.log("converting asset id",asset.assetId)
            return this.assets_url_map[asset.assetId]
        } else {
            return asset.src
        }
    }


    playMediaAsset(asset) {
        const url = this.getAssetURL(asset)
        const cache = this.videocache
        if(cache[url]) cache[url].play()
    }

    stopAllMedia() {
        const cache = this.videocache
        Object.keys(cache).forEach(key => {
            const item = cache[key]
            if(item.pause) {
                item.pause()
            }
        })
    }


    getTexture(id) {
        const asset = this.provider.accessObject(id)
        if(!asset.exists()) return null
        const url = this.getAssetURL(asset)
        this.provider.getLogger().log("loading asset url",url)
        if(asset.subtype === ASSET_TYPES.IMAGE) {
            const tex = new TextureLoader().load(url)
            return tex
        }
        if(asset.subtype === ASSET_TYPES.VIDEO) {
            let video
            if(!this.videocache[url]) {
                video = document.createElement('video')
                video.crossOrigin = 'anonymous'

                // video will only play inline on mobile devices if it's muted
                // we will loop video
                video.muted = true;
                video.loop = true;
                video.setAttribute( 'playsinline', '' );

                video.src = url
                this.videocache[url] = video
            } else {
                video = this.videocache[url]
            }
            const tex = new VideoTexture(video)
            return tex
        }
        return null
    }
}