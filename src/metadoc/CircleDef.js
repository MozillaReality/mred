import {createGraphObjectFromObject, fetchGraphObject} from "../syncgraph/utils";

export default class CircleDef {
    make(graph,layer) {
        return fetchGraphObject(graph,createGraphObjectFromObject(graph, {
            type: 'circle',
            title: 'circle',
            x: 100,
            y: 100,
            radius: 50,
            fillColor: '#ffff00',
            parent: layer.id,
        }))
    }


    draw(c,g,shape,selected) {
        c.fillStyle = 'gray'
        c.fillStyle = shape.fillColor
        c.beginPath()
        c.arc(shape.x, shape.y, shape.radius, 0, Math.PI*2)
        c.fill()
        if (selected) {
            c.strokeStyle = 'red'
            c.strokeRect(shape.x-shape.radius+0.5,shape.y-shape.radius+0.5,shape.radius*2, shape.radius*2)
        }
    }

    isInside(pt,shape) {
        if(Math.pow(shape.x-pt.x,2) + Math.pow(shape.y - pt.y,2) < Math.pow(shape.radius,2)) return true
        return false
    }

    getBounds(newOrigin,shape, canvas) {
        return {
            x:newOrigin.x,
            y:newOrigin.y,
            width:shape.radius*2,
            height:shape.radius*2,
        }
    }

    toSVGString(obj) {
        return `<circle cx="${obj.x}" cy="${obj.y}" r="${obj.radius}" fill="${obj.fillColor}"/>`
    }

}
