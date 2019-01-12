const {SET_PROPERTY, CREATE_PROPERTY, DELETE_PROPERTY,
    CREATE_OBJECT, DELETE_OBJECT,
    INSERT_ELEMENT, DELETE_ELEMENT
} = require("syncing_protocol");

export class UndoQueue {
    constructor(graph) {
        this.graph = graph
        this.history = []
        this.current = -1
    }

    submit(op) {
        // console.log("UNDOREDO: ",short(op))
        this.history.push(op)
        this.current = this.history.length - 1
    }

    canUndo() {
        return this.current >= 0
    }

    canRedo() {
        return this.current < this.history.length - 1
    }

    undo() {
        const last = this.history[this.current]
        this.current--
        // console.log("undoing",short(last))
        // this.history.forEach(op => console.log(short(op)))
        if (last.type === SET_PROPERTY) {
            if (!last.prevValue) {
                console.warn("undoing set property without a previous value!", last)
            }
            const op = {
                type: SET_PROPERTY,
                host: this.graph.getHostId(),
                timestamp: Date.now(),
                object: last.object,
                name: last.name,
                value: last.prevValue,
            }
            this.graph.process(op)
            return
        }
        if (last.type === CREATE_PROPERTY) {
            const op = {
                type: DELETE_PROPERTY,
                host: this.graph.getHostId(),
                timestamp: Date.now(),
                object: last.object,
                name: last.name,
            }
            this.graph.process(op)
            return
        }
        if (last.type === CREATE_OBJECT) {
            const op = {
                type: DELETE_OBJECT,
                host: this.graph.getHostId(),
                timestamp: Date.now(),
                id: last.id,
            }
            this.graph.process(op)
            return
        }
        if (last.type === INSERT_ELEMENT) {
            const op = {
                type: DELETE_ELEMENT,
                host: this.graph.getHostId(),
                timestamp: Date.now(),
                array: last.array,
                entry: last.entryid
            }
            this.graph.process(op)
            return
        }
        throw new Error(`undo for type not supported: ${last.type}`)
    }

    redo() {
        this.current++
        const last = this.history[this.current]
        // console.log("redoin",this.current,last.type,last.name,'=',last.value)
        if (last.type === SET_PROPERTY) {
            const op = {
                type: last.type,
                host: last.host,
                timestamp: Date.now(),
                object: last.object,
                name: last.name,
                value: last.value
            }
            this.graph.process(op)
            return
        }
        if (last.type === CREATE_PROPERTY) {
            const op = {
                type: last.type,
                host: last.host,
                timestamp: Date.now(),
                object: last.object,
                name: last.name,
                value: last.value
            }
            this.graph.process(op)
            return
        }
        if (last.type === CREATE_OBJECT) {
            const op = {
                type: last.type,
                host: last.host,
                timestamp: Date.now(),
                id: last.id,
            }
            this.graph.process(op)
            return
        }
        if (last.type === INSERT_ELEMENT) {
            console.log("redoing", last)
            const op = {
                type: last.type,
                host: last.host,
                timestamp: Date.now(),
                array: last.array,
                value: last.value,
                entryid: this.graph.makeGUID(),
                prev: -1,
            }
            this.graph.process(op)
            return
        }
        throw new Error(`redo for type not supported: ${last.type}`)
    }

    dump() {
        return this.history.map((op, i) => i + " " + op.type + " " + op.name + " => " + op.value)
    }
}