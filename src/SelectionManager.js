

export const SELECTION_MANAGER = {
    CHANGED:'CHANGED',
    DROP_TARGET_CHANGED:'DROP_TARGET'
}

class SelectionManager {
    constructor(props) {
        this.listeners = {};
        this.selected = [];
        this.dropTarget = null;
    }
    on(type,cb) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(cb);
    }
    off(type,cb) {
        const index = this.listeners[type].indexOf(cb)
        if(index>=0) this.listeners[type].splice(index,1)
    }
    fire(type, value) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].forEach((cb) => cb(value));
    }
    setSelection(node) {
        this.selected = [node]
        this.fire(SELECTION_MANAGER.CHANGED,this)
    }
    clearSelection() {
        this.selected = []
        this.fire(SELECTION_MANAGER.CHANGED,this)
    }
    isSelected(node) {
        return (this.selected.indexOf(node) >= 0)
    }
    getSelection() {
        if(this.selected.length === 0) return null;
        return this.selected[0];
    }
    getFullSelection() {
        return this.selected
    }
    setDropTarget(node) {
        this.dropTarget = node;
        this.fire(SELECTION_MANAGER.DROP_TARGET_CHANGED,this.dropTarget)
    }
    getDropTarget() {
        return this.dropTarget
    }
}

export default new SelectionManager();
