import {fetchGraphObject} from "../syncgraph/utils";

export default class RectDef {
    make(graph,layer) {
        return fetchGraphObject(graph,graph.createObject({
            type:'rect',
            title:'second rect',
            x: 100,
            y: 100,
            rx:20,
            ry:20,
            width: 100,
            height: 100,
            fillColor: '#ff00ff',
            parent:layer.id,
        }))
    }

    draw(c,g,shape,selected) {
        c.fillStyle = 'gray'
        c.fillStyle = shape.fillColor
        if(shape.rx > 0 || shape.ry > 0) {
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
            c.closePath()
            c.fill()
        } else {
            c.fillRect(shape.x, shape.y, shape.width, shape.height)
        }

        if (selected) {
            c.strokeStyle = 'red'
            c.strokeRect(shape.x,shape.y,shape.width, shape.height)
        }

    }

    isInside(pt,shape) {
        if (pt.x < shape.x) return false
        if (pt.x > shape.x + shape.w) return false
        if (pt.y < shape.y) return false
        if (pt.y > shape.y + shape.h) return false
        return true
    }

    toSVGString(obj) {
        return `<rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${obj.fillColor}"/>`
    }

}
