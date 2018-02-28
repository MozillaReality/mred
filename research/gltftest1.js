const loader = new THREE.GLTFLoader()
const exporter = new THREE.GLTFExporter()
console.log("the loader is",loader)
loader.load('../public/imp/scene.gltf',
    (gltf) =>{
        console.log("loaded",gltf);

        console.log('scene count',gltf.scenes.length)
        console.log('primary scene',gltf.scene)
        console.log('cameras', gltf.cameras.length)
        console.log('animations', gltf.animations.length)

        console.log("asset metadataf",gltf.asset)

        gltf.scene.traverse(( child ) => console.log(`child node ${child.name} ${child.type}`))
        gltf.scene.traverse((ch)=>{
            if(ch.name === 'Imp') {
                console.log("found the imp")
                exporter.parse(ch,(gltf)=>{
                    console.log("GLTF is",gltf)
                    console.log(JSON.stringify(gltf))
                })
            }
        })
    },
    (xhr)=>{
        console.log("xhr",xhr)
    },
    (err)=>{
        console.log("err",err)
    })
