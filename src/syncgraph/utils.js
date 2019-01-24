export function createGraphObjectFromObject(graph, json) {
    const objid = graph.createObject()
    Object.keys(json).forEach(key => {
        const value = json[key]
        graph.createProperty(objid, key, value)
    })
    return objid
}

export function fetchGraphObject(graph, objid) {
    const obj = {}
    graph.getPropertiesForObject(objid).forEach(key => {
        obj[key] = graph.getPropertyValue(objid, key)
    })
    obj.id = objid
    return obj
}

export function propToArray(doc, CH) {
    const len = doc.getArrayLength(CH)
    const ch = []
    for (let i = 0; i < len; i++) {
        ch.push(doc.getElementAt(CH, i))
    }
    return ch
}

export function indexOf(graph, array, target) {
    const arr = propToArray(graph,array)
    return arr.findIndex(e => e === target)
}

export function insertAsFirstChild(graph, parent, child) {
    const ch = graph.getPropertyValue(parent,'children')
    graph.insertAfter(ch,null,child)
}
