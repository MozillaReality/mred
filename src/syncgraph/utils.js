export function createGraphObjectFromObject(graph, json) {
    const objid = graph.createObject()
    Object.keys(json).forEach(key => {
        const value = json[key]
        graph.createProperty(objid, key, value)
    })
    return objid
}

export function fetchGraphObject(graph, child) {
    const obj = {}
    graph.getPropertiesForObject(child).forEach(key => {
        obj[key] = graph.getPropertyValue(child, key)
    })
    return obj
}

function propToArray(doc, CH) {
    const len = doc.getArrayLength(CH)
    const ch = []
    for (let i = 0; i < len; i++) {
        ch.push(doc.getElementAt(CH, i))
    }
    return ch
}
