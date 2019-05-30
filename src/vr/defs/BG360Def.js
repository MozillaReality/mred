import {fetchGraphObject} from '../../syncgraph/utils'
import {NONE_ASSET, OBJ_TYPES, PROP_DEFS} from '../Common'
import * as THREE from 'three'
import {MeshLambertMaterial} from 'three'
import {DoubleSide} from 'three'

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
            transparent:false,
            parent:scene.id,
            imageOffsetAngle:0.0, //offset in UV coords, 0 to 1
            imageCropStartAngle:0.0, //crop left edge of image
            imageCropEndAngle:1.0, //crop right edge of image
        }))
    }
    makeNode(obj, provider) {
        const mat = new THREE.MeshLambertMaterial({color: 'white', side: THREE.BackSide})
        const node = new THREE.Mesh(new THREE.SphereBufferGeometry(20.0, 50,50),mat)
        this.attachAsset(node, obj, provider)
        customize(node,mat,obj)
        node.name = obj.title
        node.userData.clickable = true
        node.visible = obj.visible
        return node
    }
    updateProperty(node, obj, op, provider) {
        if (op.name === PROP_DEFS.asset.key || op.name === PROP_DEFS.transparent.key) return this.attachAsset(node, obj, provider)
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
            node.material = new MeshLambertMaterial({side:DoubleSide})
            return
        }
        provider.assetsManager.getTexture(obj.asset).then(tex => {
            provider.getLogger().log("loadded asset",obj.asset)
            provider.getLogger().log(tex)
            if(!tex) provider.getLogger().error("error loading asset",obj.asset)
            const opts = {
                side: DoubleSide,
                map:tex
            }
            if(obj.transparent) {
                opts.transparent = true
                opts.alphaTest = 0.5
            }
            node.material = new MeshLambertMaterial(opts)
        }).catch(err => {
            provider.getLogger().error('error somwhere',err.message,err)
        })
    }

}
