import PubNub from "pubnub";
import {AuthModule} from '../vr/AuthModule'
function short(op) {
    let str = `${op.type} ${op.uuid} |  `
    if(op.name) {
        str += `${op.name} = ${op.value}  prev = ${op.prevValue}`
    }
    return str
}
const settings = {
    publishKey: 'pub-c-1cba58da-c59a-4b8b-b756-09e9b33b1edd',
    subscribeKey: 'sub-c-39263f3a-f6fb-11e7-847e-5ef6eb1f4733',
}

export class PubnubSyncWrapper {
    constructor(provider, graph) {
        if(!provider) throw new Error('created PubnubSyncWrapper without a provider')
        if(!graph) throw new Error('created PubnubSyncWrapper without a graph')
        this.paused = false
        this.buffer = []
        this.provider = provider

        graph.onChange((e)=>this.handleGraphChange(e))

        this.pubnub = new PubNub(settings)
        this.logger = new PubnubLogger(this.provider.getDocId(),this.pubnub)
    }

    calculateChannelName() {
        return "metadoc-docupdate-" + this.provider.getDocId() + "_"+AuthModule.getServerID()
    }
    calculateLoggerChannelName() {
        return "metadoc-log-" + this.provider.getDocId()+"_"+AuthModule.getServerID()
    }

    start() {
        this.pubnub.addListener({
            status: (e) => {
                // console.log(e)
                if (e.operation === 'PNSubscribeOperation' && e.category === 'PNConnectedCategory') {
                    this.sendHistoryRequest()
                }
            },
            message: (m)=>this.handleMessage(m),
        })

        this.pubnub.subscribe({channels: [this.calculateChannelName(),this.calculateLoggerChannelName()]})
    }

    pause() {
        this.paused = true
    }

    unpause() {
        this.paused = false
        // console.log("we need to send the waiting messages", this.buffer)
        this.buffer.forEach(op => this.sendMessage(op))
        this.buffer = []
        //now request history from the network for anything we missed
        // this.sendHistoryRequest()
    }

    shutdown() {
        this.pubnub.unsubscribe({channels: [this.calculateChannelName()]})
        this.pubnub.stop()
    }

    sendMessage(e) {
        console.log("PN_SEND:", short(e))
        this.pubnub.publish({
            channel: this.calculateChannelName(),
            message: e
        }, (status, response) => {
            // console.log("published",status,response)
        })

    }

    handleGraphChange (e) {
        // console.log("graph changed",e)
        const host = this.provider.getDataGraph().getHostId()
        if (e.host !== host) return
        if (this.paused) return this.buffer.push(e)
        this.sendMessage(e)
    }

    sendHistoryRequest() {
        // console.log("sending a history request")
        this.pubnub.publish({
            channel: this.calculateChannelName(),
            message: {
                type: 'GET_HISTORY',
                host: this.provider.getDataGraph().getHostId()
            }
        })
    }

    handleGetHistory() {
        // console.log("need to send out the history")
        const graph = this.provider.getDataGraph()
        const hist = graph.getHistory().slice()
        console.log(hist)
        const chunkSize = 30
        let count = 0
        while (hist.length > 0) {
            if (count > 100) {
                console.log("breaking out. possible infinite loop")
                break
            }
            count++
            const chunk = hist.splice(0, chunkSize)
            console.log("sending", chunk.length, chunk)
            this.pubnub.publish({
                channel: this.calculateChannelName(),
                message: {
                    type: 'SEND_HISTORY',
                    host: graph.getHostId(),
                    history: chunk
                }
            }, (status, response) => {
                console.log("published", status, response)
            })
        }

    }

    handleReceiveHistory(msg) {
        // console.log("got some history", msg.history.length)
        msg.history.forEach(op => this.provider.getDataGraph().process(op))
    }


    handleMessage (evt) {
        if (this.paused) return
//        console.log("channel is",evt.channel)
        if(evt.channel === this.calculateLoggerChannelName()) {
            if(evt.publisher !== this.pubnub.getUUID()) {
                if(evt.message.length) {
                    console.log("REMOTE LOGGER",...evt.message)
                } else {
                    console.log("REMOTE LOGGER", evt.message)
                }
            }
            return
        }
        const graph = this.provider.getDataGraph()
        // console.log('PN_REMOTE',evt)
        if (evt.message.type === 'GET_HISTORY') {
            // console.log("got a history request",evt.message.host, graph.getHostId())
            if (evt.message.host !== graph.getHostId()) {
                return this.handleGetHistory()
            }
            return
        }
        if (evt.message.type === 'SEND_HISTORY') {
            if (evt.message.host !== graph.getHostId()) {
                return this.handleReceiveHistory(evt.message)
            }
            return
        }
        const op = evt.message
        if (!op.host) return console.log("received a message without a host", op)
        if (!op.timestamp) return console.error("received a message without a timestamp", op)
        if (op.host && op.host === graph.getHostId()) {
            // console.log("SKIP: my own message came in. ignoring it")
            return
        }
        console.log("REMOTE", op)
        graph.process(op)
    }

    getLogger() {
        return this.logger
    }
}


export class PubnubLogger {
    constructor(docid, pubnub) {
        this.count = 0
        this.docid = docid
        this.listeners = {}
        if(!pubnub) {
            this.pubnub = new PubNub(settings)
        } else {
            this.pubnub = pubnub
        }
    }
    addEventListener(type,cb) {
        this.getListeners(type).push(cb)
    }
    calculateLoggerChannelName() {
        return "metadoc-log-" + this.docid+"_"+AuthModule.getServerID()
    }
    log() {
        console.log("LOGGER",...arguments)
        this.pubnub.publish({
            channel:this.calculateLoggerChannelName(),
            message:Array.from(arguments).concat(this.count++)
        })
        this.fire('log',Array.from(arguments),this.count++)
    }
    error () {
        console.log("LOGGER ERROR",...arguments)
        this.pubnub.publish({
            channel:this.calculateLoggerChannelName(),
            message:Array.from(arguments).concat(this.count++)
        })
        this.fire('error',Array.from(arguments),this.count++)
    }

    getListeners(type) {
        if(!this.listeners) this.listeners = {}
        if(!this.listeners[type]) this.listeners[type] = []
        return this.listeners[type]
    }

    fire(type, messages,count) {
        this.getListeners(type).forEach(cb => cb({
            type:type,
            messages:messages,
            count:count,
        }))
    }
}

export class ConsoleLogger {

    constructor() {
        this.listeners = {}
    }

    addEventListener(type,cb) {
        this.getListeners(type).push(cb)
    }
    getListeners(type) {
        if(!this.listeners) this.listeners = {}
        if(!this.listeners[type]) this.listeners[type] = []
        return this.listeners[type]
    }

    fire(type, messages,count) {
        this.getListeners(type).forEach(cb => cb({
            type:type,
            messages:messages,
            count:count,
        }))
    }
    log() {
        console.log("DUMMY LOGGER",...arguments)
        this.fire('log',Array.from(arguments))
    }
    error () {
        console.log("DUMMY LOGGER ERROR",...arguments)
        this.fire('error',Array.from(arguments))
    }
}