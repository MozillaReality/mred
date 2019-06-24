import {NONE_ASSET} from '../Common'
import {DoubleSide, MeshLambertMaterial} from 'three'

export default class ObjectDef {
    updateProperty(node, obj, op, provider) {
        if (op.name === 'tx') node.position.x = parseFloat(op.value)
        if (op.name === 'ty') node.position.y = parseFloat(op.value)
        if (op.name === 'tz') node.position.z = parseFloat(op.value)
        if (op.name === 'rx') node.rotation.x = parseFloat(op.value)
        if (op.name === 'ry') node.rotation.y = parseFloat(op.value)
        if (op.name === 'rz') node.rotation.z = parseFloat(op.value)
        if (op.name === 'sx') node.scale.x = parseFloat(op.value)
        if (op.name === 'sy') node.scale.y = parseFloat(op.value)
        if (op.name === 'sz') node.scale.z = parseFloat(op.value)
        if (op.name === 'visible') node.visible = op.value

        if (op.name === 'color') {
            let color = op.value
            if(color.indexOf('#') === 0) color = color.substring(1)
            node.material.color.set(parseInt(color,16))
        }

    }
    reset(node, obj) {
        node.position.set(obj.tx,obj.ty,obj.tz)
        node.visible = obj.visible
    }

    attachAsset(node, obj, provider) {
        if(obj.asset === NONE_ASSET.id) {
            node.material = new MeshLambertMaterial({color: obj.color, side:DoubleSide})
            return
        }
        provider.assetsManager.getTexture(obj.asset).then(tex => {
            provider.getLogger().log("loadded asset",obj.asset)
            provider.getLogger().log(tex)
            if(!tex) provider.getLogger().error("error loading asset",obj.asset)
            const opts = {
                color: obj.color,
                side: DoubleSide,
                map:tex
            }
            if(obj.transparent) {
                opts.transparent = true
                opts.alphaTest = 0.5
            }
            node.material = new MeshLambertMaterial(opts)
        }).catch(err => {
            provider.getLogger().error('error somwhere',err.message,err)
        })
    }
}
