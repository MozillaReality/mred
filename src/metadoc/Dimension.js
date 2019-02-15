export const UNITS = {
    PIXEL:{
        name:'pixel',
        matches:['pixel','pixels','px'],
        short:'px'
    },
}
export const DEFAULT_DPI = 72

export function parseDimension(str) {
    // console.log("parsing dimension",str)

    const parts = str.trim().match(/(\d+)\s*x\s*(\d+)\s*(px)/)
    // console.log("parsed parts",parts)
    if(parts[3] === 'px') {
        return new Dimension(parseInt(parts[1]),parseInt(parts[2]),UNITS.PIXEL)
    }
    return new Dimension(100,100,UNITS.PIXEL)
}
export class Dimension {
    constructor(width,height,unit) {
        this.width = width
        this.height = height
        this.unit = unit
    }

    as(unit, scale, dpi) {
        return new Dimension(
            this.width*scale,
            this.height*scale,
            unit,
        )
    }
}