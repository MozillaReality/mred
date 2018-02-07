const express = require('express');
const fs = require('fs');
const paths = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const PubNub = require("pubnub")

let pubnub = null;
let dir = null;
let assets_dir = null;
let port = null;

startup();

function startup() {
    //handle env vars first
    if(process.env.DIR) dir = process.env.DIR
    if(process.env.PORT) port = parseInt(process.env.PORT)
    if(dir && port) {
	    startPubNub();
	    startServer();
	    return
    }

	//handle args next
    const args = process.argv.slice(2)
    if (args.length < 2) throw new Error("missing docs dir and port");
    dir = args[0];
    if(!fs.existsSync(dir)) throw new Error(`doc dir doesn't exist: "${dir}"`)
    const portS = args[1]
    if(!parseInt(portS)) throw new Error(`invalid port number "${portS}"`)
    port = parseInt(portS)

    console.log(`starting server with docs dir ${dir} and port ${port}`)
    assets_dir = paths.join(dir,'assets')
    if(!fs.existsSync(assets_dir)) fs.mkdir(assets_dir)
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
function parseAssetId(req) {
    const parts = req.params.id.split('.').map((part)=>part.replace(/\W/g,'_'))
    if(parts.length === 1) return parts[0]
    const end = parts.pop()
    return parts.join("")+'.'+end
}
function docPath(id) {
    return paths.join(process.cwd(), dir, id + '.json')
}
function assetPath(id) {
    return paths.join(process.cwd(), assets_dir,id)
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
    app.get('/asset/:id', (req,res) => {
        const id = parseAssetId(req)
        console.log('sending the file',assetPath(id))
        res.sendFile(assetPath(id))
    })
    app.post('/asset/:id', (req,res) => {
        const id = parseAssetId(req)
        console.log("got request to upload a file with id",req.params.id, '=>',id)
        const path = paths.join(process.cwd(),dir,'assets',id)
        console.log('writing to',path)
        const file = fs.createWriteStream(path,{encoding:'binary'})
        //stream it directly to disk
        req.on('data',(chunk) => file.write(chunk))
        req.on('end', () => {
            file.end()
            res.json({success:true,message:'uploaded it', id:id})
        })
    })

    const server = app.listen(port, function () {
        console.log(`Example app listening at http://${server.address().address}:${server.address().port}`);
    });

}

