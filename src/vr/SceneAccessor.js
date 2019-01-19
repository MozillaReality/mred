import * as THREE from 'three'

export class SceneAccessor {
    constructor(scene) {
        this.scene = scene
    }

    setDefaultFloor(val) {
        if (val === true) {
            const floor = new THREE.Mesh(
                new THREE.PlaneBufferGeometry(100, 100, 10, 10),
                new THREE.MeshLambertMaterial({color: 'blue'})
            )
            floor.rotation.x = -90 * Math.PI / 180
            this.scene.parts = {}
            this.scene.parts.floor = floor
            this.scene.add(floor)
        } else {
            if (this.scene.parts.floor) {
                this.scene.remove(this.scene.parts.floor)
                delete this.scene.parts.floor
            }
        }
    }

    getFloor() {
        return this.scene.parts.floor
    }
}
