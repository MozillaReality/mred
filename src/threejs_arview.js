
/*
	XRExampleBase holds all of the common XR setup, rendering, and teardown code for a THREE.js based app
	It also holds a list of THREE nodes and XRAnchorOffsets which it uses to update the nodes' poses

	Extending classes should be able to focus mainly on rendering their scene and handling user input

	Parameters:
		domElement: an element used to show error messages
		createVirtualReality: if true, create a new empty reality for this app

	WebVR 1.1 displays require that the call to requestPresent be a direct result of an input event like a click.
	If you're trying to use a WebVR 1.1 display then you'll need to pass false in the shouldStartPresenting parameter
	of the constructor and then call this.startPresenting() inside an input event handler.

*/

function warning() {
  let url = "https://itunes.apple.com/us/app/webxr-viewer/id1295998056?mt=8"
  document.body.innerHTML =
    `<br/><br/><center>
     <div style="color:white;width:80%;background:#400;border:3px solid red">
     Please use the WebXR iOS browser to experience this app.
     <br/><br/>
     <a href="https://itunes.apple.com/us/app/webxr-viewer/id1295998056?mt=8">
     https://itunes.apple.com/us/app/webxr-viewer/id1295998056?mt=8</a></div>
   `
}

import {XRAnchorCartography} from './XRAnchorCartography.js'


export class XRExampleBaseModified {

	constructor(domElement, createVirtualReality=true, shouldStartPresenting=true, useComputerVision=false, worldSensing=false, alignEUS=true){

		this.el = domElement

		this.createVirtualReality = createVirtualReality
		this.shouldStartPresenting = shouldStartPresenting
		this.useComputerVision = useComputerVision
		this.alignEUS = alignEUS
		this.worldSensing = worldSensing

		this._boundHandleFrame = this._handleFrame.bind(this) // Useful for setting up the requestAnimationFrame callback

		// Set during the XR.getDisplays call below
		this.displays = null

		// Set during this.startSession below		
		this.display = null
		this.session = null

		if(typeof navigator.XR === 'undefined'){
			this.showMessage('No WebXR API found, usually because the WebXR polyfill has not loaded')
			return
		}

		// Get displays and then request a session
		navigator.XR.getDisplays().then(displays => {
			if(displays.length == 0) {
				this.showMessage('No displays are available')
				return
			}
			this.displays = displays
			this.init3js()
			// Give extending classes the opportunity to initially populate the scene
			this.initializeScene()
			this._startSession()
		}).catch(err => {
			console.error('Error getting XR displays', err)
			this.showMessage('Could not get XR displays')
		})

	}

	_startSession(){

		let sessionInitParameters = {
			exclusive: this.createVirtualReality,
			type: this.createVirtualReality ? XRSession.REALITY : XRSession.AUGMENTATION,
			videoFrames: this.useComputerVision,    //computer_vision_data
			alignEUS: this.alignEUS,
			worldSensing: this.worldSensing
		}

		for(let display of this.displays){
			if(display.supportsSession(sessionInitParameters)){
				this.display = display
				break
			}
		}
		if(this.display === null){
			this.showMessage('Could not find a display for this type of session')
			return
		}
		this.display.requestSession(sessionInitParameters).then(session => {
			this.session = session
			this.session.depthNear = 0.1
			this.session.depthFar = 1000.0

if(!this.display._arKitWrapper) {
  warning();
  return
}

			// Handle session lifecycle events
			this.session.addEventListener('focus', ev => { this.handleSessionFocus(ev) })
			this.session.addEventListener('blur', ev => { this.handleSessionBlur(ev) })
			this.session.addEventListener('end', ev => { this.handleSessionEnded(ev) })

			this.newSession();

			if(this.shouldStartPresenting){
				// VR Displays need startPresenting called due to input events like a click
				this.startPresenting()
			}
		}).catch(err => {
			console.error('Error requesting session', err)
			this.showMessage('Could not initiate the session')
		})
	}

	/*
	  Clients should override to be called when a new session is created
	  */
	newSession() {}

