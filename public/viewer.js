//parse the URL to get the doc id
//setup superhands?
//setup pubnub to listen for changes
//load the doc
//clear the view
//loop through the doc for scenes and entities
//create layers and entities as needed using createElement


console.log("setting everything up")
const args = parseQuery(document.location.search)
console.log("args = ", args)
const SERVER_URL = "https://vr.josh.earth/360/doc/"
const SERVER_URL_ASSETS = "https://vr.josh.earth/360/asset/"
const els_to_nodes = {}


fetch(SERVER_URL+args.doc)
    .then(res => res.json())
    .then(doc=>{
        clearScene()
        parseDocument(doc)
    })

function clearScene() {
    const scene = $('#children')
    while(scene.firstChild) {
        scene.removeChild(scene.firstChild)
    }
}
function $(sel) {
    return document.querySelector(sel)
}
function parseQuery(str) {
    if(str.startsWith('?')) str = str.substring(1)
    console.log("parsing",str)
    const parts = str.split("&")
    console.log(parts)
    const args = {}
    parts.forEach(part=>{
        const p2 = part.split('=')
        args[p2[0]] = p2[1]
    })
    return args
}
function parseDocument(doc) {
    this.doc = doc
    const scenes = doc.doc.children[0]
    const firstScene = scenes.children[0]
    generateScene(firstScene)
}

function generateScene(scene) {
    scene.children.forEach(generateLayer)
}

function generateLayer(layer) {
    layer.children.forEach(ch=>{
        if(ch.type === 'primitive') {
            generatePrimitive(ch)
        }
    })
}

function genId(prefix) {
    return prefix+"_"+Math.floor(Math.random()*1000000)
}
function generatePrimitive(prim) {
    if(prim.primitive === 'cube') {
        const el = document.createElement('a-entity')
        el.setAttribute('id',genId('cube'))
        el.setAttribute('geometry',{
            primitive:'box',
            width:prim.width,
            height:prim.height,
            depth:prim.depth
        })
        el.setAttribute('position',{
            x:  Math.sin(prim.angle/180*Math.PI)*4,
            z: -Math.cos(prim.angle/180*Math.PI)*4,
            y: prim.elevation*0.1
        })
        el.setAttribute('material',{
            color:prim.color,
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
    }
    if(prim.primitive === 'sphere') {
        const el = document.createElement('a-entity')
        el.setAttribute('id',genId('sphere'))
        el.setAttribute('geometry',{
            primitive:'sphere',
            radius:prim.radius,
        })
        el.setAttribute('position',{
            x:  Math.sin(prim.angle/180*Math.PI)*4,
            z: -Math.cos(prim.angle/180*Math.PI)*4,
            y: prim.elevation*0.1
        })
        el.setAttribute('material',{
            color:prim.color,
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
    }
    if(prim.primitive === 'gltf') {
        const el = document.createElement('a-entity')
        el.setAttribute('id',genId('gltf'))
        const model = findAssetById(prim.assetid)
        el.setAttribute('gltf-model',model.url)
        el.setAttribute('position',{
            x:  Math.sin(prim.angle/180*Math.PI)*4,
            z: -Math.cos(prim.angle/180*Math.PI)*4,
            y: prim.elevation*0.1
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
    }
    if(prim.primitive === 'image360') {
        const img = findAssetById(prim.imageid)
        const url = SERVER_URL_ASSETS + img.resourceId

        const el = document.createElement('a-entity')
        el.setAttribute('id',genId('image360'))
        el.setAttribute('geometry',{
            primitive:'sphere',
            radius:100,
        })
        el.setAttribute('material',{
            color:'white',
            src:url,
            side:'back'
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
    }
}

function findAssetById(id) {
    const assets = doc.doc.children[1]
    return assets.children.find(ch => ch.id === id)
}
function findSceneById(id) {
    const scenes = doc.doc.children[0]
    return scenes.children.find(ch => ch.id === id)
}

function loadScene(sceneId) {
    const scene = findSceneById(sceneId)
    if(scene) {
        clearScene()
        generateScene(scene)
    }

}

function getNodeForAFrameObject(el) {
    return els_to_nodes[el.id]
}
