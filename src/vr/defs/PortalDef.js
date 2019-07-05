import {fetchGraphObject} from "../../syncgraph/utils"
import ObjectDef from './ObjectDef'
import {NONE_ASSET, OBJ_TYPES, PROP_DEFS} from '../Common'
import * as THREE from 'three'

//////////////////////////////////////////////////////////////////////
// portal object itself
//////////////////////////////////////////////////////////////////////

//
// Attach a copy shader to the Reflector which makes the texture present as a material to threejs
// (this is done prior to allowing users to use the reflector itself)
//
let THREEReflectorShader = {
  uniforms: {
    'color': {type: 'c',value: null},
    'tDiffuse': {type: 't',value: null},
    'textureMatrix': {type: 'm4',value: null}
  },
  vertexShader: [
    'uniform mat4 textureMatrix;',
    'varying vec4 vUv;',
    'void main() {',
    '   vUv = textureMatrix * vec4( position, 1.0 );',
    '   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}'
  ].join( '\n' ),
  fragmentShader: [
    'uniform vec3 color;',
    'uniform sampler2D tDiffuse;',
    'varying vec4 vUv;',
    'float blendOverlay( float base, float blend ) {',
    '   return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );',
    '}',
    'vec3 blendOverlay( vec3 base, vec3 blend ) {',
    '   return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );',
    '}',
    'void main() {',
    '   vec4 base = texture2DProj( tDiffuse, vUv );',
    '   gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',
    '}'
  ].join( '\n' )
}

//
// Build a constructor that can be invoked later by user
//

class THREEReflector extends THREE.Mesh {

  constructor(options) {

//  	super()
  
    var childrenMode = options.childrenMode || 0
    var color = ( options.color !== undefined ) ? new THREE.Color( options.color ) : new THREE.Color( 0xFFFFFF );
    var clear = ( options.clear !== undefined ) ? new THREE.Color( options.clear ) : new THREE.Color( 0xFF0000 );
    var textureWidth = options.textureWidth || 512;
    var textureHeight = options.textureHeight || 512;
    var clipBias = options.clipBias || 0;
    var shader = THREEReflectorShader;
    var recursion = options.recursion !== undefined ? options.recursion : 1;

    // Build a few static variables to avoid thrashing memory at runtime
    var reflectorPlane = new THREE.Plane();
    var normal = new THREE.Vector3();
    var reflectorWorldPosition = new THREE.Vector3();
    var cameraWorldPosition = new THREE.Vector3();
    var scratchMatrix = new THREE.Matrix4();
    var lookAtPosition = new THREE.Vector3( 0, 0, - 1 );
    var clipPlane = new THREE.Vector4();
    var viewport = new THREE.Vector4();
    var view = new THREE.Vector3();
    var target = new THREE.Vector3();
    var q = new THREE.Vector4();
    var size = new THREE.Vector2();
    var textureMatrix = new THREE.Matrix4();
    var virtualCamera = new THREE.PerspectiveCamera();

    // Build a texture to render into
    var parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBFormat,
      stencilBuffer: false
    }
    var renderTarget = new THREE.WebGLRenderTarget(
      textureWidth,
      textureHeight,
      parameters
    )
    if ( ! THREE.Math.isPowerOfTwo( textureWidth ) || ! THREE.Math.isPowerOfTwo( textureHeight ) ) {
      renderTarget.texture.generateMipmaps = false;
    }

    // After the target texture is rendered it needs to pretend it is a material so threejs can paint it
    var material = new THREE.ShaderMaterial( {
      side: THREE.DoubleSide,
      uniforms: THREE.UniformsUtils.clone( shader.uniforms ),
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader
    } );
    material.uniforms[ "tDiffuse" ].value = renderTarget.texture;
    material.uniforms[ "color" ].value = color;
    material.uniforms[ "textureMatrix" ].value = textureMatrix;

    let geometry = new THREE.PlaneBufferGeometry(options.width, options.height)

    // make a mesh
    super(geometry,material) //let mesh = new THREE.Mesh(geometry,material)

    // Have a private scene
    let privateScene = new THREE.Scene()
    let privateLight1 = new THREE.PointLight(0xffffff, 1, 1000); privateLight1.intensity = 2
    let privateLight2 = new THREE.DirectionalLight()
    privateScene.add(privateLight1)
    privateScene.add(privateLight2) 

    // Rebuild the texture of the portal every frame
    let group = this
    let scope = this
    scope.onBeforeRender = function ( renderer, portalParentGroup, camera ) {

        // number of bounces - may be less useful for portals than mirrors?
        if ( 'recursion' in camera.userData ) {
          if ( camera.userData.recursion === recursion ) return;
          camera.userData.recursion ++;
        }

        // find positions and vector between
        reflectorWorldPosition.setFromMatrixPosition( scope.matrixWorld )
        cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld )
        view.subVectors( reflectorWorldPosition, cameraWorldPosition )

        // get a normal for the direction of the portal based on where we are
        scratchMatrix.extractRotation( scope.matrixWorld )
        let portalDirection = view.dot(normal)<0 ? 1 : -1
        normal.set( 0, 0, portalDirection )
        normal.applyMatrix4( scratchMatrix )