	/*
		Empties this.el, adds a div with the message text, and shows a button to test rendering the scene to this.el
	*/
	showMessage(messageText){
		let messages = document.getElementsByClassName('common-message')
		if(messages.length > 0){
			var message = messages[0]
		} else {
			var message = document.createElement('div')
			message.setAttribute('class', 'common-message')
			this.el.append(message)
		}
		let div = document.createElement('div')
		div.innerHTML = messageText
		message.appendChild(div)
	}

	/*
	WebVR 1.1 displays require that the call to requestPresent be a direct result of an input event like a click.
	If you're trying to set up a VR display, you'll need to pass false in the shouldStartPresenting parameter of the constructor
	and then call this.startPresenting() inside an input event handler.
	*/
	startPresenting(){
		if(this.session === null){
			this.showMessage('Can not start presenting without a session')
			throw new Error('Can not start presenting without a session')
		}

		// Set the session's base layer into which the app will render
		this.session.baseLayer = new XRWebGLLayer(this.session, this.glContext)

		// Handle layer focus events
		this.session.baseLayer.addEventListener('focus', ev => { this.handleLayerFocus(ev) })
		this.session.baseLayer.addEventListener('blur', ev => { this.handleLayerBlur(ev) })

		this.session.requestFrame(this._boundHandleFrame)
	}

	// Extending classes can react to these events
	handleSessionFocus(ev){}
	handleSessionBlur(ev){}
	handleSessionEnded(ev){}
	handleLayerFocus(ev){}
	handleLayerBlur(ev){}

	// set up the video processing
	//
	setVideoWorker(worker){
		this.session.setVideoFrameHandler(worker)
	}

	// request the next frame
	// buffers is an optional parameter, suggesting buffers that could be used
	requestVideoFrame() {
		this.session.requestVideoFrame();
	}

	_handleFrame(frame){
		const nextFrameRequest = this.session.requestFrame(this._boundHandleFrame)
		this.headPose = frame.getDisplayPose(frame.getCoordinateSystem(XRCoordinateSystem.HEAD_MODEL))
		//this._handleAnchors(frame)
		this._handleScene(frame)
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// 3js

	init3js() {

		let width = window.innerWidth || 1024
		let height = window.innerHeight || 1024

		this.scene = new THREE.Scene() // The scene will be rotated and oriented around the camera using the head pose

		this.camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000) // These values will be overwritten by the projection matrix from ARKit or ARCore
		this.camera.position.set(0,0,0)
		this.scene.add(this.camera)

		if(true) {
			// Create a canvas and context for the session layer
			this.glCanvas = document.createElement('canvas')
			this.glContext = this.glCanvas.getContext('webgl')
			if(this.glContext === null){
				this.showMessage('Could not create a WebGL canvas')
				throw new Error('Could not create GL context')
			}

			// Set up the THREE renderer with the session's layer's glContext
			this.renderer = new THREE.WebGLRenderer({
				canvas: this.glCanvas,
				context: this.glContext,
				antialias: false,
				alpha: true
			})
			this.renderer.setPixelRatio(1)
			this.renderer.autoClear = false
			this.renderer.setClearColor('#000', 0)

			this.initComposer(width,height)

		} else {
			// standalone test code - unused

            //this.camera.aspect = width / height;
            //this.camera.updateProjectionMatrix();
			//this.scene.background = new THREE.Color( 0xff00ff )

			this.scene.add( new THREE.AmbientLight( 0xaaaaaa, 0.2 ) );
			var light = new THREE.DirectionalLight( 0xddffdd, 0.6 );
			light.position.set( 1, 1, 1 );
			light.castShadow = true;
			light.shadow.mapSize.width = 1024;
			light.shadow.mapSize.height = 1024;
			this.scene.add(light)

			this.renderer = new THREE.WebGLRenderer()
            this.renderer.shadowMap.enabled = true;
            this.renderer.setSize(width,height)
            document.body.appendChild( this.renderer.domElement );
			this.renderer.setClearColor('#000', 0)

			this.initComposer(width,height)

			let scope = this

			var lastTimeStamp;
			var render = function() {
				if(scope.composer) {
					scope.composer.render()
				} else {
					scope.renderer.render( scope.scene, scope.camera );
				}
				requestAnimationFrame( render );
			}
	        requestAnimationFrame( render );

			if(false) {
				let geometry = new THREE.SphereGeometry( 0.07, 32, 32 ); 
				let material = new THREE.MeshPhongMaterial({ color: '#FF0099' })
				let mesh = new THREE.Mesh(geometry, material)
				mesh.position.set(0,0,-1)
				this.scene.add(mesh)
				this.setOutlined(mesh)
			}

		}

	}

