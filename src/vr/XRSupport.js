import {toFlatString} from '../utils'
import * as ToasterManager from './ToasterManager'

let Cesium = window.Cesium
let XRGeospatialAnchor = window.XRGeospatialAnchor

export class XRSupport {

    static supportsARKit() {
        if (navigator.xr && navigator.xr._mozillaXRViewer) {
            console.log("*** Found mozilla xr viewer")
            return true
        }
        console.log("*** Did not find WebXR")
        return false
    }

    getContext(canvas = 0) {
        this.device = 0
        this.session = 0
        this.xrCanvas = 0
        this.xrContext = 0
        this.canvas = canvas
        this.context = 0
        this.xrCanvas = document.createElement('canvas')
        this.xrContext = this.xrCanvas.getContext('xrpresent')
        this._anchoredNodes = new Map() // { XRAnchorOffset, Three.js Object3D }
        let that = this
        let prom = new Promise((resolve, reject) => {
            // document.body.insertBefore(this.xrCanvas, document.body.firstChild) <- not needed?
            navigator.xr.requestDevice().then((xrDevice) => {
                that.device = xrDevice
                that.device.requestSession({
                    outputContext: that.xrContext,
                    alignEUS: true,
                    geolocation: true,
                    worldSensing: true
                }).then((xrSession) => {
                    that.session = xrSession

                    // we want to always use the estimated elevation
                    XRGeospatialAnchor.useEstimatedElevation(true)

                    // enable smooth tracking of image targets
                    that.session.nonStandard_setNumberOfTrackedImages(4)

                    if (!that.canvas) that.canvas = document.createElement('canvas')
                    if (!that.context) that.context = that.canvas.getContext('webgl', {compatibleXRDevice: that.device})
                    that.session.baseLayer = new window.XRWebGLLayer(that.session, that.context)
                    resolve(that.context)
                }).catch(err => {
                    console.error('Session setup error', err)
                    reject()
                })
            }).catch(err => {
                console.error('Error', err)
                reject()
            })
        })
        return prom
    }

    setAnimationLoop(userAnimationCallback) {

        if (!userAnimationCallback) {
            console.error("Supply a callback")
            return
        }

        // head-model is the coordinate system that tracks the position of the display
        this.session.requestFrameOfReference('head-model').then(frameOfReference => {
            this.headFrameOfReference = frameOfReference
        }).catch(err => {
            console.error('Error finding head frame of reference', err)
        })

        // get eye level which is somehow different from head level?
        this.session.requestFrameOfReference('eye-level').then(frameOfReference => {
            this.eyeLevelFrameOfReference = frameOfReference
        }).catch(err => {
            console.error('Error finding eye frame of reference', err)
        })

        // setup callback
        this.userAnimationCallback = userAnimationCallback
        this.__handleAnimationFrame = this._handleAnimationFrame.bind(this)
        this.session.requestAnimationFrame(this.__handleAnimationFrame)
    }

    _handleAnimationFrame(time = 0, frame = 0) {

        if (!this.session || this.session.ended) return

        this.session.requestAnimationFrame(this.__handleAnimationFrame)

        if (!this.headFrameOfReference || !this.eyeLevelFrameOfReference) return

        let pose = frame.getDevicePose(this.eyeLevelFrameOfReference)
        if (!pose) {
            console.log('No pose')
            return
        }

        for (let view of frame.views) {
            this.userAnimationCallback(
                this.session.baseLayer.getViewport(view),
                view.projectionMatrix,
                pose.getViewMatrix(view),
                time,frame,
            )
            break
        }
    }

    addAnchoredNode(anchor, node, logger) {
        if (!anchor || !anchor.uid) {
            console.error("not a valid anchor", anchor)
            logger.error(`not a valid anchor ${toFlatString(anchor)}`)
            return
        }
        this._anchoredNodes.set(anchor.uid, {
            anchor: anchor,
            node: node
        })
        node.anchor = anchor
        node.matrixAutoUpdate = false
        node.matrix.fromArray(anchor.modelMatrix)
        node.updateMatrixWorld(true)
        //this._scene.add(node) -> presumably this is already done
        anchor.addEventListener("update", (e) => this._handleAnchorUpdate(e, logger))
        anchor.addEventListener("removed", (e) => this._handleAnchorDelete(e, logger))
        logger.log("done adding anchored node")
        return node
    }

