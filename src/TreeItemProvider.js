
export const TREE_ITEM_PROVIDER = {
    EXPANDED_CHANGED:'EXPANDED_CHANGED',
    STRUCTURE_CHANGED:'STRUCTURE_CHANGED',
    PROPERTY_CHANGED:'PROPERTY_CHANGED'
}

export default class TreeItemProvider {
    constructor() {
        console.log('created a tree item Provider')
        this.listeners = {};
        this.expanded_map = {};
    }
    on(type,cb) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(cb);
    }
    fire(type, value) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].forEach((cb) => cb(value));
    }
    off(type,cb) {
        if(this.listeners[type]) this.listeners[type] = this.listeners[type].filter(list => list !== cb)
    }
    isExpanded(item) {
        if(!item.id) item.id = ""+Math.random();
        if(typeof this.expanded_map[item.id] === 'undefined') this.expanded_map[item.id] = true;
        return this.expanded_map[item.id];
    }

    setPropertyValue(item,def,value) {
        throw new Error("subclass of TreeItemProvider must implement setPropertyValue")
    }
    getTreeActions() { return [] }
    getTools = () => []

    genID = (prefix) => {
        return `${prefix}_${Math.floor(Math.random() * 10000)}`
    }

}
