import * as THREE from 'three'

import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3'

var meshMap = new Map()

const workingMatrix = mat4.create()
var savedOrigin = [0,0,0]
var savedDirection = [0,0,-1]
var reticleParent = null
var reticle = null
            
var reticleTrackedColor = new THREE.Color( 0xDDFFDD );
var reticleNotTrackedColor = new THREE.Color( 0xFF6666 );
var reticleMaterial = new THREE.MeshStandardMaterial({ color: reticleTrackedColor })
var requestNextHit = true
let singleton = 0

export class XRWorldInfo extends THREE.Group {

    constructor(engine,logger) {

        super()

        // run as a singleton
        if(singleton) {
            logger.error("XRWorldInfo called more than once - very bad")
            return singleton
        }
        singleton = this

        this.engine = engine
        this.session = engine.session
        this.logger = logger

        this._floorPos = vec3.create()

        // enable extended world sensing
        this.session.updateWorldSensingState({
            illuminationDetectionState : {
                enabled : true
            },
            meshDetectionState : {
                enabled : true,
                normals: true
            }
        })

        // don't waste time remaking this every frame
        this._handleHitResults = this.handleHitResults.bind(this)

        // a reticule
        reticle = new THREE.Mesh( new THREE.RingGeometry(0.04, 0.05, 36, 64), reticleMaterial)
        reticle.geometry.applyMatrix(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(-90)))
        reticleParent = new THREE.Object3D()
        reticleParent.add(reticle)
        reticleParent.matrixAutoUpdate = false
        reticleParent.visible = false

    }

    refreshWorldInfo(frame) {

        if(!this.visible) {
            return
        }

        let worldInfo = frame.worldInformation
        if(!worldInfo || !worldInfo.meshes) {
            return
        }

        // mark
        meshMap.forEach(object => { object.seen = false })

        // update meshes
        worldInfo.meshes.forEach(worldMesh => {
            var object = meshMap.get(worldMesh.uid);
            if (object) {
                this.handleUpdateNode(worldMesh, object)
            } else {
                this.handleNewNode(worldMesh)
            }
        })

        // sweep
        meshMap.forEach(object => { 
            if (!object.seen) {
                this.handleRemoveNode(object)
            } 
        })

        // update frame of reference when ready to do so
        if (requestNextHit) {
            requestNextHit = false
            this.session.requestFrameOfReference('head-model').then(headFrameOfReference => {
                this.session.requestFrameOfReference('eye-level').then((eyeLevelFrameOfReference)=>{

                    // update floor estimation
                    this.floorUpdate(headFrameOfReference,eyeLevelFrameOfReference)

                    // update reticule
                    this.session.requestHitTest(savedOrigin, savedDirection, headFrameOfReference)
                        .then(this._handleHitResults)
                        .catch(err => {
                            this.logger.error('Error testing hits', err)
                        })

                    //(TODO done elsewhere because I am unsure about asyncronity of handleHitResults)
                    //requestNextHit = true
                })
            })
        }
    }

    // handle hit testing slightly differently than other samples, since we're doing
    // it per frame.  The "boiler plate" code below is slightly different, setting 
    // requestNextHit on tap instead of executing the hit test.  The custom XREngineHits
    // does a hit test each frame if the previous one has resolved
    // TODO unsure why this has to request these frames of reference again
    handleHitResults(hits) {
        if (hits && hits.length > 0) {
            let hit = hits[0]
            this.session.requestFrameOfReference('head-model').then(headFrameOfReference => {
                this.session.requestFrameOfReference('eye-level').then((eyeLevelFrameOfReference)=>{
                    // convert hit matrices from head to eye level coordinate systems
                    headFrameOfReference.getTransformTo(eyeLevelFrameOfReference, workingMatrix)
                    mat4.multiply(workingMatrix, workingMatrix, hit.hitMatrix)
                    const node = reticleParent
                    node.matrix.fromArray(workingMatrix)
                    reticleParent.visible = true   // it starts invisible
                    reticle.material.color = reticleTrackedColor
                    node.updateMatrixWorld(true)
                })
            })
        } else {
            reticle.material.color = reticleNotTrackedColor
        }
        requestNextHit = true
    }

    handleUpdateNode(worldMesh, object) {
        object.seen = true
        // we don't need to do anything if the timestamp isn't updated
        if (worldMesh.timeStamp <= object.ts) {
            return;
        }
        if (worldMesh.vertexCountChanged) {
            let newMesh = this.newMeshNode(worldMesh)
            object.threeMesh.geometry.dispose()
            object.node.remove(object.threeMesh)
            object.node.add(newMesh)
            object.threeMesh = newMesh
        } else {
            if (worldMesh.vertexPositionsChanged) {
                let position = object.threeMesh.geometry.attributes.position
                if (position.array.length != worldMesh.vertexPositions.length) {
                    this.logger.error("position and vertex arrays are different sizes", position, worldMesh)
                }
                position.setArray(worldMesh.vertexPositions);
                position.needsUpdate = true;
            }
            if (worldMesh.textureCoordinatesChanged) {
                let uv = object.threeMesh.geometry.attributes.uv
                if (uv.array.length != worldMesh.textureCoordinates.length) {
                    this.logger.error("uv and vertex arrays are different sizes", uv, worldMesh)
                }
                uv.setArray(worldMesh.textureCoordinates);
                uv.needsUpdate = true;
            }
            if (worldMesh.triangleIndicesChanged) {
                let index = object.threeMesh.geometry.index
                if (index.array.length != worldMesh.triangleIndices) {
                    this.logger.error("uv and vertex arrays are different sizes", index, worldMesh)
                }
                index.setArray(worldMesh.triangleIndices);
                index.needsUpdate = true;
            }
            if (worldMesh.vertexNormalsChanged && worldMesh.vertexNormals.length > 0) {
                // normals are optional
                let normals = object.threeMesh.geometry.attributes.normals
                if (normals.array.length != worldMesh.vertexNormals) {
                    this.logger.error("uv and vertex arrays are different sizes", normals, worldMesh)
                }
                normals.setArray(worldMesh.vertexNormals);
                normals.needsUpdate = true;
            }
        }
    }

    handleRemoveNode(object) {
        this.remove(object.node)
        object.threeMesh.geometry.dispose()
        this.engine._removeAnchorForNode(object.node,this.logger)
        meshMap.delete(object.worldMesh.uid)
    }

    handleNewNode(worldMesh) {
        let worldMeshGroup = new THREE.Group();
        var mesh = this.newMeshNode(worldMesh)
        worldMeshGroup.add(mesh)
        this.add(worldMeshGroup)
        this.engine.addAnchoredNode(worldMesh, worldMeshGroup,this.logger)
        meshMap.set(worldMesh.uid, {
            ts: worldMesh.timeStamp, 
            worldMesh: worldMesh, 
            node: worldMeshGroup, 
            seen: true, 
            threeMesh: mesh
        })
    }

    newMeshNode(worldMesh) {
        let edgeColor, polyColor
//        if (worldMesh instanceof XRFaceMesh) {
//            edgeColor = '#999999'
//           polyColor = '#999900'
//        } else
        {
            edgeColor = '#11FF11'
            polyColor = '#009900'
        }
        let mesh = new THREE.Group();
        let geometry = new THREE.BufferGeometry()
        let indices = new THREE.BufferAttribute(worldMesh.triangleIndices, 1)
        indices.dynamic = true
        geometry.setIndex(indices)

        let verticesBufferAttribute = new THREE.BufferAttribute( worldMesh.vertexPositions, 3 )
        verticesBufferAttribute.dynamic = true
        geometry.addAttribute( 'position', verticesBufferAttribute );
        let uvBufferAttribute = new THREE.BufferAttribute( worldMesh.textureCoordinates, 2 )
        uvBufferAttribute.dynamic = true
        geometry.addAttribute( 'uv', uvBufferAttribute );
        if (worldMesh.vertexNormals.length > 0) {
            let normalsBufferAttribute = new THREE.BufferAttribute( worldMesh.vertexNormals, 3 )
            normalsBufferAttribute.dynamic = true
            geometry.addAttribute( 'normal', normalsBufferAttribute );
        } else {
            geometry.computeVertexNormals()
        }
        // transparent mesh
        var wireMaterial = new THREE.MeshPhongMaterial({color: edgeColor, wireframe: true})
        var material = new THREE.MeshPhongMaterial({color: polyColor, transparent: true, opacity: 0.25})
        mesh.add(new THREE.Mesh(geometry, material))
        mesh.add(new THREE.Mesh(geometry, wireMaterial))
        mesh.geometry = geometry;  // for later use
        //worldMesh.mesh = mesh;
        return mesh
    }

    floorUpdate(headLevel,eyeLevel) {

        // how close does a floor mesh extent need to be to the player to be a candidate?
        let playerRadiusSq=3*3

        // how far below a player does a floor mesh need to be to be a candidate?
        let playerTop=-0.5

        // how far below a player does a floor mesh need to be to be rejected as a candidate?
        let playerBottom=-2

        // scratch variables
        let playerPos = vec3.create()
        let meshPos = vec3.create()
        let bestPos = vec3.create()
        let bestY = 0

        // get player position
        headLevel.getTransformTo(eyeLevel, workingMatrix)
        mat4.getTranslation(playerPos, workingMatrix)

        // visit all candidate meshes
        meshMap.forEach(object => {

            let worldMesh = object.worldMesh

            // skip non horizontal features
            //if(worldMesh.alignment()) return

            // where is mesh center point in world coords?
            vec3.set(meshPos, worldMesh._center.x, worldMesh._center.y, worldMesh._center.z)
            vec3.transformMat4(meshPos,meshPos,worldMesh.modelMatrix)

            // an ideally negative number expressing the distance below the player Y
            let distanceY = meshPos[1] - playerPos[1]

            // candidate mesh is vertically to high?
            if(distanceY > playerTop) return

            // candidate mesh is vertically too low?
            if(distanceY < playerBottom) return

            // how far is a rough mesh extent from player in 2d in distance squared?
            let distSq = (playerPos[0]-meshPos[0])*(playerPos[0]-meshPos[0])
                       + (playerPos[2]-meshPos[2])*(playerPos[2]-meshPos[2])
                       - worldMesh._extent[0] * worldMesh._extent[0]
                       - worldMesh._extent[1] * worldMesh._extent[1]
                       - playerRadiusSq;

            // is too far away to be of interest?
            if(distSq > 0) return

            // distanceY fails to be the lowest acceptable candidate?
            if(bestY < distanceY) return

            // remember lowest area so far
            bestY = distanceY
            vec3.set(bestPos,playerPos[0],meshPos[1],playerPos[2])

        })

        // no new results? stick with previous state
        if(!bestY) return

        // insignificant change? stick with previous state
        if( vec3.squaredDistance(bestPos,this._floorPos) < 0.01) return

        // throw away old floor anchor and make a new one
        vec3.copy(this._floorPos,bestPos)
        mat4.fromTranslation(workingMatrix, this._floorPos)

        // debug
        this.logger.log("************** floor is at " + this._floorPos[1] )

    }

    get floorPos() {
        return this._floorPos
    }

    async getFloorAnchor() {
        let headFrameOfReference = await this.session.requestFrameOfReference('head-model')
        let eyeLevelFrameOfReference = await this.session.requestFrameOfReference('eye-level')
        headFrameOfReference.getTransformTo(eyeLevelFrameOfReference, workingMatrix)
        mat4.fromTranslation(workingMatrix,this._floorPos)
        return this.session.addAnchor(workingMatrix,eyeLevelFrameOfReference)
    }
}

