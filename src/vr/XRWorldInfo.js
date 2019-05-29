import * as THREE from 'three'

import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3'

var meshMap = new Map()

const workingMatrix = mat4.create()
const workingVec3 = vec3.create()
var savedOrigin = [0,0,0]
var savedDirection = [0,0,-1]
var reticleParent = null
var reticle = null
            
var reticleTrackedColor = new THREE.Color( 0xDDFFDD );
var reticleNotTrackedColor = new THREE.Color( 0xFF6666 );
var reticleMaterial = new THREE.MeshStandardMaterial({ color: reticleTrackedColor })
var requestNextHit = true
let singleton = 0
let eyeLevelFrameOfReference = 0

export class XRWorldInfo extends THREE.Group {

    constructor(session) {

        // run as a singleton
        super()
        if(singleton) {
            console.error("XRWorldInfo called more than once")
            return singleton
        }
        singleton = this

        this.session = session

        // turn on some things

        let sensingState = session.updateWorldSensingState({
            illuminationDetectionState : {
                enabled : true
            },
            meshDetectionState : {
                enabled : true,
                normals: true
            }
        })

        console.log("********** WORLDINFO STARTING")

        // I guess I want this thing to be at the starting point persistently?
        let headFrameOfReference = session.requestFrameOfReference('head-model').then((results)=>{
            eyeLevelFrameOfReference = session.requestFrameOfReference('eye-level').then((moreresults)=>{
                mat4.getTranslation(workingVec3, workingMatrix)
                mat4.fromTranslation(workingMatrix, workingVec3)
                //session.addAnchor(workingMatrix, eyeLevelFrameOfReference).then((anchor)=>{
                //   // TODO - actually wire up this anchor
                //})

                // a reticule
                reticle = new THREE.Mesh( new THREE.RingGeometry(0.04, 0.05, 36, 64), reticleMaterial)
                reticle.geometry.applyMatrix(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(-90)))
                reticleParent = new THREE.Object3D()
                reticleParent.add(reticle)
                reticleParent.matrixAutoUpdate = false
                reticleParent.visible = false

                // stuff everything inside self
                this.add(reticleParent)

                // don't waste time remaking this every frame
                this._handleHitResults = this.handleHitResults.bind(this)

                console.log("********** WORLDINFO UP")
            })
        })
    }

    refreshWorldInfo(frame) {
        let worldInfo = frame.worldInformation
        if(!worldInfo || !worldInfo.meshes) return
        if(!worldInfo.meshes.forEach) {
            console.error("WHAT?")
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

        // udpate reticule
        if (requestNextHit) {
            requestNextHit = false
            this.session.requestFrameOfReference('head-model').then(headFrameOfReference => {
                this.session.requestHitTest(savedOrigin, savedDirection, headFrameOfReference)
                    .then(this._handleHitResults)
                    .catch(err => {
                        console.error('Error testing hits', err)
                    })
            })
        }
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
                    console.error("position and vertex arrays are different sizes", position, worldMesh)
                }
                position.setArray(worldMesh.vertexPositions);
                position.needsUpdate = true;
            }
            if (worldMesh.textureCoordinatesChanged) {
                let uv = object.threeMesh.geometry.attributes.uv
                if (uv.array.length != worldMesh.textureCoordinates.length) {
                    console.error("uv and vertex arrays are different sizes", uv, worldMesh)
                }
                uv.setArray(worldMesh.textureCoordinates);
                uv.needsUpdate = true;
            }
            if (worldMesh.triangleIndicesChanged) {
                let index = object.threeMesh.geometry.index
                if (index.array.length != worldMesh.triangleIndices) {
                    console.error("uv and vertex arrays are different sizes", index, worldMesh)
                }
                index.setArray(worldMesh.triangleIndices);
                index.needsUpdate = true;
            }
            if (worldMesh.vertexNormalsChanged && worldMesh.vertexNormals.length > 0) {
                // normals are optional
                let normals = object.threeMesh.geometry.attributes.normals
                if (normals.array.length != worldMesh.vertexNormals) {
                    console.error("uv and vertex arrays are different sizes", normals, worldMesh)
                }
                normals.setArray(worldMesh.vertexNormals);
                normals.needsUpdate = true;
            }
        }
    }

    handleRemoveNode(object) {
        object.threeMesh.geometry.dispose()
        meshMap.delete(object.worldMesh.uid)
        this.remove(object)
    }

    handleNewNode(worldMesh) {
        let worldMeshGroup = new THREE.Group();
        var mesh = this.newMeshNode(worldMesh)
        this.add(mesh)
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

    // handle hit testing slightly differently than other samples, since we're doing
    // it per frame.  The "boiler plate" code below is slightly different, setting 
    // requestNextHit on tap instead of executing the hit test.  The custom XREngineHits
    // does a hit test each frame if the previous one has resolved
    handleHitResults(session,hits) {
        let size = 0.05;
        if (hits.length > 0) {
            let hit = hits[0]
            session.requestFrameOfReference('head-model').then(headFrameOfReference => {
                // convert hit matrices from head to eye level coordinate systems
                headFrameOfReference.getTransformTo(eyeLevelFrameOfReference, workingMatrix)
                mat4.multiply(workingMatrix, workingMatrix, hit.hitMatrix)
                const node = reticleParent
                node.matrix.fromArray(workingMatrix)
                reticleParent.visible = true   // it starts invisible
                reticle.material.color = reticleTrackedColor
                node.updateMatrixWorld(true)
            })
        } else {
            reticle.material.color = reticleNotTrackedColor
        }
        requestNextHit = true
    }

}