	setOutlined(mesh) {
		if(this.outlinePass) this.outlinePass.selectedObjects = mesh ? [ mesh ] : []
	}

	initComposer(width,height) {

		// an effect

		this.composer = new THREE.EffectComposer( this.renderer )
		this.renderPass = new THREE.RenderPass( this.scene, this.camera )
		this.composer.addPass( this.renderPass )
		let outlinePass = this.outlinePass = new THREE.OutlinePass( new THREE.Vector2( width, height ), this.scene, this.camera )
/*
		outlinePass.edgeStrength = Number( 5 );
		outlinePass.edgeGlow = Number( 1 );
		outlinePass.edgeThickness = Number( 8 );
		outlinePass.pulsePeriod = Number( 1 );
		outlinePass.usePatternTexture =  true;
		//outlinePass.visibleEdgeColor.set( value );
		//outlinePass.hiddenEdgeColor.set( value );
*/
		this.composer.addPass( this.outlinePass )


		let loader = new THREE.TextureLoader();
		loader.load( '/assets/tri_pattern.jpg', (texture) => {
			this.outlinePass.patternTexture = texture;
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;	
		});
		this.effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
		this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / width, 1 / height );
		this.effectFXAA.renderToScreen = true;
		this.composer.addPass( this.effectFXAA );

        this.composer.setSize( width, height );

	}
	
	//
	// Extending classes should override this to set up the scene during class construction
	//
	initializeScene(){}

	//
	// Extending classes that need to update the layer during each frame should override this method
	//
	updateScene(frame){}

	_handleScene(frame) {


		let width = this.session.baseLayer.framebufferWidth || window.innerWidth
		let height = this.session.baseLayer.framebufferHeight || window.innerHeight

		// Let the extending class update the scene before each render
		this.updateScene(frame)

		// Prep THREE.js for the render of each XRView
		this.renderer.autoClear = false
		this.renderer.setSize(width,height, false)
		this.renderer.clear()

		this.camera.matrixAutoUpdate = false

		// Render each view into this.session.baseLayer.context
		for(const view of frame.views){
			// Each XRView has its own projection matrix, so set the camera to use that
			this.camera.matrix.fromArray(view.viewMatrix)
			this.camera.updateMatrixWorld()
			this.camera.projectionMatrix.fromArray(view.projectionMatrix)

			// Set up the renderer to the XRView's viewport and then render
			this.renderer.clearDepth()
			const viewport = view.getViewport(this.session.baseLayer)
			this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
			this.doRender()
		}

	}

	doRender(){
		if(this.composer) {
			this.composer.render()
			return
		} else {
			this.renderer.render(this.scene, this.camera)
		}
	}

}

///
/// UXAugmentedView
///
/// Manages display and user interaction for entities
///

class AugmentedView extends XRExampleBaseModified {

	constructor(entity_manager,dom_element) {

        super(dom_element,false,true,false,true,true)

        this.dom_element = dom_element

        // general settings
        this.params = {}
        this.params.general_object_size = 0.1

        // block the parent class from doing some work
		this.requestedFloor = true

		this.entity_manager = entity_manager

		this.nodes = {}

		this.please_update = 1
	}

	///
	/// called by parent class - scene geometry and update callback helpers
	///

