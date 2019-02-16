import {fetchGraphObject} from "../syncgraph/utils";
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
        //calculate the general line metrics
        const {lines, size_px, total_height, total_width} = this.calculateLines(shape,c)
        //add offsets for alignment
        lines.forEach((line,i) => {
            const lines_height = lines.length*size_px
            line.xoff = 0
            if(shape.horizontalAlign === HORIZONTAL_ALIGNMENT.LEFT)   line.xoff = 0
            if(shape.horizontalAlign === HORIZONTAL_ALIGNMENT.CENTER) line.xoff = (total_width - line.width)/2
            if(shape.horizontalAlign === HORIZONTAL_ALIGNMENT.RIGHT)  line.xoff = total_width  - line.width
            if(shape.verticalAlign === VERTICAL_ALIGNMENT.TOP)        line.yoff = 0
            if(shape.verticalAlign === VERTICAL_ALIGNMENT.CENTER)     line.yoff = (total_height- lines_height)/2
            if(shape.verticalAlign === VERTICAL_ALIGNMENT.BASELINE)   line.yoff = total_height - lines_height
            if(shape.verticalAlign === VERTICAL_ALIGNMENT.BOTTOM)     line.yoff = total_height - lines_height
            line.yoff += (i+1)*line.height
        })

        //draw text
        c.fillStyle = shape.fillColor
        lines.forEach((line,i) => c.fillText(line.text,shape.x+line.xoff,shape.y+ line.yoff))
        //draw outline
        if (selected) {
            c.strokeStyle = 'red'
            c.strokeRect(shape.x + 0.5, shape.y + 0.5, total_width, total_height)
        }
    }

    calculateLines(shape,c) {
        const size_px = parseFloat(shape.fontSize)
        c.font = `normal ${size_px}px sans-serif`
        const lines = shape.text.split("\n").map(text => {
            return {
                text:text,
                width: c.measureText(text).width,
                height: size_px
            }
        })

        let total_width = 0
        let total_height = 0
        if(shape.autoFit) {
            total_width = lines.reduce((max, line) => Math.max(max,line.width),0)
            total_height = lines.reduce((total,line) => total + line.height,0)
        } else {
            total_width = shape.width
            total_height = shape.height
        }
        return {
            total_width:total_width,
            total_height: total_height,
            lines:lines,
            size_px:size_px
        }
    }

    insideRect(pt,x,y,w,h) {
        if (pt.x < x) return false
        if (pt.x > x + w) return false
        if (pt.y < y) return false
        if (pt.y > y + h) return false
        return true
    }

    isInside(pt,shape, canvas) {
        const c = canvas.getContext('2d')
        const {total_width, total_height} = this.calculateLines(shape,c)
        return this.insideRect(pt,shape.x,shape.y,total_width,total_height)
    }

    getBounds(newOrigin,shape, canvas) {
        const c = canvas.getContext('2d')
        const {total_width, total_height} = this.calculateLines(shape,c)
        return {
            x:newOrigin.x,
            y:newOrigin.y,
            width:total_width,
            height:total_height,
        }
    }


    toSVGString(obj) {
        return `<text x="${obj.x}" y="${obj.y}"
                     fill="${obj.fillColor}" fontSize="${obj.fontSize}"
                     fontFamily="${obj.fontFamily}"
                >${obj.text}</text>`
    }

}
