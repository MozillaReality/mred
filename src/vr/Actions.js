import SceneDef from './SceneDef'
import SelectionManager from '../SelectionManager'

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