        // get a clone of the current camera as a scratch space
        // TODO slightly wasteful of CPU
        virtualCamera = camera.clone()

        // transform the camera to be relative to the portals pose in the exterior world
        let portalInverse = scratchMatrix.getInverse(scope.matrixWorld)
        virtualCamera.applyMatrix(portalInverse)

        // clear this for some reason?
        virtualCamera.userData.recursion = 0;
      
        // Update the texture matrix
        textureMatrix.set(
          0.5, 0.0, 0.0, 0.5,
          0.0, 0.5, 0.0, 0.5,
          0.0, 0.0, 0.5, 0.5,
          0.0, 0.0, 0.0, 1.0
        );
        textureMatrix.multiply( virtualCamera.projectionMatrix )
        textureMatrix.multiply( virtualCamera.matrixWorldInverse )
        textureMatrix.multiply( scope.matrixWorld )

        //////////////////////////////////////////////////
        // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
        // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
        //////////////////////////////////////////////////

        if(true) {
            reflectorPlane.setFromNormalAndCoplanarPoint( normal, reflectorWorldPosition );
            reflectorPlane.applyMatrix4( virtualCamera.matrixWorldInverse );

            clipPlane.set( reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant );

            var projectionMatrix = virtualCamera.projectionMatrix;

            q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
            q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
            q.z = -1.0;
            q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

            // Calculate the scaled plane vector
            clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) );

            // Replacing the third row of the projection matrix
            projectionMatrix.elements[ 2 ] = clipPlane.x;
            projectionMatrix.elements[ 6 ] = clipPlane.y;
            projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - clipBias;
            projectionMatrix.elements[ 14 ] = clipPlane.w;
        }

        // move other children to a private scene for painting to portal texture
        group.children.slice().forEach(child=>{
        	group.remove(child)
        	privateScene.add(child)
        	child.visible = true
        })

        // Render to the texture
        {
            // Save renderer state
            let currentRenderTarget = renderer.getRenderTarget();
            let currentVrEnabled = renderer.vr.enabled;
            let currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
            let currentClearColor = renderer.getClearColor()
            let currentClearAlpha = renderer.getClearAlpha()

            // Render to buffer
            renderer.vr.enabled = false; // Avoid camera modification and recursion
            renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows
            renderer.setRenderTarget( renderTarget )
            renderer.setClearColor(clear)
            renderer.setClearAlpha(0)
            renderer.clear()
            renderer.render( privateScene, virtualCamera )

            // Restore renderer settings
            renderer.setClearColor(currentClearColor,currentClearAlpha)
            renderer.setClearAlpha(currentClearAlpha)
            renderer.vr.enabled = currentVrEnabled
            renderer.shadowMap.autoUpdate = currentShadowAutoUpdate
            renderer.setRenderTarget( currentRenderTarget )
        }

        // move children back into this group and make them invisible
        // XXX the problem is that they still won't update...
        privateScene.children.slice().forEach(child=>{
        	privateScene.remove(child)
        	group.add(child)
        	child.visible = false
        })

        // restore viewport
        var bounds = camera.bounds;
        if ( bounds !== undefined ) {
          renderer.getSize( size );
          var pixelRatio = renderer.getPixelRatio();
          viewport.x = bounds.x * size.width * pixelRatio;
          viewport.y = bounds.y * size.height * pixelRatio;
          viewport.z = bounds.z * size.width * pixelRatio;
          viewport.w = bounds.w * size.height * pixelRatio;
          renderer.state.viewport( viewport );
        }

    }

  }

}

/////////////////////////////////////////////////
// app logic to manage it
/////////////////////////////////////////////////

let COUNTER = 0

export default class PortalDef extends ObjectDef {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create portal w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.portal,
            title:'portal '+COUNTER++,
            visible:true,
            width:1, height:2, depth:0.1,
            tx:0, ty:0, tz:0,
            rx:0, ry:0, rz:0,
            sx:1, sy:1, sz:1,
            clipBias: 0.001,
            recursion: 1,
            textureWidth: 512,
            textureHeight: 512,
            color:'#00ffff',
            clear:'#ff0000',
            children:graph.createArray(),
            transparent:false,
            parent:scene.id
        }))
    }
    makeNode(obj, provider) {
    	let node = new THREEReflector({
          width: obj.width || 1,
          height: obj.height || 1,
          clipBias: 0.001,
          textureWidth: 512,
          textureHeight: 512,
          color: obj.color || "purple",
          clear: obj.clear || "red",
          recursion: 1,
        })
        node.name = obj.title
        node.userData.clickable = true
        node.position.set(obj.tx, obj.ty, obj.tz)
        node.rotation.set(obj.rx,obj.ry,obj.rz)
        node.scale.set(obj.sx,obj.sy,obj.sz)
        node.visible = obj.visible
        return node
    }

    updateProperty(node, obj, op, provider) {
    	// TODO TBD
        return super.updateProperty(node,obj,op,provider)
    }

}
