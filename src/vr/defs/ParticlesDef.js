import {fetchGraphObject} from "../../syncgraph/utils";
import * as THREE from "three";
import ObjectDef from './ObjectDef'
import {OBJ_TYPES, PROP_DEFS} from '../Common'
import GPUParticles from './GPUParticles'
import {parseHex} from '../../utils'

const on = (elem,type,cb) => elem.addEventListener(type,cb)
export const rand = (min,max) => Math.random()*(max-min) + min

let COUNTER = 0

export default class ParticlesDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create cube w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.particles,
            title:'particles '+COUNTER++,
            visible:true,
            tx:0, ty:1.5, tz:-5,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            children:graph.createArray(),
            pointSize:10.0,
            lifetime:3.0,
            startColor:'#ff0000',
            endColor:'#0000ff',
            parent:scene.id,
            texture:null,
        }))
    }
    makeNode(obj) {
        let tex = null
        if(obj.texture) tex = new THREE.TextureLoader().load(obj.texture)
        const options = {
            velocity: new THREE.Vector3(0,1,0),
            position: new THREE.Vector3(0,0,0),
            size:obj.pointSize,
            lifetime:obj.lifetime,
            color: new THREE.Color(1.0,0.0,1.0),
            endColor: new THREE.Color(0,1,1),
        }

        const node = new GPUParticles({
            maxParticles: 10000,
            position: new THREE.Vector3(0,0,0),
            positionRandomness: 0.0,
            baseVelocity: new THREE.Vector3(0.0, 0.0, -1),
            velocity: new THREE.Vector3(0.0, 0.0, 0.0),
            velocityRandomness: 1.0,
            acceleration: new THREE.Vector3(0,0.0,0),
            baseColor: new THREE.Color(1.0,1.0,0.5),
            color: new THREE.Color(1.0,0,0),
            colorRandomness: 0.5,
            lifetime: 3,
            size: 10,
            sizeRandomness: 1.0,
            particleSpriteTex: tex,
            blending: THREE.AdditiveBlending,
            onTick: (system, time) => {
                options.velocity.set(rand(-1,1),1,rand(-1,1))
                system.spawnParticle(options);
            }
        })
        node.userData.options = options
        node.name = obj.title
        node.userData.clickable = false
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        return node
    }

    updateProperty(node, obj, op, provider) {
        if(op.name === PROP_DEFS.pointSize.key) return node.userData.options.size = obj.pointSize
        if(op.name === PROP_DEFS.lifetime.key) return node.userData.options.lifetime = obj.lifetime
        if(op.name === PROP_DEFS.startColor.key) return node.userData.options.color.set(obj.startColor)
        if(op.name === PROP_DEFS.endColor.key) return node.userData.options.endColor.set(obj.endColor)
        if(op.name === PROP_DEFS.texture.key) {
            const texture = provider.accessObject(obj.texture)
            if(texture) {
                const tex = new THREE.TextureLoader().load(texture.src)
                node.updateSprite(tex)
            }
            return
        }
        return super.updateProperty(node,obj,op,provider)
    }

}
