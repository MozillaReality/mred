

import * as THREE from 'three'
import WebXRPolyfill from 'webxr-polyfill'
const polyfill = new WebXRPolyfill();
let XRSession = window.XRSession || polyfill.global.XRSession
let XRWebGLLayer = window.XRWebGLLayer || polyfill.global.XRWebGLLayer

///
/// XR Support
///
/// The WebXR exposes an API for talking to various XR devices in a standards based way.
/// This code is a wrapper to isolate some of the setup into one place.
///
///

export default class XRSupport {

	constructor(args) {

		// caller must provide some parameters
		this.camera = args.camera
		this.canvas = args.canvas ? args.canvas : args.renderer.domElement
		this.context = args.context ? args.context : args.renderer.getContext()
		this.renderer = args.renderer
		this.updateScene = args.updateScene || 0
		this.renderScene = args.renderScene || 0

		// avoid clearing color and depth since both are apparently over-written by the xr pass through camera
		this.renderer.autoClear = false

		// caller may provide a message handler for some convenience messages
		this.showMessage = args.showMessage || this.defaultShowMessage

		// Set during the XR.getDisplays call below
		this.displays = null

		// Set during this.startSession below		
		this.display = null
		this.session = null

		// Useful for setting up the requestAnimationFrame callback
		this._boundHandleFrame = this._handleFrame.bind(this)

		// WebXR present at all?
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
			this._startSession(args)
		}).catch(err => {
			console.error('Error getting XR displays', err)
			this.showMessage('Could not get XR displays')
		})

	}

	_startSession(args){

		let sessionInitParameters = {
			exclusive: args.createVirtualReality,
			type: args.createVirtualReality ? XRSession.REALITY : XRSession.AUGMENTATION,
			videoFrames: args.useComputerVision,    //computer_vision_data
			alignEUS: args.alignEUS,
			worldSensing: args.worldSensing
		}

		for(let display of this.displays) {
			if(display.supportsSession(sessionInitParameters)) {
				this.display = display
				break
			}
		}

		if(this.display === null) {
			this.showMessage('Could not find a display for this type of session')
			return
		}

		this.display.requestSession(sessionInitParameters).then(session => {
			this.session = session
			this.session.depthNear = 0.1
			this.session.depthFar = 1000.0

			if(!this.display._arKitWrapper) {
			  this.popupWarning()
			  return
			}

			if(args.shouldStartPresenting) {
				// VR Displays need startPresenting called due to input events like a click
				this.startPresenting()
			}
		}).catch(err => {
			console.error('Error requesting session', err)
			this.showMessage('Could not initiate the session')
		})
	}

	// WebVR 1.1 displays require that the call to requestPresent be a direct result of an input event like a click.
	// If you're trying to set up a VR display, you'll need to pass false in the shouldStartPresenting parameter of the constructor
	// and then call this.startPresenting() inside an input event handler.
	startPresenting(){
		if(this.session === null){
			this.showMessage('Can not start presenting without a session')
			throw new Error('Can not start presenting without a session')
		}

		// Set the session's base layer into which the app will render
		this.session.baseLayer = new XRWebGLLayer(this.session, this.context)

		// kickstart updates
		this.session.requestFrame(this._boundHandleFrame)
	}

	_handleFrame(frame){
		const nextFrameRequest = this.session.requestFrame(this._boundHandleFrame)

		if(!this.updateScene) {
			return
		}

		// a clock
		if(!this.clock) this.clock = new THREE.Clock()
        let time = this.clock.getElapsedTime()

		// callback to update the 3js scenegraph
		if(this.updateScene) this.updateScene(time,this.session,frame)

		let width = this.session.baseLayer.framebufferWidth || window.innerWidth
		let height = this.session.baseLayer.framebufferHeight || window.innerHeight

		// Render each view into session.baseLayer.context - there is only 1 view on arkit for an ios device
		for(const view of frame.views) {

			// Each XRView has its own projection matrix, so set the camera to use that
			this.camera.matrixAutoUpdate = false
			this.camera.matrix.fromArray(view.viewMatrix)
			this.camera.updateMatrixWorld()
			this.camera.projectionMatrix.fromArray(view.projectionMatrix)

			// Prep THREE.js for the render of each XRView
			this.renderer.autoClear = false
			this.renderer.setSize(width,height, false)
			this.renderer.clear()

			// Set up the renderer to the XRView's viewport and then render
			this.renderer.clearDepth()

			// set paint target
			const viewport = view.getViewport(this.session.baseLayer)
			this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)

			// paint
			if(this.renderScene) this.renderScene()
		}
	}

	///
	/// a div with the message text, and shows a button to test rendering the scene
	///
	defaultShowMessage(messageText) {
		let messages = document.getElementsByClassName('common-message')
		if(messages.length > 0){
			var message = messages[0]
		} else {
			var message = document.createElement('div')
			message.setAttribute('class', 'common-message')
			document.body.append(message)
		}
		let div = document.createElement('div')
		div.innerHTML = messageText
		message.appendChild(div)
	}

	///
	/// helper
	///
	popupWarning() {
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

}
