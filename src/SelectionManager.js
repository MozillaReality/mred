

export const SELECTION_MANAGER = {
    CHANGED:'CHANGED'
}

class SelectionManager {
    constructor(props) {
        this.listeners = {};
        this.selected = [];
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
    isSelected(node) {
        return (this.selected.indexOf(node) >= 0)
    }
    getSelection() {
        if(this.selected.length === 0) return null;
        return this.selected[0];
    }
}

export default new SelectionManager();
