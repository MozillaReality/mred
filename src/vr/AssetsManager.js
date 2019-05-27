import {ASSET_TYPES} from './Common'
import {TextureLoader, VideoTexture, Audio, AudioLoader} from 'three'
import {AuthModule} from './AuthModule'
import {getAssetsURL} from '../TreeItemProvider'

export class AssetsManager {
    constructor(provider) {
        this.provider = provider
        this.assets_url_map = {}
        this.videocache = {}
        this.audiocache = {}
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
                //glitch server version
                assets.forEach(asset => {
                    this.assets_url_map[asset.title] = asset.url
                })
                console.log("cached the assets",this.assets_url_map)
            }
        })
    }

    getAssetURL(asset) {
        if(asset.assetId) {
            return this.assets_url_map[asset.assetId]
        } else {
            return asset.src
        }
    }


    playMediaAsset(asset, trusted=false) {
        const lg = this.provider.getLogger()
        if(asset.subtype === ASSET_TYPES.AUDIO) {
            lg.log("playing the audio asset",asset)
            const url = this.getAssetURL(asset)
            lg.log("playing the audio from the url",url)
            if(this.audiocache[asset.id]) {
                //already loaded
                const sound = this.audiocache[asset.id]
                if(sound.isPlaying) sound.stop()
                sound.play()
            } else {
                const sound = new Audio(this.provider.getAudioListener())
                const audioLoader = new AudioLoader()
                audioLoader.load(url, function (buffer) {
                    sound.setBuffer(buffer);
                    sound.setLoop(false);
                    sound.setVolume(0.5);
                    sound.play();
                });
                this.audiocache[asset.id] = sound
            }
        }
        if(asset.subtype === ASSET_TYPES.VIDEO) {
            lg.log("playing the media asset", asset)
            const url = this.getAssetURL(asset)
            lg.log("playing the url yaeah", url)
            const video = this.videocache[url]
            if (video) {
                if(trusted) video.muted = false
                video.play()
            }
        }

    }

    stopMediaAsset(asset) {
        if(asset.subtype === ASSET_TYPES.AUDIO) {
            if(this.audiocache[asset.id]) {
                this.audiocache[asset.id].stop()
                delete this.audiocache[asset.id]
                this.audiocache[asset.id] = null
            }
        }
        if(asset.subtype === ASSET_TYPES.VIDEO) {
            if(this.videocache[asset.id]) {
                this.videocache[asset.id].stop()
                delete this.videocache[asset.id]
                this.videocache[asset.id] = null
            }
        }
    }

    stopAllMedia() {
        const cache = this.videocache
        Object.keys(cache).forEach(key => {
            const item = cache[key]
            if(item.pause) {
                item.pause()
            }
        })
        Object.keys(this.audiocache).forEach(key => {
            if(this.audiocache[key].stop) {
                this.audiocache[key].stop()
            }
        })

    }


    getTexture(id) {
        const asset = this.provider.accessObject(id)
        if(!asset.exists()) return null
        const url = this.getAssetURL(asset)
        if(!url) {
            this.provider.getLogger().error("==== null url from asset",asset)
            return
        }
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