import {PROP_TYPES} from 'react-visual-editor-framework'
import CubeDef from './defs/CubeDef'
import SphereDef from './defs/SphereDef'
import PlaneDef from './defs/PlaneDef'
import ModelDef from './defs/ModelDef'
import BG360Def from './defs/BG360Def'
import TextDef from './defs/TextDef'
import Image2DDef from './defs/Image2DDef'
import GroupDef from './defs/GroupDef'
import ParticlesDef from './defs/ParticlesDef'
import PortalDef from './defs/PortalDef'
import LocalAnchorDef from './defs/LocalAnchorDef'
import ImageAnchorDef from './defs/ImageAnchorDef'
import GeoAnchorDef from './defs/GeoAnchorDef'
import {HudAnchorDef} from './defs/HudAnchorDef'
import CloneDef from './defs/CloneDef'

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
        type:PROP_TYPES.STRING
    },
    description: {
        key:'description',
        name:'Description',
        type:PROP_TYPES.STRING
    },
    width: {
        key:'width',
        name:'Width',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    height: {
        key:'height',
        name:'Height',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    depth: {
        key:'depth',
        name:'Depth',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    radius: {
        key:'radius',
        name:'Radius',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    tx: {
        key:'tx',
        name:'TX',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    ty: {
        key:'ty',
        name:'TY',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    tz: {
        key:'tz',
        name:'TZ',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    rx: {
        key:'rx',
        name:'RX',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    ry: {
        key:'ry',
        name:'RY',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    rz: {
        key:'rz',
        name:'RZ',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    sx: {
        key:'sx',
        name:'SX',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    sy: {
        key:'sy',
        name:'SY',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    sz: {
        key:'sz',
        name:'SZ',
        type:PROP_TYPES.NUMBER,
        hints: stdhints
    },
    color: {
        key:'color',
        name:'Color',
        type:PROP_TYPES.COLOR,
        custom:true,
    },
    defaultFloor: {
        key:'defaultFloor',
        name:'Default Floor',
        type:PROP_TYPES.BOOLEAN
    },
    src: {
        key:'src',
        name:'src',
        type:PROP_TYPES.STRING,
        locked:true,
    },
    asset: {
        key:'asset',
        name:'asset',
        type:PROP_TYPES.ENUM,
    },
    subtype: {
        key:'subtype',
        name:'kind',
        type:PROP_TYPES.STRING,
        locked:true,
    },
    format: {
        key:'format',
        name:'format',
        type:PROP_TYPES.STRING,
        locked:true,
    },
    imageOffsetAngle: {
        key:'imageOffsetAngle',
        name:'Image Offset Angle',
        type:PROP_TYPES.NUMBER,
        hints: {
            incrementValue:0.05,
        }
    },
    imageCropStartAngle: {
        key:'imageCropStartAngle',
        name:'Image Crop Start Angle',
        type:PROP_TYPES.NUMBER,
        hints: {
            incrementValue:0.05,
        }
    },
    imageCropEndAngle: {
        key:'imageCropEndAngle',
        name:'Image Crop End Angle',
        type:PROP_TYPES.NUMBER,
        hints: {
            incrementValue:0.05,
        }
    },
    transparent: {
        key:'transparent',
        name:"Transparent",
        type:PROP_TYPES.BOOLEAN
    },
    imageRealworldWidth: {
        key:'imageRealworldWidth',
        name:'Image width in meters',
        type: PROP_TYPES.NUMBER,
        hints: {
            incrementValue:0.01
        }
    },
    recType: {
        key:'recType',
        name:'Recognition Type',
        type: PROP_TYPES.ENUM,
    },

    targetImage: {
        key:'targetImage',
        name:'Image to Recognize',
        type: PROP_TYPES.ENUM,
    },

    targetGeoLocation: {
        key:'targetGeoLocation',
        name:'Target Location',
        type: PROP_TYPES.ENUM,
    },

    splashImage: {
        key:'splashImage',
        name:'Splash Image',
        type: PROP_TYPES.ENUM,
    },

    text: {
        key:'text',
        name:'Text',
        type:PROP_TYPES.STRING,
        hints: {
            multiline:true
        }
    },
    fontSize: {
        key:'fontSize',
        name:'Font Size',
        type:PROP_TYPES.NUMBER,
    },
    padding: {
        key:'padding',
        name:'Padding',
        type:PROP_TYPES.NUMBER,
    },
    borderWidth: {
        key:'borderWidth',
        name:'Border width',
        type:PROP_TYPES.NUMBER,
    },
    borderRadius: {
        key:'borderRadius',
        name:'Corner Size',
        type:PROP_TYPES.NUMBER,
    },
    horizontalAlign: {
        key:'horizontalAlign',
        name:'H Align',
        type:PROP_TYPES.ENUM,
        locked:false,
    },
    textColor: {
        key:'textColor',
        name:'Text Color',
        type:PROP_TYPES.COLOR,
        custom:true,
    },
    backgroundColor: {
        key:'backgroundColor',
        name:'BG Color',
        type:PROP_TYPES.COLOR,
        custom:true,
    },
    borderColor: {
        key:'borderColor',
        name:'Border Color',
        type:PROP_TYPES.COLOR,
        custom:true,
    },
    startColor: {
        key:'startColor',
        name:'Start',
        type:PROP_TYPES.COLOR,
        custom:true,
    },
    endColor: {
        key:'endColor',
        name:'End',
        type:PROP_TYPES.COLOR,
        custom:true,
    },
    drawBackground: {
        key:'drawBackground',
        name:'BG?',
        type:PROP_TYPES.BOOLEAN,
    },
    scriptBody: {
        key:'scriptBody',
        name:'code',
        type:PROP_TYPES.STRING,
        hints: {
            multiline:true
        }
    },
    defaultScene: {
        key:'defaultScene',
        name:'Start Scene',
        type:PROP_TYPES.ENUM,
    },
    visible: {
        key:'visible',
        name:'Visible',
        type:PROP_TYPES.BOOLEAN
    },

    reactivate: {
        key: 'reactivate',
        name: "Reactivate Image Search",
        type: PROP_TYPES.BOOLEAN
    },

    pointSize: {
        key:'pointSize',
        name:'Point Size',
        type:PROP_TYPES.NUMBER,
    },
    lifetime: {
        key:'lifetime',
        name:'Lifetime',
        type:PROP_TYPES.NUMBER,
        hints: stdhints,
    },
    texture: {
        key:'texture',
        name:'texture',
        type:PROP_TYPES.ENUM,
    },
    cssStyle: {
        key:'cssStyle',
        name:'Style',
        type:PROP_TYPES.STRING,
        hints: {
            multiline:true
        }
    },
    latitude: {
        key:'latitude',
        name:"Latitude",
        type:PROP_TYPES.NUMBER, //value in degrees
    },
    longitude: {
        key:'longitude',
        name:"Longitude",
        type:PROP_TYPES.NUMBER, //value in degrees
    },
    altitude: {
        key:'altitude',
        name:"altitude",
        type:PROP_TYPES.NUMBER, //value in meters
    },
    useAltitude: {
        key:'useAltitude',
        name:"use altitude?",
        type:PROP_TYPES.BOOLEAN,
    },
    autoRecenter: {
        key:'autoRecenter',
        name:"Recenter on Load",
        type:PROP_TYPES.BOOLEAN
    },

    cloneTarget: {
        key:'cloneTarget',
        name:'clone target',
        type: PROP_TYPES.ENUM,
    },
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
    portal:'portal',
    localanchor:'localanchor',
    imageanchor:'imageanchor',
    geoanchor:'geoanchor',
    hudanchor:'hudanchor',
    clone:'clone',
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
    if(type === OBJ_TYPES.portal) return true
    if(type === OBJ_TYPES.localanchor) return true
    if(type === OBJ_TYPES.imageanchor) return true
    if(type === OBJ_TYPES.geoanchor) return true
    if(type === OBJ_TYPES.hudanchor) return true
    if(type === OBJ_TYPES.clone) return true
    return false
}

export function canHaveShape(type) {
    if(type === OBJ_TYPES.group) return true
    if(type === OBJ_TYPES.portal) return true
    if(type === OBJ_TYPES.localanchor) return true
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
    if(type === OBJ_TYPES.portal) return new PortalDef()
    if(type === OBJ_TYPES.localanchor) return new LocalAnchorDef()
    if(type === OBJ_TYPES.imageanchor) return new ImageAnchorDef()
    if(type === OBJ_TYPES.geoanchor) return new GeoAnchorDef()
    if(type === OBJ_TYPES.hudanchor) return new HudAnchorDef()
    if(type === OBJ_TYPES.clone) return new CloneDef()
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
    MOV:'video/quicktime',
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
    if(type.toLowerCase() === MIME_TYPES.MOV) return true
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
    plane: 'fa fa-plane',
    cube: 'fa fa-square',
    sphere: 'fa fa-circle',
    model: 'fa fa-cube',
    asset: 'fa fa-file',
    assets: 'fa fa-archive',
    behavior:'fab fa-superpowers',
    behavior_script:'fab fa-superpowers',
    scene: 'fa fa-globe',
    bg360:'fa fa-image',
    img2d:'fa fa-image',
    image:'fa fa-file-image',
    text:'fa fa-font',
    audio:'fa fa-file-audio',
    video:'fas fa-file-video',
    group:'fa fa-object-group',
    particles:'fa fa-certificate',
    portal:'fa fa-object-group',
    gltf:'fa fa-cube',
    localanchor:'fa fa-anchor',
    imageanchor:'fa fa-anchor',
    geoanchor:'fa fa-globe',
    geolocation:'fas fa-globe-americas',
    hudanchor: 'fa fa-eye',

    cut:'fa fa-cut',
    copy:'fa fa-copy',
    paste:'fa fa-paste',
    delete:'fa fa-close'
}


export function parseBehaviorScript(contents) {
    // eslint-disable-next-line
    return Function(`"use strict";
    const toRadians = (deg) => Math.PI/180*deg; 
    return(${contents})`)();
}

export const REC_TYPES = {
    SCENE_START:'SCENE_START'
}
