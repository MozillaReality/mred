import {TYPES} from '../common/PropSheet'
import CubeDef from './CubeDef'
import SphereDef from './SphereDef'
import PlaneDef from './PlaneDef'
import ModelDef from './ModelDef'

const stdhints = {
    incrementValue:0.1,
}
export const PROP_DEFS = {
    title: {
        key:'title',
        name:'Title',
        type:TYPES.STRING
    },
    width: {
        key:'width',
        name:'Width',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    height: {
        key:'height',
        name:'Height',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    depth: {
        key:'depth',
        name:'Depth',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    radius: {
        key:'radius',
        name:'Radius',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    tx: {
        key:'tx',
        name:'TX',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    ty: {
        key:'ty',
        name:'TY',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    tz: {
        key:'tz',
        name:'TZ',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    rx: {
        key:'rx',
        name:'RX',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    ry: {
        key:'ry',
        name:'RY',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    rz: {
        key:'rz',
        name:'RZ',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    sx: {
        key:'sx',
        name:'SX',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    sy: {
        key:'sy',
        name:'SY',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    sz: {
        key:'sz',
        name:'SZ',
        type:TYPES.NUMBER,
        hints: stdhints
    },
    color: {
        key:'color',
        name:'Color',
        type:TYPES.COLOR,
        custom:true,
    },
    defaultFloor: {
        key:'defaultFloor',
        name:'Default Floor',
        type:TYPES.BOOLEAN
    },
    src: {
        key:'src',
        name:'src',
        type:TYPES.STRING,
    },
    asset: {
        key:'asset',
        name:'asset',
        type:TYPES.ENUM,
    },
    subtype: {
        key:'subtype',
        name:'kind',
        type:TYPES.STRING,
        locked:true,
    },
    format: {
        key:'format',
        name:'format',
        type:TYPES.STRING,
        locked:true,
    },
}

export const SIMPLE_COLORS = ["#ffffff","#ff0000","#ffff00","#00ff00","#00ffff","#0000ff","#ff00ff","#000000"]

export function is3DObjectType(type) {
    if(type === 'cube') return true
    if(type === 'sphere') return true
    if(type === 'plane') return true
    if(type === 'model') return true
    return false
}

export function get3DObjectDef(type) {
    if(type === 'cube') return new CubeDef()
    if(type === 'sphere') return new SphereDef()
    if(type === 'plane') return new PlaneDef()
    if(type === 'model') return new ModelDef()
    throw new Error(`unknown 3d object type ${type}`)
}

export const toRad = (degrees) => degrees*Math.PI/180

export function isImageType(type) {
    if (!type) return false
    if (type.toLowerCase() === 'image/png') return true
    if (type.toLowerCase() === 'image/jpeg') return true
    return false;
}

export function isGLTFFile(file) {
    if (!file) return false
    console.log("looking at the file", file, 'type', file.type, 'type')
    if (!file.type || file.type === '' || file.type.length === 0) {
        console.log("no mimetype. check extension")
        if (file.name.toLowerCase().indexOf(".gltf") > 0) return true
        if (file.name.toLowerCase().indexOf(".glb") > 0) return true
    }
    if (file.type.toLowerCase() === 'image/gltf') return true
    return false;
}

export const ITEM_ICONS = {
    plane: 'plane',
    cube: 'square',
    sphere: 'circle',
    model: 'cube',
    asset: 'file',
    assets: 'archive',
    scene: 'globe',
    image:'image',
}
