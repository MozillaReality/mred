import ObjectDef from './ObjectDef'
import {fetchGraphObject} from '../../syncgraph/utils'
import {HORIZONTAL_ALIGNMENT, OBJ_TYPES, PROP_DEFS} from '../Common'
import * as THREE from 'three'
import WebLayer3D from 'three-web-layer'

export default class TextDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.text,
            title:'some text',
            visible:true,
            text:'cool <b>formatted</b> <i>text</i>',
            cssStyle:`color:white;`,

            tx:0, ty:1.5, tz:-0.6,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,

            children:graph.createArray(),
            parent:scene.id
        }))
    }

    makeNode(obj) {
        const div = document.createElement('div')
        div.innerHTML = obj.text
        div.id = `div_${obj.id}`
        div.classList.add('weblayer-div')
        if(obj.cssStyle) div.setAttribute('style',obj.cssStyle)
        const divLayer = new WebLayer3D(div,{
            pixelRatio: window.devicePixelRatio,
        })

        divLayer.refresh(true)
        divLayer.userData.clickable = true
        const node = new THREE.Object3D()
        node.previewUpdate = function() {
            divLayer.update()
        }
        node.add(divLayer)
        node.userData.divLayer = divLayer
        node.userData.div = div
        node.name = obj.title
        node.userData.clickable = true
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        return node
    }

    updateProperty(node, obj, op, provider) {
        if(    op.name === PROP_DEFS.text.key) this.regenerateText(node,obj)
        if(    op.name === PROP_DEFS.cssStyle.key) this.regenerateText(node,obj)
        return super.updateProperty(node,obj,op,provider)
    }


    regenerateText(node, obj) {
        node.userData.div.innerHTML = obj.text
        if(obj.cssStyle) node.userData.div.setAttribute('style',obj.cssStyle)
        node.userData.divLayer.refresh(true)
    }
}



