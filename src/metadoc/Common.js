import {TYPES} from "../common/PropSheet";
import RectDef from "./RectDef";
import CircleDef from "./CircleDef";
import TextDef from "./TextDef";
import ImageDef from "./ImageDef";

export const PROP_DEFS = {
    title: {
        key:'title',
        name:'Title',
        type:TYPES.STRING
    },
    x: {
        key:'x',
        name:'X',
        type:TYPES.NUMBER
    },
    y: {
        key:'y',
        name:'Y',
        type:TYPES.NUMBER
    },
    rx: {
        key:'rx',
        name:'RX',
        type:TYPES.NUMBER
    },
    ry: {
        key:'ry',
        name:'RY',
        type:TYPES.NUMBER
    },
    fillColor: {
        key:'fillColor',
        name:'color',
        type:TYPES.COLOR,
        custom:true,
    },
    width: {
        key:'width',
        name:'Width',
        type:TYPES.NUMBER
    },
    height: {
        key:'height',
        name:'Height',
        type:TYPES.NUMBER
    },
    radius: {
        key:'radius',
        name:'Radius',
        type:TYPES.NUMBER
    },
    text: {
        key:'text',
        name:'text',
        type:TYPES.STRING,
        hints: {
            multiline:true
        }
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

    autoFit: {
        key:'autoFit',
        name:'Size to Fit',
        type:TYPES.BOOLEAN,
        locked:false,
    },
    fontSize: {
        key:'fontSize',
        name:'Font Size',
        type:TYPES.STRING,
        locked:false,
    },
    fontFamily: {
        key:'fontFamily',
        name:'Font Family',
        type:TYPES.ENUM,
        locked:true,
    },
    fontWeight: {
        key:'fontWeight',
        name:'Font Weight',
        type:TYPES.ENUM,
        locked:true,
    },
    fontStyle: {
        key:'fontStyle',
        name:'Font Style',
        type:TYPES.ENUM,
        locked:true,
    },
    horizontalAlign: {
        key:'horizontalAlign',
        name:'H Align',
        type:TYPES.ENUM,
        locked:false,
    },
    verticalAlign: {
        key:'verticalAlign',
        name:'V Align',
        type:TYPES.ENUM,
        locked:false,
    },
}

export const SHAPE_DEFS = {
    rect: new RectDef(),
    circle: new CircleDef(),
    text: new TextDef(),
    image: new ImageDef(),
}

export const ICONS = {
    page:'file',
    layer:'sticky-note',
    rect:'square',
    circle:'circle',
    text:'font',
    plane:'plane',
    image:'image',
    model:'cube'
}

export const VERTICAL_ALIGNMENT = {
    TOP:'TOP',
    BASELINE:'BASELINE',
    CENTER:'CENTER',
    BOTTOM:'BOTTOM',
}
export const HORIZONTAL_ALIGNMENT = {
    LEFT:'LEFT',
    CENTER:'CENTER',
    RIGHT:'RIGHT',
}

export const STANDARD_FONTS = {
    SERIF:'serif',
    SANSSERIF:'sans-serif',
    MONOSPACE:'monospace',
}

export const FONT_WEIGHTS = {
    NORMAL:'normal',
    BOLD:'bold'
}

export const FONT_STYLES = {
    NORMAL:'normal',
    ITALIC:'italic',
    OBLIQUE:'oblique'
}



export function isShapeType(type) {
    if(type === 'rect') return true
    if(type === 'circle') return true
    if(type === 'text') return true
    if(type === 'image') return true
    return false
}