	initializeScene() {
		this.listenerSetup = false

		// load a font
		var loader = new THREE.FontLoader();
		loader.load( '/fonts/helvetiker_bold.typeface.json', font => {
			console.log(font)
			this.font = font
		})

		// add some light
		this.scene.add(new THREE.AmbientLight('#FFF', 0.2))

		let directionalLight = new THREE.DirectionalLight('#FFF', 0.6)
		directionalLight.position.set(1, 1, 1)

		let pointLight = new THREE.PointLight( 0xffffff );
		this.camera.add(pointLight);

		//let flashlight = new THREE.SpotLight(0xffffff,4,40);
		//this.camera.add(flashlight);
		//flashlight.position.set(0,0,1);
		//flashlight.target = this.camera;
		//flashlight.castShadow = false;

		// attach something to 0,0,0 - TODO this breaks picker HORRIBLY
        //this.scene.add( this.AxesHelper( this.params.general_object_size ) );

        // attach picker
		this.arcontrols = new ARControls(this,this.dom_element,this.camera,this.scene)
	}

	///
	/// Called once per frame by base class, before render, to give the app a chance to update this.scene
	///

	updateScene(frame) {

		// is this display active?

		if(!this.please_update) {
			return
		}

		// scene controls helper

		this.arcontrols.update(frame)

		// visit all the entities and do useful frame related work ( asynchronous )

		this.entity_manager.entityUpdateAll(this.session,frame)

		// mark and sweep - since entities can come and go outside of local scope

		for(let uuid in this.nodes) { this.nodes[uuid].survivor = 0 }

		// visit all the entities again and attach art to them

		this.entity_manager.entityAll((entity)=>{
			// do nothing till ready
			if(!entity.relocalized) return
			// associate visual art with an entity if needed
			let node = this.nodes[entity.uuid]
			// did art change? throw node away - cannot rely on mark and sweep because the entry itself is rewritten below
			if(node && node.art != entity.art) {
				console.log("entity has new art = " + entity.uuid + " " + entity.art )
				this.scene.remove(node)
				entity.triedToLoadArt = 0
				node = 0
			}
			// if invalid node then remake
			if(!node && !entity.triedToLoadArt) {
				entity.triedToLoadArt = 1
				node = this.createSceneGraphNode(entity.art)
				if(!node) return
				node.art = entity.art
				node.myuuid = entity.uuid
				this.scene.add(node)
				this.nodes[entity.uuid] = node
			}

			if(!node) return

			// mark as surviving
			node.survivor = 1

			// build a transform

			let m = new THREE.Matrix4()
			let xyz = entity.xyz || new THREE.Vector3(0,0,0)
			let s = entity.scale || new THREE.Vector3(1,1,1)
			//let q = entity.quaternion || new THREE.Quaternion()
			let q = new THREE.Quaternion()
			let what = entity.euler ? new THREE.Euler( entity.euler._x, entity.euler._y, entity.euler._z ) : new THREE.Euler()
			q.setFromEuler(what)
			m.compose(xyz,q,s)
			entity.transform = m

			// test
			if(false && entity.xyz) {
				node.position.set(entity.xyz.x,entity.xyz.y,entity.xyz.z)
			} else

			if(entity.transform) {
				node.matrix.fromArray(entity.transform.elements)
				node.matrixAutoUpdate = false
				node.updateMatrixWorld(true)
			}
		})

		// remove nodes that don't seem to be used anymore
		for(let uuid in this.nodes) {
			let node = this.nodes[uuid]
			if(node && !node.survivor) {
				this.scene.remove(node)
				delete this.nodes[uuid]
			}
		}

	}

