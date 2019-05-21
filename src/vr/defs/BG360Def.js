import {fetchGraphObject} from '../../syncgraph/utils'
import {ASSET_TYPES, NONE_ASSET, OBJ_TYPES, PROP_DEFS} from '../Common'
import * as THREE from 'three'
import {MeshLambertMaterial} from 'three'
import {DoubleSide} from 'three'
import {TextureLoader} from 'three'
import {VideoTexture} from 'three'

function customize(node,mat,obj) {
    mat.onBeforeCompile = (shader) => {
        //add uniform
        shader.uniforms.imageOffsetAngle    = { value: obj.imageOffsetAngle }
        shader.uniforms.imageCropStartAngle = { value: obj.imageCropStartAngle }
        shader.uniforms.imageCropEndAngle   = { value: obj.imageCropEndAngle }
        //prepend to the shader the defs
        shader.vertexShader = `
            uniform float imageOffsetAngle;
            varying float vImageOffsetAngle;
            uniform float imageCropStartAngle;            
            varying float vImageCropStartAngle;            
            uniform float imageCropEndAngle;            
            varying float vImageCropEndAngle;            
        ` + shader.vertexShader

        //copy into fragment shader
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',`
            #include <begin_vertex>
            vImageOffsetAngle = imageOffsetAngle;
            vImageCropStartAngle = imageCropStartAngle;
            vImageCropEndAngle = imageCropEndAngle;
        `)

        //prepend to the fragment shader the defs
        shader.fragmentShader = `
                varying float vImageOffsetAngle;
                varying float vImageCropStartAngle;
                varying float vImageCropEndAngle;
            `+shader.fragmentShader
        //use in the shader
        shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>',`
            if(vUv.x < vImageCropStartAngle) discard;
            if(vUv.x > vImageCropEndAngle)  discard;
            // gl_FragColor.r = vUv.x;
            // vec3 jv = vec3(cos(gl_FragCoord.x/50.0)); 
            // vec3 empty = vec3(0.0,0.0,0.0);//vec3(jv,jv,jv)
            // gl_FragColor.rgb = mix(empty,diffuseColor.rgb,jv);
        `)
        node.userData.matShader = shader
    }
}

export default class BG360Def {
    make(graph, scene) {
        if(!scene.id) throw new Error("can't create sphere w/ missing parent")
        return fetchGraphObject(graph,graph.createObject({
            type:OBJ_TYPES.bg360,
            title:'background',
            visible:true,
            asset:NONE_ASSET.id,
            parent:scene.id,
            imageOffsetAngle:0.0, //offset in UV coords, 0 to 1
            imageCropStartAngle:0.0, //crop left edge of image
            imageCropEndAngle:1.0, //crop right edge of image
        }))
    }
    makeNode(obj, provider) {
        const mat = new THREE.MeshLambertMaterial({color: 'white', side: THREE.BackSide})
        const node = new THREE.Mesh(new THREE.SphereBufferGeometry(20.0, 50,50),mat)
        customize(node,mat,obj)
        node.name = obj.title
        node.userData.clickable = true
        // on(node,POINTER_CLICK,e =>SelectionManager.setSelection(node.userData.graphid))
        this.attachAsset(node, obj, provider)
        return node
    }
    updateProperty(node, obj, op, provider) {
        if (op.name === PROP_DEFS.asset.key) return this.attachAsset(node, obj, provider)
        if(node.userData.matShader) {
            if (op.name === 'imageOffsetAngle') node.userData.matShader.uniforms.imageOffsetAngle.value = op.value
            if (op.name === 'imageCropStartAngle') node.userData.matShader.uniforms.imageCropStartAngle.value = op.value
            if (op.name === 'imageCropEndAngle') node.userData.matShader.uniforms.imageCropEndAngle.value = op.value
        } else {
            console.warn("BG360: no shader reference?!")
        }
    }

    attachAsset(node, obj, provider) {
        if(obj.asset === NONE_ASSET.id) {
            node.material = new MeshLambertMaterial({color: 'white', side:DoubleSide})
            return
        }
        const asset = provider.accessObject(obj.asset)
        if(!asset.exists()) return
        const url = provider.getAssetURL(asset)
        provider.getLogger().log("loading asset url",url)
        if(asset.subtype === ASSET_TYPES.IMAGE) {
            const tex = new TextureLoader().load(url)
            node.material = new MeshLambertMaterial({color: 'white', side: DoubleSide, map: tex})
        }
        if(asset.subtype === ASSET_TYPES.VIDEO) {
            let video
            if(!provider.videocache[url]) {
                video = document.createElement('video')
                video.crossOrigin = 'anonymous'

                // video will only play inline on mobile devices if it's muted
                // we will loop video
                video.muted = true;
                video.loop = true;
                video.setAttribute( 'playsinline', '' );

                video.src = url
                provider.videocache[url] = video
            } else {
                video = provider.videocache[url]
            }
            const tex = new VideoTexture(video)
            node.material = new MeshLambertMaterial({color: obj.color, side: DoubleSide, map: tex})
        }
    }

}
