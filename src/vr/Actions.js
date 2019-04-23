import SceneDef from './SceneDef'
import SelectionManager from '../SelectionManager'
import {toQueryString} from '../utils'
import {ITEM_ICONS, OBJ_TYPES} from './Common'
import {PopupManager} from 'appy-comps'
import {MenuPopup} from '../GridEditorApp'
import React from 'react'

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
