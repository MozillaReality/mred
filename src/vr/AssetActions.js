import * as ToasterManager from './ToasterManager'
import {getAssetsURL} from '../TreeItemProvider'
import {ASSET_TYPES, MIME_TYPES, TOTAL_OBJ_TYPES} from './Common'
import {fetchGraphObject} from '../syncgraph/utils'
import {AuthModule} from './AuthModule'

export function addImageAssetFromExpandedURL(assetId, url,format,title, prov) {
    if(!AuthModule.supportsAssetUpload()) assetId = title

    const asset = prov.accessObject(prov.getDataGraph().createObject({
        type:TOTAL_OBJ_TYPES.ASSET,
        subtype:ASSET_TYPES.IMAGE,
        assetId:assetId,
        format:format,
        src:url,
        width:100,
        height:100,
        title:title,
        parent:0
    }))
    prov.accessObject(prov.getAssetsObject()).insertChildLast(asset)
    prov.requestImageCache(prov.assetsManager.getAssetURL(asset)).then(img => {
        asset.set('width',img.width)
        asset.set('height',img.height)
    })
}

export function addGeoAnchorAsset(info,title,prov) {
    const asset = prov.accessObject(prov.getDataGraph().createObject({
        type:TOTAL_OBJ_TYPES.ASSET,
        subtype:ASSET_TYPES.GEOLOCATION,
        title:title,
        latitude:info.latitude,
        longitude:info.longitude,
        altitude:info.altitude,
        useAltitude:info.useAltitude,
        parent:0
    }))
    prov.accessObject(prov.getAssetsObject()).insertChildLast(asset)
}

export function addImageAssetFromFile (file, prov) {
    ToasterManager.add('uploading ' + file.name)
    AuthModule.uploadFile(file).then((ans)=>{
        ToasterManager.add('uploaded')
        if(ans.success === false) return console.log("there was an error uploading! :(")
        return addImageAssetFromExpandedURL(null,getAssetsURL()+ans.asset.id, ans.asset.mimeType, file.name, prov)
    })
}
export function addImageAssetFromURL  (url, prov) {
    //TODO: make this format detection code more robust
    const name = url.substring(url.lastIndexOf('/') + 1)
    const type = name.substring(name.lastIndexOf(".") + 1)
    let fileType = "image/unknown"
    if (type.toLowerCase() === 'png') fileType = MIME_TYPES.PNG
    if (type.toLowerCase() === 'jpg') fileType = MIME_TYPES.JPEG
    if (type.toLowerCase() === 'jpeg') fileType = MIME_TYPES.JPEG
    return addImageAssetFromExpandedURL(null,url, fileType, name, prov)
}
export function addGLBAssetFromFile (file, prov) {
    ToasterManager.add('uploading '+ file.name)
    prov.uploadFile(file).then((ans)=>{
        ToasterManager.add('uploaded')
        if(ans.success === false) return console.log("there was an error uploading! :(")
        const url = getAssetsURL()+ans.asset.id
        const graph = prov.getDataGraph()
        const asset = fetchGraphObject(graph,graph.createObject({
            type:TOTAL_OBJ_TYPES.ASSET,
            subtype:ASSET_TYPES.GLTF,
            format:MIME_TYPES.GLB,
            src:url,
            title:file.name,
            parent:0
        }))
        prov.accessObject(prov.getAssetsObject()).insertChildLast(asset)
    })
}

export function addAudioAssetFromFile (file, prov) {
    ToasterManager.add('uploading')
    prov.uploadFile(file).then((ans)=>{
        ToasterManager.add('uploaded')
        console.log("uploaded file with answer",ans)
        if(ans.success === false) return console.log("there was an error uploading! :(")
        const url = getAssetsURL()+ans.asset.id
        const graph = prov.getDataGraph()
        const asset = fetchGraphObject(graph,graph.createObject({
            type:TOTAL_OBJ_TYPES.ASSET,
            subtype:ASSET_TYPES.AUDIO,
            format:ans.asset.mimeType,
            src:url,
            title:file.name,
            parent:0
        }))
        prov.accessObject(prov.getAssetsObject()).insertChildLast(asset)
    })
}
export function addAudioAssetFromURL (assetId, url, fileType, name, prov) {
    //TODO: make this format detection code more robust
    if(!name) {
        name = url.substring(url.lastIndexOf('/') + 1)
    }
    if(!fileType) {
        const type = name.substring(name.lastIndexOf(".") + 1)
        fileType = "audio/unknown"
        if(type.toLowerCase() === 'mp3') fileType = MIME_TYPES.MP3
        if(type.toLowerCase() === 'aac') fileType = MIME_TYPES.AAC
    }
    if(!AuthModule.supportsAssetUpload()) assetId = name

    const graph = prov.getDataGraph()
    const asset = fetchGraphObject(graph,graph.createObject({
        type: TOTAL_OBJ_TYPES.ASSET,
        subtype:ASSET_TYPES.AUDIO,
        assetId:assetId,
        format:fileType,
        src:url,
        title:name,
        parent:0
    }))
    prov.accessObject(prov.getAssetsObject()).insertChildLast(asset)
}

export function addVideoAssetFromURL (assetId, url, fileType, title, prov) {
    if(!title) title = url.substring(url.lastIndexOf('/') + 1)
    if(!AuthModule.supportsAssetUpload()) assetId = title
    const asset = prov.accessObject(prov.getDataGraph().createObject({
        type: TOTAL_OBJ_TYPES.ASSET,
        subtype:ASSET_TYPES.VIDEO,
        assetId:assetId,
        format:fileType,
        src:url,
        title:title,
        parent:0
    }))
    prov.accessObject(prov.getAssetsObject()).insertChildLast(asset)
}


export function addGLBAssetFromURL(assetId, url, fileType, title, prov) {
    if(!title) title = url.substring(url.lastIndexOf('/') + 1)
    if(!AuthModule.supportsAssetUpload()) assetId = title
    const asset = prov.accessObject(prov.getDataGraph().createObject({
        type: TOTAL_OBJ_TYPES.ASSET,
        subtype:ASSET_TYPES.GLTF,
        assetId:assetId,
        format:fileType,
        src:url,
        title:title,
        parent:0
    }))
    prov.accessObject(prov.getAssetsObject()).insertChildLast(asset)
}