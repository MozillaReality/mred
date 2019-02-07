export default class ObjectDef {
    updateProperty(node, obj, op, provider) {
        if (op.name === 'tx') node.position.x = parseFloat(op.value)
        if (op.name === 'ty') node.position.y = parseFloat(op.value)
        if (op.name === 'tz') node.position.z = parseFloat(op.value)
        if (op.name === 'rx') node.rotation.x = parseFloat(op.value)
        if (op.name === 'ry') node.rotation.y = parseFloat(op.value)
        if (op.name === 'rz') node.rotation.z = parseFloat(op.value)
        if (op.name === 'sx') node.scale.x = parseFloat(op.value)
        if (op.name === 'sy') node.scale.y = parseFloat(op.value)
        if (op.name === 'sz') node.scale.z = parseFloat(op.value)
    }
}
