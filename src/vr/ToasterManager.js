/**
 * Created by josh on 11/29/16.
 */
module.exports = {
    adds: [],
    add: function add(note) {
        this.adds.forEach(cb => cb(note))
    },
    onAdd: function onAdd(cb) {
        this.adds.push(cb);
    },
}
