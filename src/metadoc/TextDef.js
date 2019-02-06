import {createGraphObjectFromObject, fetchGraphObject} from "../syncgraph/utils";
import {FONT_STYLES, FONT_WEIGHTS, HORIZONTAL_ALIGNMENT, STANDARD_FONTS, VERTICAL_ALIGNMENT} from "./Common";

export default class TextDef {
    make(graph,layer) {
        const text = fetchGraphObject(graph,graph.createObject({
            type:'text',
            title:'text',

            text:'title text',

            horizontalAlign:HORIZONTAL_ALIGNMENT.CENTER,
            verticalAlign:VERTICAL_ALIGNMENT.BASELINE,
            autoFit:true,
            fontSize:30,
            fontFamily:STANDARD_FONTS.SANSSERIF,
            fontWeight:FONT_WEIGHTS.NORMAL,
            fontStyle:FONT_STYLES.NORMAL,

            x: 100,
            y: 100,
            width: 200,
            height: 120,
            fillColor: '#ff00ff',
            parent:layer.id,
        }))
        return text
    }

    draw(c,g,shape,selected) {
        c.fillStyle = shape.fillColor
        const size_px = shape.fontSize
        c.font = `normal ${size_px}px sans-serif`
        const metrics = c.measureText(shape.text)
        if(shape.autoFit) {
            c.fillText(shape.text, shape.x, shape.y + shape.fontSize)
        } else {
            let xoff = 0
            let yoff = 0
            if(shape.horizontalAlign === HORIZONTAL_ALIGNMENT.LEFT) {
                xoff = 0
            }
            if(shape.horizontalAlign === HORIZONTAL_ALIGNMENT.CENTER) {
                xoff = (shape.width - metrics.width)/2
            }
            if(shape.horizontalAlign === HORIZONTAL_ALIGNMENT.RIGHT) {
                xoff = shape.width - metrics.width
            }
            if(shape.verticalAlign === VERTICAL_ALIGNMENT.TOP) {
                yoff = 0
            }
            if(shape.verticalAlign === VERTICAL_ALIGNMENT.CENTER) {
                yoff = (shape.height-size_px)/2
            }
            if(shape.verticalAlign === VERTICAL_ALIGNMENT.BASELINE) {
                yoff = shape.height-size_px
            }
            if(shape.verticalAlign === VERTICAL_ALIGNMENT.BOTTOM) {
                yoff = shape.height-size_px
            }
            c.fillText(shape.text, shape.x+xoff,  shape.y + yoff + size_px)
        }
        if (selected) {
            c.strokeStyle = 'red'
            if(shape.autoFit) {
                c.strokeRect(shape.x + 0.5, shape.y + 0.5, metrics.width, size_px)
            } else {
                c.strokeRect(shape.x+0.5, shape.y+0.5, shape.width, shape.height)
            }
        }
    }

    isInside(pt,shape, canvas) {
        const c = canvas.getContext('2d')
        c.font = `normal ${shape.fontSize}px sans-serif`
        const metrics = c.measureText(shape.text)
        const w = metrics.width
        const h = shape.fontSize
        if(shape.autoFit) {
            if (pt.x < shape.x) return false
            if (pt.x > shape.x + w) return false
            if (pt.y < shape.y) return false
            if (pt.y > shape.y+h) return false
            return true
        } else {
            if (pt.x < shape.x) return false
            if (pt.x > shape.x + shape.width) return false
            if (pt.y < shape.y) return false
            if (pt.y > shape.y + shape.height) return false
            return true
        }
    }
    toSVGString(obj) {
        return `<text x="${obj.x}" y="${obj.y}"
                     fill="${obj.fillColor}" fontSize="${obj.fontSize}"
                     fontFamily="${obj.fontFamily}"
                >${obj.text}</text>`
    }

}
