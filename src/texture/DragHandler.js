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
        this.opts = opts

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
        const THRESHOLD = 50
        if(this.opts.getXSnaps) {
            const snapsX = this.opts.getXSnaps(this.target)
            const matchX = snapsX.find((x)=>Math.abs(cursor2.x-x) < THRESHOLD)
            // console.log("real x = ", cursor2.x, 'snap x = ', snapsX, matchX)
            if(typeof matchX !== 'undefined') {
                cursor2.x = matchX
            }
            if(this.opts.getWExtent) {
                const w = this.opts.getWExtent(this.target)
                // console.log("w = ", w)
                const matchW = snapsX.find((x)=>Math.abs((cursor2.x+w)-x) < THRESHOLD)
                if(typeof matchW !== 'undefined') {
                    // console.log("right bounds snap")
                    cursor2.x = matchW - w
                }

                if(this.opts.getCenterXSnaps) {
                    const matchCX = this.opts.getCenterXSnaps().find((x)=> Math.abs((cursor2.x+w/2) - x) < THRESHOLD)
                    if(typeof matchCX !== 'undefined') {
                        cursor2.x = matchCX - w/2
                    }
                }
            }
        }
        if(this.opts.getYSnaps) {
            const snapsY = this.opts.getYSnaps(this.target)
            const matchY = snapsY.find((y)=>Math.abs(cursor2.y-y) < THRESHOLD)
            // console.log("real y = ", cursor2.x, 'snap y = ', snapsY, matchY)
            if(typeof matchY !== 'undefined') {
                cursor2.y = matchY
            }
            if(this.opts.getHExtent) {
                const h = this.opts.getHExtent(this.target)
                // console.log("h = ", h)
                const matchH = snapsY.find((y)=>Math.abs((cursor2.y+h)-y) < THRESHOLD)
                if(typeof matchH !== 'undefined') {
                    // console.log("bottom bounds snap")
                    cursor2.y = matchH - h
                }
                if(this.opts.getCenterYSnaps) {
                    const matchCY = this.opts.getCenterYSnaps().find((y)=> Math.abs((cursor2.y+h/2) - y) < THRESHOLD)
                    if(typeof matchCY !== 'undefined') {
                        cursor2.y = matchCY - h/2
                    }
                }
            }
        }
        this.provider.setPropertyValue(this.target,xdef,cursor2.x)
        this.provider.setPropertyValue(this.target,ydef,cursor2.y)
    }
}

