import SceneDef from './defs/SceneDef'
import SelectionManager from '../SelectionManager'
import {toQueryString} from '../utils'
import {ITEM_ICONS, OBJ_TYPES, PROP_DEFS, TOTAL_OBJ_TYPES} from './Common'
import {PopupManager} from 'appy-comps'
import {MenuPopup} from '../common/GridEditorApp'
import React from 'react'
import {AuthModule} from './AuthModule'

export function addScene(provider) {
    const root = provider.accessObject(provider.getSceneRoot())
    const scenes = root.getChildren().filter(ch => ch.type === TOTAL_OBJ_TYPES.SCENE)
    let prev = null
    if(scenes.length >= 1) prev = scenes[scenes.length-1]
    const scene = new SceneDef().make(provider.getDataGraph(),root)
    if(prev) {
        root.insertChildAfter(scene,prev)
    } else {
        root.insertFirstChild(scene)
    }
    SelectionManager.setSelection(scene.id)
}


export function deleteObject(provider) {
    if(SelectionManager.isEmpty()) return
    provider.accessObject(SelectionManager.getSelection()).removeFromParent()
    SelectionManager.clearSelection()
}

export function newDoc(provider) {
    const opts = Object.assign({},provider.options,
        {mode:'edit', switcher:false, doc:provider.genID('doc')})
    document.location =  `./?${toQueryString(opts)}`
}


export function showAddPopup (e, provider) {
    let item = provider.getSelectedSceneObject()
    const acts = Object.keys(OBJ_TYPES).map(type => {
        return {
            title: type,
            icon: ITEM_ICONS[type],
            fun: () => provider.add3DObject(type,item)
        }
    })
    PopupManager.show(<MenuPopup actions={acts}/>, e.target)
}

export function showAddAssetPopup(e, provider) {
    const acts = generateAddAssetPopup(provider)
    PopupManager.show(<MenuPopup actions={acts}/>, e.target)
}

export function generateAddAssetPopup(provider) {
    let acts = []
    // console.log("Auth mod",AuthModule.supportsAssetUpload())
    if(AuthModule.supportsAssetUpload()) {
        acts = acts.concat([
            {
                title: 'image',
                enabled: AuthModule.isLoggedIn(),
                icon: ITEM_ICONS.image,
                fun: () => provider.showAddImageAssetDialog()
            },
            {
                title: 'server image',
                enabled: AuthModule.isLoggedIn(),
                icon: ITEM_ICONS.image,
                fun: () => provider.showAddServerImageDialog()
            },
            {divider: true},
            {
                title: 'GLTF model',
                enabled: AuthModule.isLoggedIn(),
                icon: ITEM_ICONS.model,
                fun: () => provider.showAddGLTFAssetDialog()
            },
            {
                title: 'GLB model',
                enabled: AuthModule.isLoggedIn(),
                icon: ITEM_ICONS.model,
                fun: () => provider.showAddGLBAssetDialog()
            },
            {divider: true},
            {
                title: 'audio file',
                enabled: AuthModule.isLoggedIn(),
                icon: ITEM_ICONS.audio,
                fun: () => provider.showAddAudioAssetDialog()
            },
            {
                title: 'existing asset on server',
                enabled: AuthModule.isLoggedIn(),
                icon: ITEM_ICONS.assets,
                fun: () => provider.showOpenAssetDialog()
            }])
    } else {
        acts.push({
            title: 'add asset from glitch',
            icon: ITEM_ICONS.assets,
            fun: () => provider.showOpenAssetDialog()
        })
    }

    acts.push({
        title:'geo location',
        icon: ITEM_ICONS.geoanchor,
        fun: () => provider.showAddGeoLocationAssetDialog()
    })

    return acts
}

export function showAddBehaviorPopup (e, provider) {
    const acts = [
        {
            title:'Add Behavior from Server',
            enabled: AuthModule.isLoggedIn(),
            icon: ITEM_ICONS.behavior_script,
            fun: () => provider.showOpenBehaviorDialog()
        },
    ]
    if(AuthModule.supportsScriptEdit()) {
        acts.push({
            title: 'custom behavior',
            enabled: AuthModule.isLoggedIn(),
            icon: ITEM_ICONS.behavior_script,
            fun: () => provider.addCustomBehaviorAsset()
        })
    }
    PopupManager.show(<MenuPopup actions={acts}/>, e.target)
}
