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
    const scenes = doc.doc.children[0]
    const firstScene = scenes.children[0]
    generateScene(firstScene)
}

function generateScene(scene) {
    scene.children.forEach(generateLayer)
}

function generateLayer(layer) {
    console.log("layer",layer)
    layer.children.forEach(ch=>{
        console.log("child is",ch)
        if(ch.type === 'primitive') {
            generatePrimitive(ch)
        }
    })
}

function generatePrimitive(prim) {
    if(prim.primitive === 'cube') {
        const el = document.createElement('a-entity')
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
            color:'red',
        })
        $('#children').appendChild(el)
    }
    if(prim.primitive === 'sphere') {
        const el = document.createElement('a-entity')
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
            color:'red',
        })
        $('#children').appendChild(el)
    }
}