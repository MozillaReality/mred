//use only capital letters, 65->90
function genAlphaID(count) {
    let id = ""
    for(let i=0; i<count; i++) {
        id += String.fromCharCode(65 + Math.floor(Math.random() * (90 - 65)))
    }
    return id
}

console.log(genAlphaID(20))