    addImageAnchoredNode(info, image, logger) {

        logger.log("addImageAnchoredNode")

        if (!info.image || !info.node) {
            logger.log("missing image or threejs node")
            return
        }

        if (!this.session) {
            logger.log("no session")
            return
        }

        //info contains
        // * callback: to call when the image is found
        // * image: info about the image to recognize. src is at image.src
        // * imageRealworldWidth: width of the image in meters
        // * object: the anchor object
        // * node: the ThreeJS group which represents the anchor. It should be updated as the scene changes
        // * recType: current set to SCENE_START, meaning we should recognize as soon as the scene starts up

        let callback = info.callback
        // let image = info.image
        let imageRealworldWidth = info.imageRealworldWidth || 1
        let object = info.object // object that represents anchor variables that users can edit in general-editor
        let node = info.node
        let recType = 0 // unused. currently set to SCENE_START -> meaning we should recognize as soon as the scene starts up

        // random name from https://gist.github.com/6174/6062387
        let name = [...Array(10)].map(i => (~~(Math.random() * 36)).toString(36)).join('')

        // Get ImageData
        let canvas = document.createElement('canvas')
        let context = canvas.getContext('2d')
        canvas.width = image.width
        canvas.height = image.height
        logger.log(`looking for image ${toFlatString(image)} ${image.src}`)

        context.drawImage(image, 0, 0)
        let idata
        try {
            idata = context.getImageData(0, 0, image.width, image.height)
        } catch (e) {
            logger.log(`error drawing image ${toFlatString(e)}`)
            logger.log(`name ${e.name}`)
            logger.log(`name ${e.message}`)
            logger.log("local url is " + document.documentURI)
            logger.log("image url from " + image.src)
            ToasterManager.add("error drawing image", e.toString())
            throw new Error("foo")
        }
        logger.log(`calling createDetectionImage with image width and height ${image.width} ${image.height}`)

        // Attach image observer handler
        this.session.nonStandard_createDetectionImage(name, idata.data, image.width, image.height, imageRealworldWidth).then(() => {
            logger.log("created a createdetectionimage")
            this.session.nonStandard_activateDetectionImage(name).then(anchor => {
                logger.log("started activate detection image")
                // this gets invoked after the image is seen for the first time
                node.anchorName = name
                node.anchorStyle = "image"
                this.addAnchoredNode(anchor, node, logger)
                if (callback) {
                    callback(info)
                }
            }).catch(error => {
                logger.error(`error activating detection image: ${error}`)
            })
        }).catch(error => {
            logger.error(`error creating detection image: ${error}`)
        })
    }

