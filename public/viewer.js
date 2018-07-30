//parse the URL to get the doc id
//setup superhands?
//setup pubnub to listen for changes
//load the doc
//clear the view
//loop through the doc for scenes and entities
//create layers and entities as needed using createElement

function $(sel) {
    return document.querySelector(sel)
}
const PRIM_TYPES = {
    CUBE:'cube',
    IMAGE2D: 'image2d',
    IMAGE360: 'image360',
    MODEL3D: 'model3d',
    TEXT2D: 'text',
    SPHERE:'sphere',
}

class SceneViewer {
    constructor() {
        this.els_to_nodes = {}
        this.doc = null
    }
    getURLForResourceId(id) {
        return this.SERVER_URL_ASSETS + id
    }
    getNodeForAFrameObject(el) {
        return this.els_to_nodes[el.id]
    }
    findAssetById(id) {
        const assets = this.doc.doc.children[1]
        return assets.children.find(ch => ch.id === id)
    }
    clearScene() {
        const scene = $('#children')
        while (scene.firstChild) {
            scene.removeChild(scene.firstChild)
        }
    }
    loadScene(sceneId) {
        const scene = this.findSceneById(sceneId)
        console.log("the next scene is",scene)
        if (scene) {
            this.clearScene()
            this.generateScene(scene)
        }
    }
    generateScene(scene) {
        console.log('generating')
        scene.children.forEach((layer)=>this.generateLayer(layer))
    }
    generateLayer(layer) {
        console.log("making a layer")
        layer.children.forEach(ch => {
            if (ch.type === 'primitive') {
                const el = this.generatePrimitive(ch)
                el.setAttribute('click-handler',{})
            }
        })
    }

    findSceneById(id) {
        const scenes = this.doc.doc.children[0]
        return scenes.children.find(ch => ch.id === id)
    }


    doLoad(docid, SERVER_URL, SERVER_URL_ASSETS) {
        this.SERVER_URL = SERVER_URL
        this.SERVER_URL_ASSETS = SERVER_URL_ASSETS
        fetch(this.SERVER_URL + docid)
            .then(res => res.json())
            .then(doc => {
                this.clearScene()
                this.parseDocument(doc)
            }).catch(e => console.log(e))
    }


    parseDocument(doc) {
        console.log("parsing",doc)
        this.doc = doc
        const scenes = this.doc.doc.children[0]
        console.log('scenes',scenes)
        const firstScene = scenes.children[0]
        this.generateScene(firstScene)
    }


    genId(prefix) {
        return prefix + "_" + Math.floor(Math.random() * 1000000)
    }

    generatePrimitive(prim) {
        if (prim.primitive === PRIM_TYPES.CUBE) return this.createCube(prim)
        if (prim.primitive === PRIM_TYPES.SPHERE) return this.createSphere(prim)
        if (prim.primitive === PRIM_TYPES.MODEL3D) return this.createModel3D(prim)
        if (prim.primitive === PRIM_TYPES.IMAGE360) return this.createImage360(prim)
        if (prim.primitive === PRIM_TYPES.IMAGE2D) return this.createImage2D(prim)
        if (prim.primitive === PRIM_TYPES.TEXT2D) return this.createText2D(prim)
    }

    createCube(prim) {
        const el = document.createElement('a-entity')
        el.setAttribute('id', this.genId('cube'))
        el.classList.add('action')
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
        this.els_to_nodes[el.getAttribute('id')] = prim
        return el
    }

    createSphere(prim) {
        const el = document.createElement('a-entity')
        el.setAttribute('id', this.genId('sphere'))
        el.classList.add('action')
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
        this.els_to_nodes[el.getAttribute('id')] = prim
        return el
    }

    createModel3D(prim) {
        const el = document.createElement('a-entity')
        el.setAttribute('id', this.genId('gltf'))
        el.classList.add('action')
        const model = this.findAssetById(prim.assetRef)
        el.setAttribute('gltf-model', model.url)
        el.setAttribute('position', {
            x: Math.sin(prim.angle / 180 * Math.PI) * 4,
            z: -Math.cos(prim.angle / 180 * Math.PI) * 4,
            y: prim.elevation * 0.1
        })
        $('#children').appendChild(el)
        this.els_to_nodes[el.getAttribute('id')] = prim
        return el
    }

    createImage360(prim) {
        const img = this.findAssetById(prim.assetRef)
        const url = this.SERVER_URL_ASSETS + img.assetId

        const el = document.createElement('a-entity')
        el.setAttribute('id', this.genId('image360'))
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
        this.els_to_nodes[el.getAttribute('id')] = prim
        return el
    }

    createImage2D(prim) {
        const el = document.createElement('a-image')
        el.setAttribute('id', this.genId('image2d'))
        el.classList.add('action')
        const image = this.findAssetById(prim.assetRef)
        const url = this.SERVER_URL_ASSETS + image.assetId
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
        this.els_to_nodes[el.getAttribute('id')] = prim
        return el
    }

    createText2D(prim) {
        const el = document.createElement('a-entity')
        el.classList.add('action')
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
        el.setAttribute('id', this.genId(PRIM_TYPES.TEXT2D))
        el.setAttribute('position', {
            x: Math.sin(prim.angle / 180 * Math.PI) * 4,
            z: -Math.cos(prim.angle / 180 * Math.PI) * 4,
            y: prim.elevation * 0.1
        })
        $('#children').appendChild(el)
        this.els_to_nodes[el.getAttribute('id')] = prim
        return el
    }

    enterNode(node,el) {
        el.setAttribute('scale',{x:1.1, y:1.1, z:1.1})
    }
    exitNode(node,el) {
        el.setAttribute('scale',{x:1.0, y:1.0, z:1.0})
    }
}

let _viewer = null
Viewer = {
    getViewer: function() {
        if(!_viewer) _viewer = new SceneViewer()
        return _viewer
    }
}
