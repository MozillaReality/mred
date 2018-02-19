import SelectionManager from '../SelectionManager'
import {makePoint} from '../utils'

export default class DragHandler {
    constructor(e,opts) {
        e.stopPropagation()
        e.preventDefault()
        this.target = opts.target
        this.provider = opts.provider
        if(e.shiftKey) {
            SelectionManager.addToSelection(this.target)
        } else {
            SelectionManager.setSelection(this.target)
        }

        this.worldToLocal = opts.toLocal
        this.xpropname = opts.xpropname
        this.ypropname = opts.ypropname
        this.uman = opts.undoManager

        const pt2 = this.worldToLocal(makePoint(e.clientX, e.clientY))
        this.start = pt2.minus(makePoint(this.target[this.xpropname],this.target[this.ypropname]))


        if(this.uman) this.uman.startGrouping()
        window.addEventListener('mousemove',this.onMouseMove)
        window.addEventListener('mouseup',this.onMouseUp)
    }
    onMouseUp = (e) => {
        if(this.uman) this.uman.stopGrouping()
        window.removeEventListener('mousemove', this.onMouseMove)
        window.removeEventListener('mouseup', this.onMouseUp)
    }

    onMouseMove = (e) => {
        const cursor = this.worldToLocal(makePoint(e.clientX, e.clientY),e)
        const defs = this.provider.getProperties(this.target)
        const xdef = defs.find((def)=>def.key === this.xpropname)
        const ydef = defs.find((def)=>def.key === this.ypropname)
        const cursor2 = cursor.minus(this.start)
        this.provider.setPropertyValue(this.target,xdef,cursor2.x)
        this.provider.setPropertyValue(this.target,ydef,cursor2.y)
    }
}

