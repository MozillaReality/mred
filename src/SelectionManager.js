

export const SELECTION_MANAGER = {
    CHANGED:'CHANGED',
    DROP_TARGET_CHANGED:'DROP_TARGET'
}

class SelectionManager {
    constructor(props) {
        this.listeners = {};
        this.selected = [];
        this.dropTarget = null;
        this.clip = null
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
    addToSelection(node) {
        this.selected.push(node)
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
    isEmpty() {
        return this.selected.length === 0
    }
    getFullSelection() {
        return this.selected
    }
    setDropTarget(node) {
        if(this.dropTarget !== node) {
            this.dropTarget = node;
            this.fire(SELECTION_MANAGER.DROP_TARGET_CHANGED, this.dropTarget)
        }
    }
    getDropTarget() {
        return this.dropTarget
    }
    setDropType(type) {
        this.dropType = type
    }
    getDropType() {
        return this.dropType
    }

    setClipboard(clip) {
        this.clip = clip
    }
    getClipboard() {
        return this.clip
    }
}

export default new SelectionManager();
