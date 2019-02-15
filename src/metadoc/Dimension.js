export const UNITS = {
    PIXEL:{
        name:'pixel',
        matches:['pixel','pixels','px'],
        short:'px'
    },
    MILLIMETER: {
        name:'millimeter',
        matches:['mm'],
        short:'mm'
    }
}
export const DEFAULT_DPI = 72

export function parseDimension(str) {
    if(str.value) str = str.value
    // console.log("parsing dimension",str)

    const parts = str.trim().match(/(\d+)\s*x\s*(\d+)\s*(px|mm)/)
    // console.log("parsed parts",parts)
    if(parts[3] === 'px') {
        return new Dimension(parseInt(parts[1]),parseInt(parts[2]),UNITS.PIXEL)
    }
    if(parts[3] === 'mm') {
        return new Dimension(parseInt(parts[1]),parseInt(parts[2]),UNITS.MILLIMETER)
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
        if(this.unit.name === UNITS.MILLIMETER.name && unit.name===UNITS.PIXEL.name) {
            const in_per_mm = 0.0393701
            const px_per_in = dpi
            return new Dimension(
                this.width*in_per_mm*px_per_in*scale*1,  // 100mm at dpi of 76 is 76 px/in * mm/in 0.0393701
                this.height*in_per_mm*px_per_in*scale*1,  // 100mm at dpi of 76 is 76 px/in * mm/in 0.0393701
                unit
            )
        }
        return new Dimension(
            this.width*scale,
            this.height*scale,
            unit,
        )
    }
}