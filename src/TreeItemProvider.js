
export const TREE_ITEM_PROVIDER = {
    EXPANDED_CHANGED:'EXPANDED_CHANGED',
    PROPERTY_CHANGED:'PROPERTY_CHANGED'
}

export default class TreeItemProvider {
    constructor() {
        console.log('created a tree item Provider')
    }

    setPropertyValue(item,def,value) {
        throw new Error("subclass of TreeItemProvider must implement setPropertyValue")
    }
}