    addGeoAnchoredNode(info, logger) {

        logger.log("adding a geo recognizer")

        if (!info.node) {
            logger.log("Missing threejs node")
            return
        }

        if (!this.session) {
            logger.log("no session")
            return
        }

        /*
        info contains
         location:  a geo location asset, has properties for latitude, longitude, altitude, useAltitude
         recType: the recognition type. for now always SCENE_START
         object: the anchor object. It reresents the anchor in the 3D scene. has tx,ty,tz, rotation, etc.
         node: the actual ThreeJS object that mirrors the propertites of the `object` above
         callback: a function to be called once the geo anchor is recognized. By default this callback will fire a 'recognized' event and make the anchor visible in the scene
         */

        let callback = info.callback
        let location = info.location
        let object = info.object // object that represents anchor variables that users can edit in general-editor
        let node = info.node
        let recType = 0 // unused. currently set to SCENE_START -> meaning we should recognize as soon as the scene starts up

        // As a slight hack, look for any non zero value in latitude or longitude as a hint to not use your current location

        // these values are 0 by default, we need to change at least one of them by a bit!
        if (location.latitude != 0 || location.longitude != 0) {
            // use supplied altitude?

            let lla = new Cesium.Cartographic(location.longitude * Math.PI / 180, location.latitude * Math.PI / 180, location.altitude)

            if (location.useAltitude) {
                logger.log("XRGeoAnchor: Placing an object at specified lla and specified altitude")
                logger.log('${toFlatString(lla)}')
                XRGeospatialAnchor.createGeoAnchor(lla).then(anchor => {
                    node.anchorStyle = "geo"
                    this.addAnchoredNode(anchor, node, logger)
                    if (callback) {
                        callback(info)
                    }
                }).catch(error => {
                    logger.error(`error creating geospatial anchor: ${error}`)
                })
            } else {
                XRGeospatialAnchor.getDefaultElevation(lla).then(altitude => {
                    lla.height = altitude
                    logger.log("XRGeoAnchor: Placing an object at specified lla and estimated altitude")
                    logger.log('${toFlatString(lla)}')
                    XRGeospatialAnchor.createGeoAnchor(lla).then(anchor => {
                        node.anchorStyle = "geo"
                        this.addAnchoredNode(anchor, node, logger)
                        if (callback) {
                            callback(info)
                        }
                    }).catch(error => {
                        logger.error(`error creating geospatial anchor: ${error}`)
                    })
                }).catch(error => {
                    logger.error(`error getting default elevation: ${error}`)
                })
            }
        }

        // else find current position and altitude
        else {
            XRGeospatialAnchor.getDeviceCartographic().then(cartographic => {
                // probably don't need to explicitly do this, but to be safe ...
                XRGeospatialAnchor.getDefaultElevation().then(altitude => {
                    let lla = new Cesium.Cartographic(cartographic.longitude, cartographic.latitude, altitude)
                    logger.log("XRGeoAnchor: Placing an object at your lla")
                    logger.log('${toFlatString(lla)}')
                    XRGeospatialAnchor.createGeoAnchor(lla).then(anchor => {
                        node.anchorStyle = "geo"
                        this.addAnchoredNode(anchor, node, logger)
                        if (callback) {
                            callback(info)
                        }
                    }).catch(error => {
                        logger.error(`error creating geospatial anchor: ${error}`)
                    })
                }).catch(error => {
                    logger.error(`error getting default elevation: ${error}`)
                })
            }).catch(error => {
                logger.error(`error getting device cartographic location: ${error}`)
            })
        }
    }

    _handleAnchorDelete(details, logger) {
        logger.log("delete anchor")
        let anchor = details.source
        const anchoredNode = this._anchoredNodes.get(anchor.uid)
        if (anchoredNode) {
            const node = anchoredNode.node
            // NOTIFY SOMEBODY? TODO
            this._anchoredNodes.delete(anchor.uid)
        }
    }

    _handleAnchorUpdate(details, logger) {
        logger.log("anchor update")
        const anchor = details.source
        const anchoredNode = this._anchoredNodes.get(anchor.uid)
        if (anchoredNode) {
            const node = anchoredNode.node
            node.matrixAutoUpdate = false
            node.matrix.fromArray(anchor.modelMatrix)
            node.updateMatrixWorld(true)
        }
    }

    stopImageRecognizer() {
        console.log("Stopping ALL image recognizers here")
        if(!this._anchoredNodes) return
        this._anchoredNodes.forEach( (value,key,map) => {
            if(value.node && value.node.anchorStyle == "image") {
                value.node.anchor = 0
                value.node.matrixAutoUpdate = true
                this._anchoredNodes.delete(key)
            }
        })
    }

    stopGeoRecognizer() {
        console.log("Stopping ALL image recognizers here")
        if(!this._anchoredNodes) return
        this._anchoredNodes.forEach( (value,key,map) => {
            if(value.node && value.node.anchorStyle == "geo") {
                value.node.anchor = 0
                value.node.matrixAutoUpdate = true
                this._anchoredNodes.delete(key)
            }
        })
    }

}