	AxesHelper( size ) {
		size = size || 1;
			var vertices = [
			0, 0, 0,	size, 0, 0,
			0, 0, 0,	0, size, 0,
			0, 0, 0,	0, 0, size
		];
			var colors = [
			1, 0, 0,	1, 0.6, 0,
			0, 1, 0,	0.6, 1, 0,
			0, 0, 1,	0, 0.6, 1
		];
		let geometry = new THREE.BufferGeometry();
		geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
		let material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );
		return new THREE.LineSegments(geometry, material);
	}


	loadGLTF(url,size){

		// a parent that is a bounding sphere for ray intersection tests
		let geometry = new THREE.SphereGeometry( size, 32, 32 )
		var material = new THREE.MeshBasicMaterial( {color: 0x00ff00 } )
		var group = new THREE.Mesh( geometry, material )

		// load callback
		let callback = (gltf) => {

			if(!gltf || !gltf.scene) {
				return // oh well it tried - doesn't matter if fails
			}

			// start animations
	        if(gltf.animations && gltf.animations.length){
	            let mixer = new THREE.AnimationMixer(gltf.scene)
	            for(let animation of gltf.animations){
	                mixer.clipAction(animation).play()
	            }
	        }

			// center on self
			let bbox = new THREE.Box3().setFromObject(gltf.scene)
		    const scale = size / bbox.getSize(new THREE.Vector3()).length() * 2;
		    const offset = bbox.getCenter(new THREE.Vector3()).multiplyScalar(scale);
		    gltf.scene.scale.set(scale, scale, scale);
		    gltf.scene.position.sub(offset);

			group.add(gltf.scene)

			// turn the parent material invisible
			material.visible = false
		}

		// load

		let loader = new THREE.GLTFLoader()
		loader.load(url, callback )

		// return group before load is sone

		return group
	}


	//
	// This routine cannot fail - must return some 3js mesh of some kind
	//

	createSceneGraphNode(args = 0) {

		if(!args || !args.length) args = "duck"

		let size = this.params && this.params.general_object_size ? this.params.general_object_size : 0.2

		let args2 = args.toLowerCase()
		let isurl = args2.startsWith("http")
		let ispath = args2.startsWith("/")

		// a primitive?

		if(args2 == "cylinder") {
			let geometry = new THREE.CylinderGeometry( size/2, size/2, size/2, 32 );
			let material = new THREE.MeshPhongMaterial({ color: '#FF0099' })
			return new THREE.Mesh(geometry, material)
		}

		if(args2 == "sphere") {
			let geometry = new THREE.SphereGeometry( size/2, 32, 32 );
			let material = new THREE.MeshPhongMaterial({ color: '#FF0099' })
			return new THREE.Mesh(geometry, material)
		}

		if(args2 == "box" || args2 == "cube") {
			let geometry = new THREE.BoxBufferGeometry(size, size, size);
			let material = new THREE.MeshPhongMaterial({ color: '#FF0099' })
			return new THREE.Mesh(geometry, material)
		}

		if(args2 == "duck") {
			args = args2 = "https://raw.githubusercontent.com/mozilla/webxr-polyfill/master/examples/image_detection/DuckyMesh.glb"
		}

		// text bubble?

		if(args2.startsWith("bub ")) {

			args = args.substring(4)

/*https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
				CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
				  if (w < 2 * r) r = w / 2;
				  if (h < 2 * r) r = h / 2;
				  this.beginPath();
				  this.moveTo(x+r, y);
				  this.arcTo(x+w, y,   x+w, y+h, r);
				  this.arcTo(x+w, y+h, x,   y+h, r);
				  this.arcTo(x,   y+h, x,   y,   r);
				  this.arcTo(x,   y,   x+w, y,   r);
				  this.closePath();
				  return this;
				}

*/
				CanvasRenderingContext2D.prototype.roundRect = function(sx,sy,ex,ey,r) {
				    var r2d = Math.PI/180;
				    if( ( ex - sx ) - ( 2 * r ) < 0 ) { r = ( ( ex - sx ) / 2 ); } //ensure that the radius isn't too large for x
				    if( ( ey - sy ) - ( 2 * r ) < 0 ) { r = ( ( ey - sy ) / 2 ); } //ensure that the radius isn't too large for y
				    this.beginPath();
				    this.moveTo(sx+r,sy);
				    this.lineTo(ex-r,sy);
				    this.arc(ex-r,sy+r,r,r2d*270,r2d*360,false);
				    this.lineTo(ex,ey-r);
				    this.arc(ex-r,ey-r,r,r2d*0,r2d*90,false);
				    this.lineTo(sx+r,ey);
				    this.arc(sx+r,ey-r,r,r2d*90,r2d*180,false);
				    this.lineTo(sx,sy+r);
				    this.arc(sx+r,sy+r,r,r2d*180,r2d*270,false);
				    this.closePath();
				}

				function drawBubble(ctx, x, y, w, h, radius)
				{
				  var r = x + w;
				  var b = y + h;
				  ctx.beginPath();
				  ctx.strokeStyle="#30A030";
				  ctx.lineWidth="6";
				  ctx.moveTo(x+radius, y);
				  //ctx.lineTo(x+radius/2, y-10);
				  //ctx.lineTo(x+radius * 2, y);
				  ctx.lineTo(r-radius, y);
				  ctx.quadraticCurveTo(r, y, r, y+radius);
				  ctx.lineTo(r, y+h-radius);
				  ctx.quadraticCurveTo(r, b, r-radius, b);
				  ctx.lineTo(x+radius, b);
				  ctx.quadraticCurveTo(x, b, x, b-radius);
				  ctx.lineTo(x, y+radius);
				  ctx.quadraticCurveTo(x, y, x+radius, y);
				  ctx.stroke();
				}

		      function wrapText(context, text, x, y, maxWidth, lineHeight) {
		        var words = text.split(' ');
		        var line = '';
		        for(var n = 0; n < words.length; n++) {
		          var testLine = line + words[n] + ' '
		          var metrics = context.measureText(testLine);
		          var testWidth = metrics.width
		          if (testWidth > maxWidth && n > 0) {
		            context.fillText(line, x, y)
		            line = words[n] + ' '
		            y += lineHeight
		          }
		          else {
		            line = testLine
		          }
		        }
		        context.fillText(line, x, y)
		        console.log(line)
		      }
    
    let fsize = 40
    let w = 600.0
    let h = 220.0

			let canvas = document.createElement("canvas")
			canvas.width = w
			canvas.height = h
			let context = canvas.getContext("2d")
			//context.clearRect(0,0,w,h);
			context.font = fsize + "pt Arial"
			//context.textAlign = "center"
			//context.fillStyle = "#000000"
			//context.fillRect(0, 0, w, h)
			context.fillStyle = "#cc00cc"
			context.strokeStyle = "#cc00cc";
			//context.fillText(args, canvas.width / 2, canvas.height / 2)

			//	context.roundRect(0,0,600,600,10).stroke(); //or .fill() for a filled rect
			//_cxt.roundRect(35,10,260,120,20);
			//_cxt.strokeStyle = "#000";
			//_cxt.stroke();

			drawBubble(context,10,10,w-20,h-20,5)

			wrapText(context,args,fsize,fsize*1.5+2,w-fsize*2,fsize+2)

			let texture = new THREE.Texture(canvas)
			texture.needsUpdate = true
			let material = new THREE.MeshBasicMaterial({map : texture})
			return new THREE.Mesh(new THREE.PlaneGeometry(0.5, h/w, 10, 10), material)
		}

		// text?

		if(args2.startsWith("text ")) {
			args = args.substring(5)
			var geometry = new THREE.TextGeometry( args, {
				font: this.font,
				size: 0.1,
				height: 0.01,
			} )

			let material = new THREE.MeshPhongMaterial({ color: '#CC00CC' })
			return new THREE.Mesh(geometry, material)
		}

		// it is some kind of url - if not local then proxy requests at the server

		let path = isurl ? ('/proxy/' + encodeURIComponent(args)) : args

		// is it an image?

		var parser = document.createElement('a')
		parser.href = args
		let pathname = parser.pathname ? parser.pathname.toLowerCase() : 0
		if(pathname.endsWith(".jpg") || pathname.endsWith(".jpeg") || pathname.endsWith(".png") || pathname.endsWith(".gif")) {

			let loader = new THREE.TextureLoader()
		    var texture = loader.load( path )
			texture.minFilter = THREE.LinearFilter

		    let geometry = new THREE.BoxGeometry(0.3,0.3,0.01,10,10)
		    var material = new THREE.MeshLambertMaterial( { map: texture } );
		    //var material = new THREE.MeshLambertMaterial({color: 0xffffff});
		    var mesh = new THREE.Mesh(geometry, material);
		    mesh.receiveShadow = true;
		    return mesh
		}

		// hmm, not something we know?

		//if(!pathname.endsWith(".glb") || !pathname.endsWith(".gltf")) {
		//	args = args2 = "https://raw.githubusercontent.com/mozilla/webxr-polyfill/master/examples/image_detection/DuckyMesh.glb"
		//}

		return this.loadGLTF(path,size)
	}

}

