import ObjectDef from './ObjectDef'
import {fetchGraphObject} from '../syncgraph/utils'
import {HORIZONTAL_ALIGNMENT, OBJ_TYPES, PROP_DEFS, TRIGGERS} from './Common'
import * as THREE from 'three'
import {VERTICAL_ALIGNMENT} from '../metadoc/Common'

export default class TextDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.text,
            title:'some text',
            text:'some text\nto read\nright now',

            textColor:'#000000',
            backgroundColor:'#ff0000',
            borderColor:'#000000',
            borderWidth:1,
            padding:1,
            borderRadius:0,
            horizontalAlign: HORIZONTAL_ALIGNMENT.CENTER,
            fontSize:30,
            drawBackground:true,

            tx:0, ty:1.5, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,

            action:0,
            trigger:TRIGGERS.CLICK,
            parent:scene.id
        }))
    }

    makeNode(obj) {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const ctx = canvas.getContext('2d')
        const texture  = new THREE.CanvasTexture(canvas)

        const node = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(3,3),
            new THREE.MeshLambertMaterial({color: 'white', map:texture, transparent:true, opacity:1.0})
        )
        node.renderOrder = -1
        node.name = obj.title
        node.userData.clickable = true
        node.userData.canvas = canvas
        node.userData.texture = texture
        this.regenerateTexture(node,obj)



        // on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)

        return node
    }

    updateProperty(node, obj, op, provider) {
        if(    op.name === PROP_DEFS.text.key
            || op.name === PROP_DEFS.textColor.key
            || op.name === PROP_DEFS.fontSize.key
            || op.name === PROP_DEFS.horizontalAlign.key

            || op.name === PROP_DEFS.borderColor.key
            || op.name === PROP_DEFS.borderWidth.key
            || op.name === PROP_DEFS.borderRadius.key

            || op.name === PROP_DEFS.padding.key

            || op.name === PROP_DEFS.backgroundColor.key
            || op.name === PROP_DEFS.drawBackground.key
        ) this.regenerateTexture(node,obj)
        return super.updateProperty(node,obj,op,provider)
    }


    regenerateTexture(node, obj) {
        const canvas = node.userData.canvas


        const ctx = canvas.getContext('2d')



        let {lines, size_px, total_height, total_width} = this.calculateLines(obj,ctx)
        const rr = {
            x:obj.borderWidth/2, y:obj.borderWidth/2,
            width:  total_width  + obj.borderWidth + obj.padding*2,
            height: total_height + obj.borderWidth + obj.padding*2,
            rx:obj.borderRadius,
            ry: obj.borderRadius
        }

        //attempt to calculate a good texture size and resize if needed
        // let tw = rr.x+rr.width
        // if(tw>256) {
        //     tw = 512
        // } else {
        //     tw = 256
        // }
        // canvas.width = tw
        // canvas.height = tw

        //clear everything
        ctx.clearRect(0,0,canvas.width,canvas.height)

        //fill bg
        ctx.fillStyle = obj.backgroundColor
        if(obj.drawBackground) this.drawRoundRect(ctx, rr, true)

        //draw border
        if(obj.borderWidth > 0) {
            ctx.strokeStyle = obj.borderColor
            ctx.lineWidth = obj.borderWidth
            this.drawRoundRect(ctx, rr, false)
        }

        //layout text
        lines.forEach((line,i) => {
            const lines_height = lines.length*size_px
            line.xoff = 0
            line.yoff = 0
            if(obj.horizontalAlign === HORIZONTAL_ALIGNMENT.LEFT)   line.xoff = 0
            if(obj.horizontalAlign === HORIZONTAL_ALIGNMENT.CENTER) line.xoff = (total_width - line.width)/2
            if(obj.horizontalAlign === HORIZONTAL_ALIGNMENT.RIGHT)  line.xoff = total_width  - line.width
            line.yoff += (i+1)*line.height
        })

        // draw text
        ctx.fillStyle = obj.textColor
        lines.forEach((line,i) => ctx.fillText(line.text,
            obj.borderWidth + obj.padding + line.xoff,
            obj.borderWidth + obj.padding + line.yoff))

        node.userData.texture.needsUpdate = true
    }

    calculateLines(shape,c) {
        const size_px = shape.fontSize
        c.font = `normal ${size_px}px sans-serif`
        const lines = shape.text.split("\n").map(text => {
            return {
                text:text,
                width: c.measureText(text).width,
                height: size_px
            }
        })

        let total_width = lines.reduce((max, line) => Math.max(max,line.width),0)
        let total_height = lines.reduce((total,line) => total + line.height,0)
        return {
            total_width:total_width,
            total_height: total_height,
            lines:lines,
            size_px:size_px
        }
    }

    drawRoundRect(c,shape, fill) {
        const c0 = {x:shape.x,y:shape.y}
        const c1 = {x:shape.x+shape.width, y:shape.y}
        const c2 = {x:shape.x+shape.width, y:shape.y+shape.height}
        const c3 = {x:shape.x, y:shape.y+shape.height}
        c.beginPath()
        c.moveTo(c0.x+shape.rx,c0.y)
        c.lineTo(c1.x-shape.rx,c1.y)
        c.quadraticCurveTo(c1.x,c1.y, c1.x,c1.y+shape.ry)
        c.lineTo(c2.x,c2.y-shape.ry)
        c.quadraticCurveTo(c2.x,c2.y, c2.x-shape.rx,c2.y)
        c.lineTo(c3.x+shape.rx,c3.y)
        c.quadraticCurveTo(c3.x,c3.y, c3.x,c3.y-shape.ry)
        c.lineTo(c0.x,c0.y+shape.ry)
        c.quadraticCurveTo(c0.x,c0.y, c0.x+shape.rx,c0.y)
        c.closePath();
        if(fill) {
            c.fill()
        } else {
            c.stroke()
        }
    }

}



