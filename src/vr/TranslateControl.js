import * as THREE from 'three'
import TranslationArrow from './TranslationArrow'

export class TranslateControl extends THREE.Group {
    constructor() {
        super()
        this.handles = []
        this.handles.push(new TranslationArrow('X', this))
        this.handles.push(new TranslationArrow('Y', this))
        this.handles.push(new TranslationArrow('Z', this))
        this.handles.forEach(h => this.add(h))
        this.visible = false
    }

    attach(target, pointer) {
        this.target = target
        this.pointer = pointer
        this.position.copy(target.position)
        this.visible = true
        this.handles.forEach(h => h.attach())
    }

    detach() {
        this.target = null
        this.pointer = null
        this.visible = false
        this.handles.forEach(h => h.attach())
    }
}