class ARControls {

	constructor(parent,domElement,camera,scene) {
		this.parent = parent // TODO tidy later
		this.domElement = domElement
		this.camera = camera
		this.scene = scene
		this.entity = 0
		this.node = 0
		this.counter = 0
		this.raycaster = new THREE.Raycaster()
		this.point = new THREE.Vector2(0,0)
		if(true) {
			let size = 0.01
			let geometry = new THREE.CylinderGeometry( size/2, size/2, size/2, 32 );
			let material = new THREE.MeshPhongMaterial({ color: '#FF0099' })
			this.temp = new THREE.Mesh(geometry, material)
		}

		this.please_finish = 0
		this.controls_active = 0

		this.domElement.addEventListener( 'touchstart', this._touchstart.bind(this), false );
		this.domElement.addEventListener( 'touchend', this._touchend.bind(this), false );
		this.domElement.addEventListener( 'touchmove', this._touchmove.bind(this), false );
	}

	_touchstart( event ) {
		if(this.entity || this.node) return
		if(this.controls_active) return

// hack - room for buttons - fix later TODO
		if(event.touches.length > 0 && event.touches[0].pageX > window.innerWidth - 64 ) return

		this.entity = this.parent.entity_manager.entityGetSelected()

// hack - let user move the gps illegally for now
//		if(!this.entity || this.entity.kind == "gps") return // TODO right now I don't see how I can let users move the gps anchor

		this.controls_active = 1
		event.preventDefault();
		this._drag_start(this.entity)
		this._stretch_start(event.touches)
	}

