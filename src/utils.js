export function parseOptions(opts) {
    let loc = document.location
    if (loc.search) {
        const parts = loc.search.substring(1).split('&')
        parts.forEach((part)=>{
            const keyval = part.split('=')
            opts[keyval[0]] = keyval[1]
        })
    }
    return opts;
}

export function genID(prefix) {
    return `${prefix}_${Math.floor(Math.random() * 10000)}`
}

export function makePoint(x,y) {
    return {
        x:x,
        y:y,
        minus: function(pt) {
            return makePoint(this.x-pt.x, this.y-pt.y);
        },
        add: function(pt) {
            return makePoint(this.x+pt.x, this.y+pt.y);
        },
        divide: function(v) {
            return makePoint(this.x/v,this.y/v)
        },
        multiply: function(v) {
            return makePoint(this.x*v,this.y*v)
        },
        idivide: function(v) {
            return makePoint(
                Math.floor(this.x/v),
                Math.floor(this.y/v)
            )
        },
        floor: function() {
            return makePoint(
                Math.floor(this.x),
                Math.floor(this.y)
            )
        },
        distance(pt) {
            const dx = pt.x-this.x;
            const dy = pt.y-this.y;
            return Math.sqrt(dx*dx+dy*dy)
        },
        equals(pt) {
            return pt.x === this.x && pt.y === this.y
        }
    }
}
