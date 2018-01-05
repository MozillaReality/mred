import React, { Component } from 'react';
import TreeItemProvider, {TREE_ITEM_PROVIDER} from "./TreeItemProvider";
import selMan, {SELECTION_MANAGER} from "./SelectionManager";

const data = {
    root: {
        title:'stack',
        type:'stack',
        children: [
            {
                type:'scene',
                id:'scene1',
                title:'Opening Scene',
                children:[
                    {
                        id:'rect1',
                        type:'rect',
                        title:'first rect',
                        x:10,
                        y:10,
                        w:50,
                        h:50,
                        color:'yellow',
                    },
                    {
                        id:'text1',
                        type:'text',
                        title:'next card',
                        text:'the next card',
                        x:50,
                        y:100,
                        w:50,
                        h:50,
                        color:'black',
                        target: 'card2'
                    },
                ]
            },
        ]
    }
}

class HypercardCanvas3D extends Component {
    render() {
        return <div>I'm a canvas for 3d stuff</div>
    }
}

export default class HypercardEditor extends TreeItemProvider {
    constructor() {
        super()
        this.root = data.root;
    }
    getTitle() {
        return 'Hypercard 3D'
    }
    getSceneRoot() {
        return this.root
    }
    getCanvas() {
        return <HypercardCanvas3D provider={this}/>
    }
    hasChildren(item) {
        return false
    }
    getRendererForItem(item) {
        return <div>some item</div>
    }
    getProperties(item) {
        return []
    }
}