import {TYPES} from '../common/PropSheet'
import CubeDef from './defs/CubeDef'
import SphereDef from './defs/SphereDef'
import PlaneDef from './defs/PlaneDef'
import ModelDef from './defs/ModelDef'
import BG360Def from './defs/BG360Def'
import TextDef from './defs/TextDef'
import Image2DDef from './defs/Image2DDef'
import GroupDef from './defs/GroupDef'
import ParticlesDef from './defs/ParticlesDef'
import ImageAnchorDef from './defs/ImageAnchorDef'
import GeoAnchorDef from './defs/GeoAnchorDef'
import {HudAnchorDef} from './defs/HudAnchorDef'

export const NONE_ASSET = {
    id:-30,
    title:'NONE'
}

const stdhints = {
    incrementValue:0.1,
}
export const PROP_DEFS = {
    title: {
        key:'title',
        name:'Title',
        type:TYPES.STRING
    },
    description: {
        key:'description',
        name:'Description',
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
        locked:true,
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
    imageOffsetAngle: {
        key:'imageOffsetAngle',
        name:'Image Offset Angle',
        type:TYPES.NUMBER,
        hints: {
            incrementValue:0.05,
        }
    },
    imageCropStartAngle: {
        key:'imageCropStartAngle',
        name:'Image Crop Start Angle',
        type:TYPES.NUMBER,
        hints: {
            incrementValue:0.05,
        }
    },
    imageCropEndAngle: {
        key:'imageCropEndAngle',
        name:'Image Crop End Angle',
        type:TYPES.NUMBER,
        hints: {
            incrementValue:0.05,
        }
    },
    imageRealworldWidth: {
        key:'imageRealworldWidth',
        name:'Image width in meters',
        type: TYPES.NUMBER,
        hints: {
            incrementValue:0.01
        }
    },
    recType: {
        key:'recType',
        name:'Recognition Type',
        type: TYPES.ENUM,
    },

    targetImage: {
        key:'targetImage',
        name:'Image to Recognize',
        type: TYPES.ENUM,
    },

    targetGeoLocation: {
        key:'targetGeoLocation',
        name:'Target Location',
        type: TYPES.ENUM,
    },

    splashImage: {
        key:'splashImage',
        name:'Splash Image',
        type: TYPES.ENUM,
    },

    text: {
        key:'text',
        name:'Text',
        type:TYPES.STRING,
        hints: {
            multiline:true
        }
    },
    fontSize: {
        key:'fontSize',
        name:'Font Size',
        type:TYPES.NUMBER,
    },
    padding: {
        key:'padding',
        name:'Padding',
        type:TYPES.NUMBER,
    },
    borderWidth: {
        key:'borderWidth',
        name:'Border width',
        type:TYPES.NUMBER,
    },
    borderRadius: {
        key:'borderRadius',
        name:'Corner Size',
        type:TYPES.NUMBER,
    },
    horizontalAlign: {
        key:'horizontalAlign',
        name:'H Align',
        type:TYPES.ENUM,
        locked:false,
    },
    textColor: {
        key:'textColor',
        name:'Text Color',
        type:TYPES.COLOR,
        custom:true,
    },
    backgroundColor: {
        key:'backgroundColor',
        name:'BG Color',
        type:TYPES.COLOR,
        custom:true,
    },
    borderColor: {
        key:'borderColor',
        name:'Border Color',
        type:TYPES.COLOR,
        custom:true,
    },
    startColor: {
        key:'startColor',
        name:'Start',
        type:TYPES.COLOR,
        custom:true,
    },
    endColor: {
        key:'endColor',
        name:'End',
        type:TYPES.COLOR,
        custom:true,
    },
    drawBackground: {
        key:'drawBackground',
        name:'BG?',
        type:TYPES.BOOLEAN,
    },
    scriptBody: {
        key:'scriptBody',
        name:'code',
        type:TYPES.STRING,
        hints: {
            multiline:true
        }
    },
    defaultScene: {
        key:'defaultScene',
        name:'Start Scene',
        type:TYPES.ENUM,
    },
    visible: {
        key:'visible',
        name:'Visible',
        type:TYPES.BOOLEAN
    },

    reactivate: {
        key: 'reactivate',
        name: "Reactivate Image Search",
        type: TYPES.BOOLEAN
    },

    pointSize: {
        key:'pointSize',
        name:'Point Size',
        type:TYPES.NUMBER,
    },
    lifetime: {
        key:'lifetime',
        name:'Lifetime',
        type:TYPES.NUMBER,
        hints: stdhints,
    },
    texture: {
        key:'texture',
        name:'texture',
        type:TYPES.ENUM,
    },
    cssStyle: {
        key:'cssStyle',
        name:'Style',
        type:TYPES.STRING,
        hints: {
            multiline:true
        }
    },
    latitude: {
        key:'latitude',
        name:"Latitude",
        type:TYPES.NUMBER, //value in degrees
    },
    longitude: {
        key:'longitude',
        name:"Longitude",
        type:TYPES.NUMBER, //value in degrees
    },
    altitude: {
        key:'altitude',
        name:"altitude",
        type:TYPES.NUMBER, //value in meters
    },
    useAltitude: {
        key:'useAltitude',
        name:"use altitude?",
        type:TYPES.BOOLEAN,
    },
    autoRecenter: {
        key:'autoRecenter',
        name:"Recenter on Load",
        type:TYPES.BOOLEAN
    }
}

export const SIMPLE_COLORS = ["#ffffff","#ff0000","#ffff00","#00ff00","#00ffff","#0000ff","#ff00ff","#000000"]

export const OBJ_TYPES = {
    cube:'cube',
    sphere:'sphere',
    plane:'plane',
    model:'model',
    bg360:'bg360',
    text:'text',
    img2d:'img2d',
    group:'group',
    particles:'particles',
    imageanchor:'imageanchor',
    geoanchor:'geoanchor',
    hudanchor:'hudanchor',
}

export const TOTAL_OBJ_TYPES = {
    SCENE:'scene',
    ASSET:'asset',
    BEHAVIOR:'behavior',
    BEHAVIOR_SCRIPT:'behavior_script',
    ASSETS_LIST: 'assets',
    BEHAVIORS_LIST: 'behaviors',
    ROOT: 'root'
}
export const HORIZONTAL_ALIGNMENT = {
    LEFT:'LEFT',
    CENTER:'CENTER',
    RIGHT:'RIGHT',
}


export function is3DObjectType(type) {
    if(type === OBJ_TYPES.cube) return true
    if(type === OBJ_TYPES.sphere) return true
    if(type === OBJ_TYPES.plane) return true
    if(type === OBJ_TYPES.model) return true
    if(type === OBJ_TYPES.text) return true
    if(type === OBJ_TYPES.bg360) return true
    if(type === OBJ_TYPES.img2d) return true
    if(type === OBJ_TYPES.group) return true
    if(type === OBJ_TYPES.particles) return true
    if(type === OBJ_TYPES.imageanchor) return true
    if(type === OBJ_TYPES.geoanchor) return true
    if(type === OBJ_TYPES.hudanchor) return true
    return false
}

export function canHaveShape(type) {
    if(type === OBJ_TYPES.group) return true
    if(type === OBJ_TYPES.imageanchor) return true
    if(type === OBJ_TYPES.geoanchor) return true
    if(type === OBJ_TYPES.hudanchor) return true
    if(type === TOTAL_OBJ_TYPES.SCENE) return true
    return false
}

export function canHaveBehavior(type) {
    if(is3DObjectType(type)) return true
    if(type === TOTAL_OBJ_TYPES.SCENE) return true
    return false
}

export function canHaveScene(type) {
    if(type === TOTAL_OBJ_TYPES.ROOT) return true
    return false
}

export function canBeDeleted(type) {
    if(type === TOTAL_OBJ_TYPES.ROOT) return false
    if(type === TOTAL_OBJ_TYPES.ASSETS_LIST) return false
    if(type === TOTAL_OBJ_TYPES.BEHAVIORS_LIST) return false
    return true
}

export function get3DObjectDef(type) {
    if(type === OBJ_TYPES.cube) return new CubeDef()
    if(type === OBJ_TYPES.sphere) return new SphereDef()
    if(type === OBJ_TYPES.plane) return new PlaneDef()
    if(type === OBJ_TYPES.model) return new ModelDef()
    if(type === OBJ_TYPES.bg360) return new BG360Def()
    if(type === OBJ_TYPES.text) return new TextDef()
    if(type === OBJ_TYPES.img2d) return new Image2DDef()
    if(type === OBJ_TYPES.group) return new GroupDef()
    if(type === OBJ_TYPES.particles) return new ParticlesDef()
    if(type === OBJ_TYPES.imageanchor) return new ImageAnchorDef()
    if(type === OBJ_TYPES.geoanchor) return new GeoAnchorDef()
    if(type === OBJ_TYPES.hudanchor) return new HudAnchorDef()
    throw new Error(`unknown 3d object type ${type}`)
}

export const toRad = (degrees) => degrees*Math.PI/180

export const MIME_TYPES = {
    PNG:'image/png',
    JPEG:'image/jpeg',
    GIF:'image/gif',
    MP3: 'audio/mpeg',
    AAC: 'audio/aac',
    WAV:'audio/wav',
    JAVASCRIPT: 'text/javascript',
    GLB: 'model/gltf-binary',
    MP4:'video/mp4',
}
export const ASSET_TYPES = {
    BEHAVIOR:'behavior',
    IMAGE:'image',
    GLTF: 'gltf',
    AUDIO:'audio',
    VIDEO:'video',
    GEOLOCATION: 'geolocation'
}
export function isImageType(type) {
    if (!type) return false
    if (type.toLowerCase() === MIME_TYPES.PNG) return true
    if (type.toLowerCase() === MIME_TYPES.JPEG) return true
    if (type.toLowerCase() === MIME_TYPES.GIF) return true
    return false;
}
export function isAudioType(type) {
    if(!type) return false
    if(type.toLowerCase() === MIME_TYPES.MP3) return true
    if(type.toLowerCase() === MIME_TYPES.AAC) return true
    if(type.toLowerCase() === MIME_TYPES.WAV) return true
    return false
}

export function isVideoType(type) {
    if(!type) return false
    if(type.toLowerCase() === MIME_TYPES.MP4) return true
    return false
}
export function isGLTFType(type) {
    if(!type) return false
    if(type.toLowerCase() === MIME_TYPES.GLB) return true
    return false
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
    behavior:'superpowers',
    behavior_script:'superpowers',
    scene: 'globe',
    bg360:'image',
    img2d:'image',
    image:'image',
    text:'font',
    audio:'music',
    video:'video-camera',
    group:'object-group',
    particles:'certificate',
    gltf:'cube',
    imageanchor:'anchor',
    geoanchor:'globe',
    geolocation:'globe',
    hudanchor: 'eye',

    cut:'cut',
    copy:'copy',
    paste:'paste',
    delete:'close'
}


export function parseBehaviorScript(contents) {
    return Function(`"use strict";
    const toRadians = (deg) => Math.PI/180*deg; 
    return(${contents})`)();
}

export const REC_TYPES = {
    SCENE_START:'SCENE_START'
}