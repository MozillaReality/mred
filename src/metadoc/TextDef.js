import {createGraphObjectFromObject, fetchGraphObject} from "../syncgraph/utils";

export default class TextDef {
    make(graph,layer) {
        const text = fetchGraphObject(graph,createGraphObjectFromObject(graph,{
            type:'text',
            title:'text',
            text:'title text',
            x: 100,
            y: 100,
            fillColor: '#ff00ff',
            parent:layer.id,
        }))
        return text
    }

    draw(c,g,shape,selected) {
        c.fillStyle = shape.fillColor
        c.font = 'normal 30px sans-serif'
        c.fillText(shape.text,shape.x,shape.y)
        if (selected) {
            c.strokeStyle = 'red'
            const metrics = c.measureText(shape.text)
            c.strokeRect(shape.x,shape.y-30,metrics.width,30)
        }
    }

    isInside(pt,shape, canvas) {
        const c = canvas.getContext('2d')
        c.font = 'normal 30px sans-serif'
        const metrics = c.measureText(shape.text)
        const w = metrics.width
        const h = 30
        if (pt.x < shape.x) return false
        if (pt.x > shape.x + w) return false
        if (pt.y < shape.y - h) return false
        if (pt.y > shape.y) return false
        return true

    }
}
