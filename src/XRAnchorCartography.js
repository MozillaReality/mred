
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///
/// Wrapper for WebXR-Polyfill that has a pile of static utilty methods to add geographic support to anchors
///
/// Given a map and one anchor on that map at a known gps location - provide gps coordinates for other anchors on the same map
///
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class XRAnchorCartography {

	static _gps() {
	    return new Promise((resolve, reject)=>{

			let gps = { latitude:37.7749, longitude:-122.4194, altitude: 0 }

			if (!("geolocation" in navigator)) {
				// fake it for now
				resolve(gps)
			}

			function success(pos) {
				let gps = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, altitude: pos.coords.altitude, accuracy: pos.coords.accuracy }
				resolve(gps)
			}

			function error(err) {
				// fake it
				resolve(gps)
				//reject(err)
			}

			try {
				let options = {
				  enableHighAccuracy: true,
				  timeout: 5000,
				  maximumAge: 0
				};
				navigator.geolocation.getCurrentPosition(success, error, options);
			} catch(err) {
				// unusual error - just return it
				reject(err)
			}
		})
	}

	static async _altitude(latitude,longitude) {
		let elevation = 0
		try {
			let key = "AIzaSyBrirea7OVV4aKJ9Y0UAp6Nbr6-fXtr-50"
			let url = "https://maps.googleapis.com/maps/api/elevation/json?locations="+latitude+","+longitude+"&key="+key
	        let response = await fetch(url)
	        let json = await response.json()
	        console.log("altitude query was")
	        console.log(json)
	        if(json && json.results) elevation = json.results.elevation
	    } catch(e) {
	    	console.error(e)
	    }
	    return elevation
	}

	static async gps() {
		let gps = await XRAnchorCartography._gps()
		let altitude = await XRAnchorCartography._altitude(gps.latitude,gps.longitude)
		if(altitude) gps.altitude = altitude
		return gps
	}

	///
	/// Get a new anchor
	///
	/// The caller has an abstract concept of a point in space they either want to get information about or update their understanding of.
	/// (In caller terms this can be a point at the camera, or a ray test, or other undefined queries yet to be implemented.)
	///
	/// ARKit itself formalizes this shared understanding as an 'anchor' - and anchors can move as ground truth updates.
	///
	/// As well, this engine introduces another concept on top of that of a gpsAnchor which associates an arkit anchor with a gps.
	///

	static async attach(frame,focus,style,screenx=0.5,screeny=0.5) {

		// get a gps reading?

		if(style == "gps" || style == "gpsorigin") {
			focus.kind = "gps"
			focus.gps = await this.gps()
			if(!focus.gps) {
				return 0
			}
		}

		// flush old anchor just to reduce memory usage in arkit

		if(focus.anchorUID) {
			let anchor = frame.getAnchor(focus.anchorUID)
			if(anchor) {
				frame.removeAnchor(focus.anchorUID)
				console.log("removing anchor due to moving in space " + focus.anchorUID )
				focus.anchorUID = 0
			}
		}

		// at origin (which can change dynamically in arkit so this does not mean a lot)

		if(style == "gpsorigin") {
			const wc = frame.getCoordinateSystem(XRCoordinateSystem.TRACKER)
			let xyz = new THREE.Vector3()
			let q = new THREE.Quaternion()
			focus.anchorUID = await frame.addAnchor(wc, [xyz.x, xyz.y, xyz.z], [q.x, q.y, q.z, q.w]) // [ !actually returns an anchorUID! ]
		}

		// get an anchor at camera?

		else if(style == "eye" || style == "gps") {
			let headCoordinateSystem = frame.getCoordinateSystem(XRCoordinateSystem.HEAD_MODEL)
			focus.anchorUID = await frame.addAnchor(headCoordinateSystem,[0,0,0])
		}

		// get an anchor at probe?

		else if( style == "project" ) {

			// probe the world and find an anchor(y kinda wrappery thing) that intersects a plane (using a ray shot from screen space)
			let offset = await frame.findAnchor(screenx,screeny)  // [ !actually returns an anchor offset! ]
			if(!offset) {
				return 0
			}

			// get this anchor - which is not the final one
			let anchor = frame.getAnchor(offset.anchorUID)
			if(!anchor) {
				return 0
			}

			// pull a 3js transform out of temporary anchor and delete temporary anchor(y kinda wrapper thingie)
			let m = new THREE.Matrix4()
			let xr_transform = offset.getOffsetTransform(anchor.coordinateSystem)
			m.fromArray(xr_transform)
			let s = new THREE.Vector3()
			let xyz = new THREE.Vector3()
			let q = new THREE.Quaternion()
			m.decompose(xyz,q,s);

			frame.removeAnchor(offset.anchorUID);
			console.log("throwing away temporary anchor " + offset.anchorUID )

			// get an anchorUID at the target point
			const wc = frame.getCoordinateSystem(XRCoordinateSystem.TRACKER)
			focus.anchorUID = await frame.addAnchor(wc, [xyz.x, xyz.y, xyz.z], [q.x, q.y, q.z, q.w]) // [ !actually returns an anchorUID! ]
		}

		if(focus) {
			// although there's enough information above to relocalize, I prefer to exercise the code below consistently
			focus.relocalized = 0
		}

		return focus
	}

	///
	/// relocalize
	///
	/// find the arkit local coordinate position given various hints
	///

	static relocalize(frame,focus,parent) {

		// Use the anchor to update gps objects every frame, and to update ordinary objects once only

		if(focus.kind == "gps" || !focus.relocalized) {
			focus.anchor = focus.anchorUID ? frame.getAnchor(focus.anchorUID) : 0
			if(focus.anchor) {

				// remake xyz of object

				let offset = new XRAnchorOffset(focus.anchorUID)
				let xr_transform = offset.getOffsetTransform(focus.anchor.coordinateSystem)
				let m = new THREE.Matrix4()
				m.fromArray(xr_transform)
				let s = new THREE.Vector3()
				let xyz = new THREE.Vector3()
				let q = new THREE.Quaternion()
				m.decompose(xyz,q,s)
				focus.xyz = xyz
				focus.anchor_xyz = xyz // for debugging

				// remake orientation - but for gps objects don't remake it unless needed (this allows the user to adjust it)

				if(focus.kind != "gps" || !focus.euler || !focus.quaternion ) {
					focus.quaternion = new THREE.Quaternion(q._x,q._y,q._z,q._w)
					focus.euler = new THREE.Euler().setFromQuaternion( focus.quaternion )
				}

				// If this is gps object then update the details for this frame and return - note I kill the euler

				if(focus.kind == "gps") {
					focus.cartesian = Cesium.Cartesian3.fromDegrees(focus.gps.longitude, focus.gps.latitude, focus.gps.altitude)
					focus.fixed = Cesium.Transforms.eastNorthUpToFixedFrame(focus.cartesian)
					focus.inverse = Cesium.Matrix4.inverseTransformation(focus.fixed, new Cesium.Matrix4())
					focus.relocalized = 1
					return
				}

				// Attempt to establish cartesian coordinates relative to parent

				if(parent) {

					let temp = {
						x: focus.xyz.x-parent.xyz.x,
						y: focus.xyz.y-parent.xyz.y,
						z: focus.xyz.z-parent.xyz.z
					}

					// treat this as a cartesian3 vector - but flip the axes (ARKit is East Up(outerspace) South and Cesium (by default) is East North Up(outerspace) )

					let temp2 = new Cesium.Cartesian3(temp.x, -temp.z, temp.y )

					// given magical cartesian fixed frame reference, tack on the vector segment

					focus.cartesian = Cesium.Matrix4.multiplyByPoint( parent.fixed, temp2, new Cesium.Cartesian3() )

					// although is now relocalized - do allow it to fall through to exercise cartesian recovery

					// focus.relocalized = 1
				}
			}
		}

		// Relocalize relative to parent

		if(parent) {

			// get a vector that is relative to the gps anchor (transform from ECEF to be relative to gps anchor)

			let temp = Cesium.Matrix4.multiplyByPoint(parent.inverse, focus.cartesian, new Cesium.Cartesian3());

			// flip axes from ENU to EUS (from cesium to arkit)

			let temp2 = {
				x:temp.x,
				y:temp.z,
				z:-temp.y
			}

			// tack on the gps anchor arkit offset to regenerate xyz

			focus.xyz = new THREE.Vector3(
				parent.xyz.x + temp2.x,
				parent.xyz.y + temp2.y,
				parent.xyz.z + temp2.z
			)

			// back compute the gps because it is used by the network - remote gps entities could have made it to here so block that

			if(focus.kind != "gps") {
				let carto  = Cesium.Ellipsoid.WGS84.cartesianToCartographic(focus.cartesian)
				let latitude = Cesium.Math.toDegrees(carto.latitude)
				let longitude = Cesium.Math.toDegrees(carto.longitude)
				let altitude = carto.height
				focus.gps = { latitude:latitude, longitude:longitude, altitude:altitude }
			}

			// mark as relocalized

			focus.relocalized = 1
		}
	}

	static async move(frame,focus,xyz,q) {

		// TODO this is so much easier than projecting through arkit and rebuilding anchors - maybe I should just make anchors this way in general

		if(focus.anchorUID) {
			let anchor = frame.getAnchor(focus.anchorUID)
			if(anchor) {
				frame.removeAnchor(focus.anchorUID)
				console.log("removing anchor due to moving in space " + focus.anchorUID )
				focus.anchorUID = 0
			}
		}

		// get an anchorUID at the target point
		const wc = frame.getCoordinateSystem(XRCoordinateSystem.TRACKER)
		focus.anchorUID = await frame.addAnchor(wc, [xyz.x, xyz.y, xyz.z], [q.x, q.y, q.z, q.w]) // [ !actually returns an anchorUID! ]

		// later on it will regenerate actual position of the feature...
		// TODO note it is probably a bad idea to move the gps anchor because the anchorUID will no longer match the saved file

		focus.euler = 0
		focus.quaternion = 0
		focus.xyz = 0
		focus.relocalized = 0
	}

	static updateLatLng(focus,latitude,longitude,altitude) {
		// a helper to allow external moving of a feature - since cartesian coordinates are used internally but gps used for ease of use
		focus.gps.latitude = latitude
		focus.gps.longitude = longitude
		focus.gps.altitude = altitude
		focus.cartesian = Cesium.Cartesian3.fromDegrees(focus.gps.longitude, focus.gps.latitude, focus.gps.altitude)
	}
}