	_touchmove( event ) {
		if(!this.entity || !this.node) return
		if(!this.controls_active) return
		event.preventDefault()
		event.stopPropagation()
		this._stretch_update(event.touches)
	}

	_touchend( event ) {
		this.please_finish = 1
	}

	update(frame) {

		// try not to hammer on the system so much

		if(this.counter++ > 10) this.counter = 0; else return

		// frame handler around - good time to wrap up

		if(this.please_finish) {
			this.controls_active = 0
			this.please_finish = 0
			this._drag_finish(frame)
		}

		// do not change target if one is active

		if(this.controls_active) return

		// Try pick - this fails to find some geometries TODO

		this.raycaster.setFromCamera(this.point, this.camera )
		let intersects = this.raycaster.intersectObjects( this.scene.children )
		let intersect = 0
		for ( var i = 0; i < intersects.length; i++ ) {
			if(intersects[i].object && intersects[i].object.myuuid) {
				intersect = intersects[i].object
				break
			}
		}

		// look for entity - and if found it will become what is the focus for editing (even before touch events)

		let entity = intersect && intersect.myuuid ? this.parent.entity_manager.entitySetSelectedByUUID(intersect.myuuid) : 0

		if(!entity) {

			// deselect (it is not done above)

			this.parent.entity_manager.entitySetSelected(0)

			// hide outlining

			this.parent.setOutlined(0)

			return
		}

		// show an outline on focus

		this.parent.setOutlined(intersect)
	}

	_stretch_start(touches) {
		this.scale_latch = 0
	}

	_stretch_update(touches) {
		if(!this.entity || !this.node) return
		if(touches.length<2) return
		var dx = touches[ 0 ].pageX - touches[ 1 ].pageX
		var dy = touches[ 0 ].pageY - touches[ 1 ].pageY
		if(this.scale_latch == 0) {
			this.scale_latch = 1
			this.scale_distance_start = Math.sqrt( dx * dx + dy * dy )
			console.log("stretch scale is " + this.scale_distance_start)
		}
		let scale_distance = Math.sqrt( dx * dx + dy * dy )
		let scale = this.scale_distance_start > 0 ? scale_distance / this.scale_distance_start : 1
		if(scale < 0.1) scale = 0.1
		if(scale > 10) scale = 10
		let s = this.entity.scale = new THREE.Vector3( this.scale.x * scale, this.scale.y * scale, this.scale.z * scale )
		this.node.scale.set(s.x,s.y,s.z)
	} 

