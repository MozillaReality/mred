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
    if (process.argv.slice(3).length <= 0) throw new Error("missing docs dir and port");
    dir = process.argv.slice(2)[0];
    if(!fs.existsSync(dir)) throw new Error(`doc dir doesn't exist: "${dir}"`)
    portS = process.argv.slice(3)[0]
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

function startServer() {
    const app = express();
    app.use(cors());
    app.use(bodyParser.json({limit: '50mb'}));
    app.get("/doc/:id", (req, res) => {
        const id = req.params.id.replace(/\W/g,'_');
        console.log('getting the doc', id)
        const path = paths.join(process.cwd(),dir,id+'.json')
        console.log("using the path",path)
        res.sendFile(path)
        pubnub.publish({channel:id, message:{message:'updated'}}).then((t)=>console.log(t)).catch((e)=>console.log(e))
    })
    app.post("/doc/:id", (req, res) => {
        const id = req.params.id.replace(/\W/g,'_');
        console.log(`saving the doc${id}`)
        const data = JSON.stringify(req.body, null, '    ');
        console.log("saving the data",data)
        const fpath = paths.join(process.cwd(),dir,id,'json')
        fs.writeFile(fpath,data).then(()=>{
            console.log("wrote it")
            res.json({success:true,message:"saved it!"})
        }).catch((e)=>{
            console.log("failed",e)
            res.json({success:false,message:"could not save"})
        })
    })

    const server = app.listen(port, function () {
        const host = server.address().address;
        const port = server.address().port;
        console.log(`Example app listening at http://${host}:${port}`, host, port);
    });

}

