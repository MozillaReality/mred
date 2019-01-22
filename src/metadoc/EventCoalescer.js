const {SET_PROPERTY} = require("syncing_protocol");


export class EventCoalescer {
    constructor(graph) {
        this.graph = graph
        this.listeners = []
        this.rawlisteners = []
        this.paused = false
        this.buffer = []
        this.first = {}
        this.last = {}
    }

    pause() {
        this.paused = true
    }

    unpause() {
        this.paused = false
        this.buffer = []
        // console.log("need to send out set property updates",this.last)
        // console.log('the originals are',this.first)
        Object.keys(this.last).forEach((key) => {
            Object.keys(this.last[key]).forEach(name => {
                const op = this.last[key][name]
                // console.log("sending",short(op))
                op.prevValue = this.first[key][name].value
                this.fire(op)
                this.graph.process(op)
            })
        })

        this.first = {}
        this.last = {}

        // console.log(this.graph.dumpGraph())
        // this.graph.getHistory().forEach(h => console.log(h.type,h.name,h.value))
    }

    onChange = cb => this.listeners.push(cb)
    onRawChange = cb => this.rawlisteners.push(cb)
    fire = op => this.listeners.forEach(cb => cb(op))
    fireRaw = op => this.rawlisteners.forEach(cb => cb(op))
    getPropertiesForObject = (obj) => this.graph.getPropertiesForObject(obj)
    getArrayLength = (obj) => this.graph.getArrayLength(obj)
    getElementAt = (obj, index) => this.graph.getElementAt(obj, index)
    getHostId = () => this.graph.getHostId()


    getPropertyValue(obj, key) {
        // console.log("checking",this.paused,obj,key)
        if (this.paused && this.last[obj] && this.last[obj][key]) {
            // console.log("returning the raw property values",this.last[obj][key])
            return this.last[obj][key].value
        } else {
            return this.graph.getPropertyValue(obj, key)
        }
    }

    bufferOp(op) {
        if (!this.first[op.object]) this.first[op.object] = {}
        if (!this.first[op.object][op.name]) this.first[op.object][op.name] = op
        if (!this.last[op.object]) this.last[op.object] = {}
        this.last[op.object][op.name] = op
        this.buffer.push(op)
        this.fireRaw(op)
    }

    process(op) {
        if (op.type === SET_PROPERTY && this.paused) {
            this.bufferOp(op)
        } else {
            this.fire(op)
            this.graph.process(op)
        }
    }
}