	_drag_start(entity) {

		this.entity = entity
		this.node = this.parent.nodes[this.entity.uuid]
		this.xyz = entity.xyz ? new THREE.Vector3(entity.xyz.x,entity.xyz.y,entity.xyz.z) : new THREE.Vector3(0,0,0)
		this.scale = entity.scale ? new THREE.Vector3(entity.scale.x,entity.scale.y,entity.scale.z) : new THREE.Vector3(1,1,1)

		this.temp.art = this.node.art
		this.parent.nodes[this.entity.uuid] = this.temp
		this.node.matrixAutoUpdate = true
		this.scene.remove(this.node)
		this.camera.add(this.node)
		this.node.position.set(0,0,-0.5)
	}

	async _drag_finish(frame) {
		if(!this.entity || !this.node) return

		// get world details before detach
		let xyz = new THREE.Vector3()
		let q = new THREE.Quaternion()
		this.node.getWorldPosition(xyz)
		this.node.getWorldQuaternion(q)

		// move back to normal place
		this.camera.remove(this.node)
		this.scene.add(this.node)
		this.parent.nodes[this.entity.uuid] = this.node

		// remake the anchor with this new position
		await XRAnchorCartography.move(frame,this.entity,xyz,q)

		// republish - TODO - not super exactly correct - especially gps entities
		this.entity.published = 0

		// clear
		this.entity = 0
		this.node = 0
	}

}

/*
this.camera.updateMatrixWorld()
this.camera.matrixWorldInverse.getInverse( this.camera.matrixWorld )
var vec = new THREE.Vector3( 0, 0, -2 )
vec.applyQuaternion( this.camera.quaternion )

var vector = camera.position.clone();x
vector.applyMatrix( camera.matrixWorld );

vec.applyMatrix4( camera.matrixWorldInverse );

var rot = camera.getWorldQuaternion();
rot.multiply(box.getWorldQuaternion().inverse());
var euler = new THREE.Euler().setFromQuaternion(rot);

*/


///
/// ARMain
/// Acts as a shim for the AugmentedView above which can't subclass HTMLElement (and also anyway remains visible all the time)
///

export class ARMain extends HTMLElement {

	content() {
	return `
		<style>
		.uxbutton {
		border-radius: 2px;
		background: transparent;
		border-style: solid;
		border-color: #aaeeaa;
		margin: 2px;
		padding: 2px;
		width: 64px;
		}
		.uxbutton img {
		width: 60px;
		filter: invert(0) hue-rotate(90deg) drop-shadow(16px 16px 10px rgba(0,0,0,0.9));
		}
		</style>
		<button style="position:absolute;right:10;top:40" class=uxbutton><img alt="editor" src="assets/flatsplatterred.png" ></img></button>
		<button style="position:absolute;right:10;top:110" class=uxbutton><img alt="maps" src="assets/flatglobered.png"   ></img></button>
		<button style="position:absolute;right:10;top:200" class=uxbutton><img alt="profile" src="assets/flatheadred.png" ></img></button>
		<button style="position:absolute;right:10;top:280" class=uxbutton><img alt="zones" src="assets/flatshellred.png"  ></img></button>
		`
	}

	constructor(_id=0,_class=0,entity_manager) {
		super()
  		if(_id) this.id = _id
  		if(_class) this.className = _class
  		this.entity_manager = entity_manager
		this.innerHTML = this.content()
		let view = new AugmentedView(this.entity_manager,this)

		// observe button events
		let callback = (e) => {
			e.preventDefault()
		    this.dispatchEvent( new CustomEvent('router_push', { bubbles: true, detail: e.target.alt }) )
			//window.history.push(e.target.alt)
			return 0
		}
	    this.querySelectorAll("button").forEach(element => { element.onclick = callback })

	    // observe hide / show and tell the augmented view to update or not
		new MutationObserver(() => {
			view.please_update = this.style.display == "block"
		}).observe(this,{attributes:true})
	}
}

customElements.define('ar-main', ARMain)

