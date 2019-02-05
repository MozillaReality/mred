import {fetchGraphObject} from "../syncgraph/utils";

export default class ImageDef {
    make(graph,layer) {
        return fetchGraphObject(graph,graph.createObject({
            type:'image',
            title:'image',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            asset:0,
            parent:layer.id,
        }))
    }

    draw(c,g,shape,selected, provider) {
        if(shape.asset) {
            const src = g.getPropertyValue(shape.asset,'src')
            if(provider.isImageCached(src)) {
                c.drawImage(provider.getCachedImage(src),shape.x,shape.y,shape.width,shape.height)
            } else {
                provider.requestImageCache(src)
                c.fillStyle = 'aqua'
                c.fillRect(shape.x,shape.y,shape.width,shape.height)
            }
        }
        if (selected) {
            c.strokeStyle = 'red'
            c.strokeRect(shape.x,shape.y,shape.width, shape.height)
        }
    }

    isInside(pt,shape) {
        if (pt.x < shape.x) return false
        if (pt.x > shape.x + shape.width) return false
        if (pt.y < shape.y) return false
        if (pt.y > shape.y + shape.height) return false
        return true
    }
}
