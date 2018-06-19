import SelectionManager from '../SelectionManager'
import {makePoint} from '../utils'

export default class DragHandler {
    constructor(e,opts) {
        e.stopPropagation()
        e.preventDefault()
        this.provider = opts.provider
        if(e.shiftKey) {
            SelectionManager.addToSelection(opts.target)
        } else {
            if(!SelectionManager.isSelected(opts.target)) SelectionManager.setSelection(opts.target)
        }

        this.worldToLocal = opts.toLocal
        this.xpropname = opts.xpropname
        this.ypropname = opts.ypropname
        this.uman = opts.undoManager
        this.opts = opts


        const nodes = SelectionManager.getFullSelection()

        //create a rectangle for every node
        const rects = nodes.map(node => {
            return {
                x: node[this.xpropname],
                y: node[this.ypropname],
                x2: node[this.xpropname] + opts.getWExtent(node),
                y2: node[this.ypropname] + opts.getHExtent(node)
            }
        })

        //figure out the union of the rects to make the final bounds
        const max  = rects[0]
        rects.forEach(r=>{
            if(r.x < max.x) max.x = r.x
            if(r.x2 > max.x2) max.x2 = r.x2
            if(r.y2 > max.y2) max.y2 = r.y2
            if(r.y < max.y) max.y = r.y
        })
        max.w = max.x2-max.x
        max.h = max.y2-max.y
        this.bounds = max

        //save the position of each node relative to the bounds
        this.starts = nodes.map((n)=>{
            return makePoint(n[this.xpropname],n[this.ypropname]).minus(makePoint(max.x,max.y))
        })

        //save the starting cursor relative to the bounds
        const pt2 = this.worldToLocal(makePoint(e.clientX, e.clientY))
        this.startOff = pt2.minus(makePoint(this.bounds.x,this.bounds.y))


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
        const targets = SelectionManager.getFullSelection()
        const defs = this.provider.getProperties(targets[0])
        const xdef = defs.find((def)=>def.key === this.xpropname)
        const ydef = defs.find((def)=>def.key === this.ypropname)
        const THRESHOLD = 50
        const currentBounds = cursor.minus(this.startOff)
        currentBounds.w = this.bounds.w
        currentBounds.h = this.bounds.h

        if(this.opts.getXSnaps) {
            const snapsX = this.opts.getXSnaps(targets[0])
            const matchX = snapsX.find((x)=>Math.abs(currentBounds.x-x) < THRESHOLD)
            if(typeof matchX !== 'undefined') {
                currentBounds.x = matchX
            }
            const x2 = currentBounds.w + currentBounds.x
            const matchX2 = snapsX.find((x)=>Math.abs(x2-x) < THRESHOLD)
            if(typeof matchX2 !== 'undefined') {
                currentBounds.x = matchX2 - currentBounds.w
            }
            if(this.opts.getCenterXSnaps) {
                const w = currentBounds.w
                const matchCX = this.opts.getCenterXSnaps().find((x)=> Math.abs((currentBounds.x+w/2) - x) < THRESHOLD)
                if(typeof matchCX !== 'undefined') {
                    currentBounds.x = matchCX - w/2
                }
            }
        }
        if(this.opts.getYSnaps) {
            const snapsY = this.opts.getYSnaps(targets[0])
            const matchY = snapsY.find((y)=>Math.abs(currentBounds.y-y) < THRESHOLD)
            if(typeof matchY !== 'undefined') {
                currentBounds.y = matchY
            }

            const y2 = currentBounds.h + currentBounds.y
            const matchY2 = snapsY.find((y)=>Math.abs(y2-y)<THRESHOLD)
            if(typeof matchY2 !== 'undefined') {
                console.log("should bottom snap",y2,matchY2)
                currentBounds.y = matchY2-currentBounds.h
            }
            if(this.opts.getCenterYSnaps) {
                const h = currentBounds.h
                const matchCY = this.opts.getCenterYSnaps().find((y)=> Math.abs((currentBounds.y+h/2) - y) < THRESHOLD)
                if(typeof matchCY !== 'undefined') {
                    currentBounds.y = matchCY - h/2
                }
            }
        }

        targets.forEach((target,i)=>{
            // const newPos = currentBounds.add(this.starts[i])
            const newPos = cursor.minus(this.starts[i])
            const defs = [xdef,ydef]
            const values = [newPos.x, newPos.y]
            const updates = {}
            updates[xdef.key] = newPos.x
            updates[ydef.key] = newPos.y
            this.provider.setPropertyValues(target,updates)
        })
    }
}

