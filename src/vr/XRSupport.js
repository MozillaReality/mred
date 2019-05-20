import {toFlatString} from '../utils'
import * as ToasterManager from './ToasterManager'
import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3'

let Cesium = window.Cesium
let XRGeospatialAnchor = window.XRGeospatialAnchor

export class XRSupport {
    constructor() {
        this.imageDetectorMap = {}
        this.geoAnchorMap = {}
        this._workingMatrix = mat4.create()
        this._identity = mat4.create()
        this._vec = vec3.create()
        this.lastFrameTime = 0
        
    }
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
        this.lastFrameTime = time
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

    getTime() { return this.lastFrameTime }

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

        anchor._handleAnchorUpdateCallback = this._handleAnchorUpdate.bind(this, logger)
        anchor._handleAnchorDeleteCallback = this._handleAnchorDelete.bind(this, logger)

        anchor.addEventListener("update", anchor._handleAnchorUpdateCallback)
        anchor.addEventListener("removed", anchor._handleAnchorDeleteCallback)
        logger.log("done adding anchored node")
        return node
    }

    async createSceneAnchor(sceneNode, logger) {
        logger.log("Creating Scene Anchor")

        if (!this.session) {
            logger.log("no session")
            return
        }
        let eyeLevel = await this.session.requestFrameOfReference('eye-level')
        let headLevel = await this.session.requestFrameOfReference('head-model')

        // get the pose of the camera in the world
        headLevel.getTransformTo(eyeLevel, this._workingMatrix)

        // get just the position
        mat4.getTranslation(this._vec, this._workingMatrix) 

        // set the matrix to just the position, which means the orientation is EUS
        mat4.fromTranslation(this._workingMatrix, this._vec)

        // create that anchor
        let newAnchor = await this.session.addAnchor(this._workingMatrix, eyeLevel)

        this.addAnchoredNode(newAnchor, sceneNode, logger)
        return newAnchor
    }

    updateAnchoredSceneNode(sceneAnchor, sceneNode, logger) {
        logger.log("Replacing the scene node on the existing scene anchor")
        this._removeAnchorFromNode(sceneAnchor)
        this.addAnchoredNode(sceneAnchor, sceneNode, logger)
    }

    removeSceneAnchor(sceneAnchor, logger) {
        logger.log("Removing Scene Anchor")
        this.session.removeAnchor(sceneAnchor)
        this._removeAnchorFromNode(sceneAnchor)
    }

    _fetchImage(info,logger) {
        return new Promise((res,rej) => {
            const img = new Image()
            img.crossOrigin = "Anonymous"
            img.src = info.image.src
            logger.log("Loading image",img.src)
            img.onload = () => {
                res(img)
            }
        })
    }

    createDetectionImage(info, logger) {
        logger.log("creating/find an image recognizer")
        return new Promise((res,rej) => {            
            if (!info.image || !info.node) {
                logger.log("createDetectionImage: missing image or threejs node")
                rej("createDetectionImage: missing image or threejs node")
                return
            }

            if (!this.session) {
                logger.log("no session")
                rej("no session")
                return
            }

            let imageRealworldWidth = info.imageRealworldWidth || 1

            if (this.imageDetectorMap[info.image.src]) {
                let det = this.imageDetectorMap[info.image.src]
                if (imageRealworldWidth != det.realWorldWidth) {
                    logger.log("can't create the same image with different real world width")
                    rej("can't create the same image with different real world width")
                    return
                }
                logger.log("createDetectionImage: already created, returning it")
                res(det.name)
                return
            }

            this._fetchImage(info,logger).then(image => {
                logger.log("got the image",toFlatString(image))
    
                //info contains
                // * callback: to call when the image is found
                // * image: info about the image to recognize. src is at image.src
                // * imageRealworldWidth: width of the image in meters
                // * object: the anchor object
                // * node: the ThreeJS group which represents the anchor. It should be updated as the scene changes
                // * recType: current set to SCENE_START, meaning we should recognize as soon as the scene starts up
    
        
                // random name from https://gist.github.com/6174/6062387
                let name = [...Array(10)].map(i => (~~(Math.random() * 36)).toString(36)).join('')
        
                // Get ImageData
                let canvas = document.createElement('canvas')
                let context = canvas.getContext('2d')
                canvas.width = image.width
                canvas.height = image.height
        
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
                    rej( new Error("foo"))
                }
                logger.log(`calling createDetectionImage with image width and height ${image.width} ${image.height}`)
        
                // Attach image observer handler
                this.session.nonStandard_createDetectionImage(name, idata.data, image.width, image.height, imageRealworldWidth).then(() => {
                    this.imageDetectorMap[info.image.src] = {
                        name: name,
                        realWorldWidth: imageRealworldWidth,
                        anchor: null
                    }
                    res(name)
                }).catch(error => {
                    logger.error(`error creating detection image: ${error}`)
                    rej(error)
                })
            }).catch(error => {
                logger.error(`error creating detection image: ${error}`)
                rej(error)
            })
        })
    }

    startImageRecognizer(info, name, logger) {
        logger.log("starting Image Recognizer")

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

        let node = info.node
        let recType = 0 // unused. currently set to SCENE_START -> meaning we should recognize as soon as the scene starts up

        if (!this.imageDetectorMap[info.image.src]) {
            logger.error("not detection object for image", info.image.src)
            return
        }

        let det = this.imageDetectorMap[info.image.src]

        // there is already an anchor tracking this image, either from this
        // scene or another
        if (det.anchor) {
            if (info.reactivate) {
                logger.log("Found existing anchor: reactivate")
                // we want to reactivate.  So destroy the anchor, remove it from
                // the node it was tracking, and continue below to reactivate
                this.session.removeAnchor(det.anchor)
                logger.log("remove from previous node")
                this._removeAnchorFromNode(det.anchor)
                det.anchor = null
            } else {
                logger.log("Found existing anchor: use it")
                // we want to reuse, likely from some previous scene.
                // So, remove the relationship to whatever node is in the 
                // anchor map, and reset it to this node.   
                logger.log("remove from previous node")
                this._removeAnchorFromNode(det.anchor)
                logger.log("add our node")
                this.addAnchoredNode(det.anchor, node, logger)
                if (callback) {
                    callback(info)
                }
                return
            }
        } 

        node.anchorName = null
        logger.log("activate detection image")
        this.session.nonStandard_activateDetectionImage(det.name).then(anchor => {
            logger.log("found detection image")
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
    }

    stopImageRecognizer(info, logger) {
        console.log("Stopping image recognizer")
        if(!this._anchoredNodes) return

        if (!this.imageDetectorMap[info.image.src]) {
            logger.error("no detection object for image", info.image.src)
            return
        }

        let det = this.imageDetectorMap[info.image.src]

        if (det.anchor) {
            console.log("already found the image, removing it")
            this._removeAnchorFromNode(det.anchor)
            det.anchor = null
        }

        console.log("deactivating the image")
        this.session.nonStandard_deactivateDetectionImage(det.name).then(() => {
        }).catch(error => {
            logger.error(`error deactivating detection image: ${error}`)
        })
    }


    createGeoAnchor(info, logger) {        
        logger.log("creating or reusing a geospatial anchor")
        return new Promise((res,rej) => {            
            if (!info.node) {
                logger.log("Missing threejs node")
                rej("Missing threejs node")
                return
            }

            if (!this.session) {
                logger.log("no session")
                rej("no session")
                return
            }

            if (this.geoAnchorMap[info.location.id]) {
                let det = this.geoAnchorMap[info.location.id]
                logger.log("found geoanchor: already created, returning it")
                res()
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
                    logger.log(toFlatString(lla))
                    XRGeospatialAnchor.createGeoAnchor(lla).then(anchor => {
                        this.geoAnchorMap[info.location.id] = {
                            anchor: anchor
                        }
                        res()
                        return;
                    }).catch(error => {
                        logger.error(`error creating geospatial anchor: ${error}`)
                        rej(error)
                    })
                } else {
                    XRGeospatialAnchor.getDefaultElevation(lla).then(altitude => {
                        lla.height = altitude
                        logger.log("XRGeoAnchor: Placing an object at specified lla and estimated altitude")
                        logger.log(toFlatString(lla))
                        XRGeospatialAnchor.createGeoAnchor(lla).then(anchor => {
                            this.geoAnchorMap[info.location.id] = {
                                anchor: anchor
                            }
                            res()
                            return;
                        }).catch(error => {
                            logger.error(`error creating geospatial anchor: ${error}`)
                            rej(error)
                        })
                    }).catch(error => {
                        logger.error(`error getting default elevation: ${error}`)
                        rej(error)
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
                        logger.log(toFlatString(lla))
                        XRGeospatialAnchor.createGeoAnchor(lla).then(anchor => {
                            this.geoAnchorMap[info.location.id] = {
                                anchor: anchor
                            }
                            res()
                            return;
                        }).catch(error => {
                            logger.error(`error creating geospatial anchor: ${error}`)
                            rej(error)
                        })
                    }).catch(error => {
                        logger.error(`error getting default elevation: ${error}`)
                        rej(error)
                    })
                }).catch(error => {
                    logger.error(`error getting device cartographic location: ${error}`)
                    rej(error)
                })
            }
        })
    }


    addGeoAnchoredNode(info, logger) {
        logger.log("adding a geotracked node")

        if (!info.node) {
            logger.log("Missing threejs node")
            return
        }

        if (!this.session) {
            logger.log("no session")
            return
        }

        if (!this.geoAnchorMap[info.location.id]) {
            logger.error("not geolocation anchor for object", info.location.id)
            return
        }

        let det = this.geoAnchorMap[info.location.id]

        /*
        info contains
         location:  a geo location asset, has properties for latitude, longitude, altitude, useAltitude
         recType: the recognition type. for now always SCENE_START
         object: the anchor object. It reresents the anchor in the 3D scene. has tx,ty,tz, rotation, etc.
         node: the actual ThreeJS object that mirrors the propertites of the `object` above
         callback: a function to be called once the geo anchor is recognized. By default this callback will fire a 'recognized' event and make the anchor visible in the scene
         */

        let callback = info.callback
        let node = info.node
        let recType = 0 // unused. currently set to SCENE_START -> meaning we should recognize as soon as the scene starts up


        this._removeAnchorFromNode(det.anchor)
        logger.log("add our node")
        this.addAnchoredNode(det.anchor, node, logger)
        if (callback) {
            callback(info)
        }
    }

    /// BLAIR:  Need a way to destroy geo Anchors!
    stopGeoTracker(info, logger) {
        // info.node may be destroyed before we get here
        if (info && info.node) {
            this._removeAnchorForNode(info.node)
        }
    }

    _handleAnchorDelete(logger, details) {
        logger.log("delete anchor")
        let anchor = details.source
        this._removeAnchorFromNode(anchor)
    }

    _removeAnchorForNode(node) {
        this._anchoredNodes.forEach( (value) => {
            if(value.node == node) {
                this._removeAnchorFromNode(node.anchor)
                return
            }
        })
    }

    _removeAnchorFromNode(anchor) {
        const anchoredNode = this._anchoredNodes.get(anchor.uid)
        if (anchoredNode) {
            const node = anchoredNode.node
            node.anchor = null

            anchor.removeEventListener("update", anchor._handleAnchorUpdateCallback)
            anchor.removeEventListener("removed", anchor._handleAnchorDeleteCallback)
            anchor._handleAnchorUpdateCallback = null
            anchor._handleAnchorDeleteCallback = null

            // NOTIFY SOMEBODY? TODO
            this._anchoredNodes.delete(anchor.uid)
        }
    }

    _handleAnchorUpdate(logger, details) {
        // logger.log("anchor update")
        const anchor = details.source
        const anchoredNode = this._anchoredNodes.get(anchor.uid)
        if (anchoredNode) {
            const node = anchoredNode.node
            node.matrixAutoUpdate = false
            node.matrix.fromArray(anchor.modelMatrix)
            node.updateMatrixWorld(true)
        }
    }

}