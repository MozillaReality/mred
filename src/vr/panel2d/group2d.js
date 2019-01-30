import Component2D from "./component2d";

export default class Group2D extends Component2D {
    constructor() {
        super()
        this.type = 'group'
        this.x = 0
        this.y = 0
        this.w = 100
        this.h = 100
        this.bg = 'gray'
        this.visible = true
        this.comps = []
        this.padding = 5
        this.border = 1

        this.layout = (comp) => {
            console.log("not laying out anything")
        }
    }
    draw(ctx) {
        if(!this.visible) return
        this.layout(this)
        ctx.fillStyle = this.bg
        ctx.fillRect(this.x,this.y,this.w,this.h)
        if(this.border > 0) {
            ctx.strokeStyle = 'black'
            ctx.strokeRect(this.x, this.y, this.w, this.h)
        }
        ctx.save()
        ctx.translate(this.x+this.padding,this.y+this.padding)
        this.comps.forEach(comp => comp.draw(ctx))
        ctx.restore()
    }

    contains(pt) {
        if(pt.x < this.x) return false
        if(pt.x > this.x + this.w) return false
        if(pt.y < this.y) return false
        if(pt.y > this.y + this.h) return false
        return true
    }
    findAt(pt) {
        if(!this.visible) return null
        for(let i=0; i<this.comps.length; i++) {
            const comp = this.comps[i]
            const res = comp.findAt({x:pt.x-comp.x-5,y:pt.y-comp.y-5})
            if(res) return res
        }
        return null
    }

    childSet(key,value) {
        this.childProps[key] = value
        this.comps.forEach(ch=>ch.set(key,value))
        return this
    }

    add(comp) {
        this.comps.push(comp)
        this.fire('changed',{type:'changed',target:this})
        return this
    }
}
