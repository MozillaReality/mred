//parse the URL to get the doc id
//setup superhands?
//setup pubnub to listen for changes
//load the doc
//clear the view
//loop through the doc for scenes and entities
//create layers and entities as needed using createElement



function doLoad(docid, SERVER_URL, SERVER_URL_ASSETS) {
    const els_to_nodes = {}

    const PRIM_TYPES = {
        CUBE:'cube',
        IMAGE2D: 'image2d',
        IMAGE360: 'image360',
        MODEL3D: 'model3d',
        TEXT2D: 'text',
        SPHERE:'sphere',
    }

    fetch(SERVER_URL + docid)
        .then(res => res.json())
        .then(doc => {
            clearScene()
            parseDocument(doc)
        })

    function clearScene() {
        const scene = $('#children')
        while (scene.firstChild) {
            scene.removeChild(scene.firstChild)
        }
    }

    function $(sel) {
        return document.querySelector(sel)
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
        layer.children.forEach(ch => {
            if (ch.type === 'primitive') {
                generatePrimitive(ch)
            }
        })
    }

    function genId(prefix) {
        return prefix + "_" + Math.floor(Math.random() * 1000000)
    }

    function generatePrimitive(prim) {
        if (prim.primitive === PRIM_TYPES.CUBE) return createCube(prim)
        if (prim.primitive === PRIM_TYPES.SPHERE) return createSphere(prim)
        if (prim.primitive === PRIM_TYPES.MODEL3D) return createModel3D(prim)
        if (prim.primitive === PRIM_TYPES.IMAGE360) return createImage360(prim)
        if (prim.primitive === PRIM_TYPES.IMAGE2D) return createImage2D(prim)
        if (prim.primitive === PRIM_TYPES.TEXT2D) return createText2D(prim)
    }

    function createCube(prim) {
        const el = document.createElement('a-entity')
        el.setAttribute('id', genId('cube'))
        el.setAttribute('geometry', {
            primitive: 'box',
            width: prim.width,
            height: prim.height,
            depth: prim.depth
        })
        el.setAttribute('position', {
            x: Math.sin(prim.angle / 180 * Math.PI) * 4,
            z: -Math.cos(prim.angle / 180 * Math.PI) * 4,
            y: prim.elevation * 0.1
        })
        el.setAttribute('material', {
            color: prim.color,
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
    }

    function createSphere(prim) {
        const el = document.createElement('a-entity')
        el.setAttribute('id', genId('sphere'))
        el.setAttribute('geometry', {
            primitive: 'sphere',
            radius: prim.radius,
        })
        el.setAttribute('position', {
            x: Math.sin(prim.angle / 180 * Math.PI) * 4,
            z: -Math.cos(prim.angle / 180 * Math.PI) * 4,
            y: prim.elevation * 0.1
        })
        el.setAttribute('material', {
            color: prim.color,
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
    }

    function createModel3D(prim) {
        const el = document.createElement('a-entity')
        el.setAttribute('id', genId('gltf'))
        const model = findAssetById(prim.assetRef)
        el.setAttribute('gltf-model', model.url)
        el.setAttribute('position', {
            x: Math.sin(prim.angle / 180 * Math.PI) * 4,
            z: -Math.cos(prim.angle / 180 * Math.PI) * 4,
            y: prim.elevation * 0.1
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
    }

    function createImage360(prim) {
        const img = findAssetById(prim.assetRef)
        const url = SERVER_URL_ASSETS + img.assetId

        const el = document.createElement('a-entity')
        el.setAttribute('id', genId('image360'))
        el.setAttribute('geometry', {
            primitive: 'sphere',
            radius: 100,
        })
        el.setAttribute('material', {
            color: 'white',
            src: url,
            side: 'back'
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
    }

    function createImage2D(prim) {
        const el = document.createElement('a-image')
        el.setAttribute('id', genId('image2d'))
        const image = findAssetById(prim.assetRef)
        const url = SERVER_URL_ASSETS + image.assetId
        el.setAttribute('src', url)
        el.setAttribute('position', {
            x: Math.sin(prim.angle / 180 * Math.PI) * 4,
            z: -Math.cos(prim.angle / 180 * Math.PI) * 4,
            y: prim.elevation * 0.1
        })
        el.setAttribute('scale', {
            x: prim.scale,
            y: prim.scale,
            z: prim.scale
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
    }

    function createText2D(prim) {
        const el = document.createElement('a-entity')
        el.setAttribute('geometry',{
            primitive:'plane',
            height:'auto',
            width:'auto'
        })
        el.setAttribute('material',{
            color:prim.backgroundColor,
        })
        el.setAttribute('text',{
            width: prim.fontSize/10,
            wrapCount: prim.text.length*0.8,
            value:prim.text,
            color: prim.color
        })
        el.setAttribute('id', genId(PRIM_TYPES.TEXT2D))
        el.setAttribute('position', {
            x: Math.sin(prim.angle / 180 * Math.PI) * 4,
            z: -Math.cos(prim.angle / 180 * Math.PI) * 4,
            y: prim.elevation * 0.1
        })
        $('#children').appendChild(el)
        els_to_nodes[el.getAttribute('id')] = prim
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
        if (scene) {
            clearScene()
            generateScene(scene)
        }

    }

    function getNodeForAFrameObject(el) {
        return els_to_nodes[el.id]
    }

    function getURLForResourceId(id) {
        return SERVER_URL_ASSETS + id
    }


    window.addEventListener('load', () => {
        console.log("done loading=======")
        $('#cursor').addEventListener('fusing', () => {
            console.log("fusing")
        })
        $('#cursor').addEventListener('mouseenter', () => {
            console.log("entering")
        })
        $('#cursor').addEventListener('mouseleave', () => {
            console.log("leaving")
        })
        $('#cursor').addEventListener('click', (e) => {
            console.log("clicked", e.detail)
            const node = getNodeForAFrameObject(e.detail.intersectedEl)
            console.log("the node is", node)
            if (node.children) {
                const nav = node.children.find(ch => ch.type === 'nav-action')
                if (nav) {
                    console.log("found the nav", nav)
                    loadScene(nav.targetScene)
                }
                const play = node.children.find(ch => ch.type === 'playsound-action')
                if (play) {
                    const asset = findAssetById(play.assetRef)
                    const url = getURLForResourceId(asset.assetId)
                    const audio = document.createElement('audio')
                    audio.autoplay = true
                    audio.src = url
                }
            }
        })

    })
}

Viewer = {
    doLoad:doLoad
}
