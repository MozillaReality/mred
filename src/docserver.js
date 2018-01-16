const express = require('express');
const fs = require('fs');
const paths = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const PubNub = require("pubnub")

let pubnub = null;
let dir = null;
let port = null;

startup();

function startup() {
    const args = process.argv.slice(2)
    if (args.length < 2) throw new Error("missing docs dir and port");
    dir = args[0];
    if(!fs.existsSync(dir)) throw new Error(`doc dir doesn't exist: "${dir}"`)
    const portS = args[1]
    if(!parseInt(portS)) throw new Error(`invalid port number "${portS}"`)
    port = parseInt(portS)

    console.log(`starting server with docs dir ${dir} and port ${port}`)
    startPubNub();
    startServer();
}

function startPubNub() {
    pubnub = new PubNub({
        publishKey:"pub-c-1cba58da-c59a-4b8b-b756-09e9b33b1edd",
        subscribeKey:"sub-c-39263f3a-f6fb-11e7-847e-5ef6eb1f4733"
    })
}

function parseId(req) {
    //strip out non-alphanumeric characters for safety
    return req.params.id.replace(/\W/g, '_')
}
function docPath(id) {
    return paths.join(process.cwd(), dir, id + '.json')
}
function startServer() {
    const app = express();
    app.use(cors());
    app.use(bodyParser.json({limit: '50mb'}));
    app.get("/doc/:id", (req, res) => {
        const id = parseId(req)
        res.sendFile(docPath(id))
    })
    app.post("/doc/:id", (req, res) => {
        const id = parseId(req)
        const data = JSON.stringify(req.body, null, '    ');
        fs.writeFile(docPath(id),data,(err)=>{
            if(err) {
                console.log("failed",err)
                res.json({success:false,message:"could not save"})
            }
            console.log("wrote it")
            console.log("sending message to channel",id)
            pubnub.publish({channel:id, message:{message:'updated'}}).then((t)=>console.log(t)).catch((e)=>console.log(e))
            res.json({success:true,message:"saved it!"})
        })
    })

    const server = app.listen(port, function () {
        console.log(`Example app listening at http://${server.address().address}:${server.address().port}`);
    });

}

