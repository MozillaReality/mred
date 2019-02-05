export function createGraphObjectFromObject(graph, json) {
    return graph.createObject(json)
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
    graph.setProperty(child.id,'parent',parent.id)
    const ch = graph.getPropertyValue(parent.id,'children')
    graph.insertAfter(ch,null,child.id)
}

export function insertAsLastChild(graph, parent, child) {
    graph.setProperty(child.id,'parent',parent.id)
    const ch = graph.getPropertyValue(parent.id,'children')
    const len = graph.getArrayLength(ch)
    const prev = graph.getElementAt(ch,len-1)
    graph.insertAfter(ch,prev,child.id)
}

export function removeFromParent(graph, obj) {
    const parent = fetchGraphObject(graph, obj.parent)
    const n = indexOf(graph, parent.children, obj.id)
    if (n >= 0) {
        graph.removeElement(parent.children, n)
    } else {
        console.error("could not find index for child", obj, 'in children', parent.children)
    }
}


export function cloneShape(graph,shape) {
    const id = shape.id
    const id2 = graph.createObject()
    const props = graph.getPropertiesForObject(id)
    props.forEach(key => {
        graph.createProperty(id2,key,graph.getPropertyValue(id,key))
    })
    const shape2 = fetchGraphObject(graph,id2)
    return shape2
}
