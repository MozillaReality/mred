import PubNub from "pubnub";
function short(op) {
    let str = op.type + ' '
    if(op.name) {
        str += op.name + "=" + op.value + " prev = " + op.prevValue
    }
    return str
}

export class PubnubSyncWrapper {
    constructor(provider, graph) {
        this.paused = false
        this.buffer = []
        this.provider = provider
        graph.onChange(this.handleGraphChange)

        const settings = {
            publishKey: 'pub-c-1cba58da-c59a-4b8b-b756-09e9b33b1edd',
            subscribeKey: 'sub-c-39263f3a-f6fb-11e7-847e-5ef6eb1f4733',
        }

        this.pubnub = new PubNub(settings)
    }

    calculateChannelName() {
        return "metadoc-docupdate-" + this.provider.getDocId()
    }

    start() {
        this.pubnub.addListener({
            status: (e) => {
                console.log(e)
                if (e.operation === 'PNSubscribeOperation' && e.category === 'PNConnectedCategory') {
                    this.sendHistoryRequest()
                }
            },
            message: this.handleMessage,
        })

        this.pubnub.subscribe({channels: [this.calculateChannelName()]})
    }

    pause() {
        this.paused = true
    }

    unpause() {
        this.paused = false
        console.log("we need to send the waiting messages", this.buffer)
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

    handleGraphChange = (e) => {
        // console.log("graph changed",e)
        const host = this.provider.getDataGraph().getHostId()
        if (e.host !== host) return
        if (this.paused) return this.buffer.push(e)
        this.sendMessage(e)
    }

    sendHistoryRequest() {
        console.log("sending a history request")
        this.pubnub.publish({
            channel: this.calculateChannelName(),
            message: {
                type: 'GET_HISTORY',
                host: this.provider.getDataGraph().getHostId()
            }
        })
    }

    handleGetHistory() {
        console.log("need to send out the history")
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
        console.log("got some history", msg.history.length)
        msg.history.forEach(op => this.provider.getDataGraph().process(op))
    }


    handleMessage = (evt) => {
        if (this.paused) return
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
}