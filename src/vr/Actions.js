import SceneDef from './defs/SceneDef'
import SelectionManager from '../SelectionManager'
import {toQueryString} from '../utils'
import {ITEM_ICONS, OBJ_TYPES} from './Common'
import {PopupManager} from 'appy-comps'
import {MenuPopup} from '../GridEditorApp'
import React from 'react'
import {AuthModule} from './AuthModule'

export function addScene(provider) {
    const root = provider.accessObject(provider.getSceneRoot())
    const scene = new SceneDef().make(provider.getDataGraph(),root)
    root.insertFirstChild(scene)
    SelectionManager.setSelection(scene.id)
}


export function deleteObject(provider) {
    if(SelectionManager.isEmpty()) return
    provider.accessObject(SelectionManager.getSelection()).removeFromParent()
    SelectionManager.clearSelection()
}

export function newDoc(provider) {
    const opts = Object.assign({},provider.options,
        {mode:'edit', switcher:false})
    window.open(`./?${toQueryString(opts)}`)
}


export function showAddPopup (e, provider) {
    let item = provider.getSelectedScene()
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
    let acts = []
    // console.log("Auth mod",AuthModule.supportsAssetUpload())
    if(AuthModule.supportsAssetUpload()) {
        acts = acts.concat([{
            title: 'image',
            icon: ITEM_ICONS.image,
            fun: () => provider.showAddImageAssetDialog()
        },
            {
                title: 'server image',
                icon: ITEM_ICONS.image,
                fun: () => provider.showAddServerImageDialog()
            },
            {divider: true},
            {
                title: 'GLTF model',
                icon: ITEM_ICONS.model,
                fun: () => provider.showAddGLTFAssetDialog()
            },
            {
                title: 'GLB model',
                icon: ITEM_ICONS.model,
                fun: () => provider.showAddGLBAssetDialog()
            },
            {divider: true},
            {
                title: 'audio file',
                icon: ITEM_ICONS.audio,
                fun: () => provider.showAddAudioAssetDialog()
            }])
    }

    acts.push({
        title: 'existing asset on server',
        icon: ITEM_ICONS.assets,
        fun: () => provider.showOpenAssetDialog()
    })

    PopupManager.show(<MenuPopup actions={acts}/>, e.target)
}

export function showAddActionPopup (e, provider) {
    const acts = [
        {
            title:'behavior from template',
            icon: ITEM_ICONS.behavior_script,
            fun: () => provider.showOpenBehaviorDialog()
        },
    ]
    if(AuthModule.supportsScriptEdit()) {
        acts.push({
            title: 'custom behavior',
            icon: ITEM_ICONS.behavior_script,
            fun: () => provider.addCustomBehaviorAsset()
        })
    }
    PopupManager.show(<MenuPopup actions={acts}/>, e.target)
}
