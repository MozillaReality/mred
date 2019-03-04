import * as THREE from 'three'
import {POINTER_ENTER, POINTER_EXIT, POINTER_MOVE, POINTER_PRESS, POINTER_RELEASE} from 'webxr-boilerplate/pointer'


const on = (elem,type,cb) => elem.addEventListener(type,cb)
const off = (elem,type,cb) => elem.removeEventListener(type,cb)
const toRad = (degrees) => degrees*Math.PI/180

export default class TranslationArrow extends THREE.Group {
    constructor(axis, control) {
        super()
        this.axis = axis
        this.control = control
        this.makePlane()
        this.makeArrow()
        this.makeInputGrabber()
    }

    makePlane() {
        this.plane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(100, 100, 100, 100),
            new THREE.MeshBasicMaterial({visible: true, wireframe: true, side: THREE.DoubleSide})
        )
        if (this.axis === 'Z') this.plane.rotation.y = toRad(90)
        this.plane.userData.draggable = true
        this.plane.visible = false
        this.add(this.plane)
    }

    makeArrow() {
        this.arrow = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.02, 0.02, 4),
            new THREE.MeshLambertMaterial({color: 'yellow'})
        )
        if (this.axis === 'X') this.arrow.rotation.z = toRad(90)
        if (this.axis === 'Y') this.arrow.rotation.z = toRad(180)
        if (this.axis === 'Z') this.arrow.rotation.x = toRad(90)
        this.add(this.arrow)
    }

    makeInputGrabber() {
        this.input = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.1, 0.1, 4),
            new THREE.MeshLambertMaterial({color: 'green', visible: false})
        )
        if (this.axis === 'X') this.input.rotation.z = toRad(90)
        if (this.axis === 'Y') this.input.rotation.z = toRad(180)
        if (this.axis === 'Z') this.input.rotation.x = toRad(90)
        this.input.userData.clickable = true
        this.add(this.input)
    }

    attach() {
        on(this.input, POINTER_ENTER, this.startHover)
        on(this.input, POINTER_EXIT, this.endHover)
        on(this.input, POINTER_PRESS, this.beginDrag)
    }

    detach() {
        off(this.input, POINTER_ENTER, this.startHover)
        off(this.input, POINTER_EXIT, this.endHover)
        off(this.input, POINTER_PRESS, this.beginDrag)
    }

    startHover = () => this.arrow.material.color.set(0xffffff)
    endHover = () => this.arrow.material.color.set(0xffff00)

    beginDrag = (e) => {
        this.startPoint = this.parent.position.clone()
        this.startPoint.copy(e.intersection.point)
        this.parent.target.parent.worldToLocal(this.startPoint)
        this.oldFilter = this.parent.pointer.intersectionFilter
        this.parent.pointer.intersectionFilter = (obj) => obj.userData.draggable
        this.startPosition = this.parent.target.position.clone()
        this.plane.visible = true
        on(this.plane, POINTER_MOVE, this.updateDrag)
        on(this.plane, POINTER_RELEASE, this.endDrag)
    }
    updateDrag = (e) => {
        this.endPoint = e.intersection.point.clone()
        this.parent.target.parent.worldToLocal(this.endPoint)
        //neutralize y and z
        if (this.axis === 'X') {
            this.endPoint.y = this.startPoint.y
            this.endPoint.z = this.startPoint.z
        }
        if (this.axis === 'Y') {
            this.endPoint.x = this.startPoint.x
            this.endPoint.z = this.startPoint.z
        }
        if (this.axis === 'Z') {
            this.endPoint.x = this.startPoint.x
            this.endPoint.y = this.startPoint.y
        }
        const diff = this.endPoint.clone().sub(this.startPoint)
        const finalPoint = this.startPosition.clone().add(diff)
        this.parent.target.position.copy(finalPoint)
        this.parent.position.copy(finalPoint)
    }
    endDrag = (e) => {
        off(this.plane, POINTER_MOVE, this.updateDrag)
        off(this.plane, POINTER_RELEASE, this.endDrag)
        this.parent.pointer.intersectionFilter = this.oldFilter
        this.plane.visible = false
        this.parent.dispatchEvent({
            type: 'change',
            start: this.startPosition.clone(),
            end: this.parent.position.clone()
        })
    }
}
