import * as THREE from 'three'

export default class BoxAccessor {
    constructor(box, obj) {
        this.box = box
        this.obj = obj
    }


    setWidth(value) {
        this.box.geometry = new THREE.BoxGeometry(this.obj.width,this.obj.height,this.obj.depth)
    }
    setHeight(value) {
        this.box.geometry = new THREE.BoxGeometry(this.obj.width,this.obj.height,this.obj.depth)
    }
    setDepth(value) {
        this.box.geometry = new THREE.BoxGeometry(this.obj.width,this.obj.height,this.obj.depth)
    }

    updateProperty(op) {
        if (op.name === 'width') this.setWidth(op.value)
        if (op.name === 'height') this.setHeight(op.value)
        if (op.name === 'depth') this.setDepth(op.value)
        if (op.name === 'tx') this.box.position.x = parseFloat(op.value)
        if (op.name === 'ty') this.box.position.y = parseFloat(op.value)
        if (op.name === 'tz') this.box.position.z = parseFloat(op.value)
    }
}
