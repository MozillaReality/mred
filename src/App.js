import React, { Component } from 'react';
import './App.css';
import PropSheet from './PropSheet'
import SMM, {SELECTION_MANAGER} from "./SelectionManager"
import TreeTable from "./TreeTable";
import TreeItemProvider, {TREE_ITEM_PROVIDER} from './TreeItemProvider';

const data = {
    root: {
        title:'root',
        type:'scene',
        children:[
            {
                title:'camera',
                type:'camera',
                children:[]
            },
            {
                title:'group',
                type:'group',
                children:[
                    {
                        title:'sphere1',
                        type:'sphere',
                        children:[]
                    },
                    {
                        title:'sphere2',
                        type:'sphere',
                        children:[]
                    }
                ]
            },
            {
                title:'cube',
                type:'cube',
                children:[]
            }
        ]
    },
};
data.selected = data.root.children[1].children[1];

const SceneItemRenderer = (props) => {
    if(props.item.type === 'camera') return <div><i className="fa fa-camera"/> {props.item.title}</div>
    if(props.item.type === 'cube')  return <div><i className="fa fa-cube"/> {props.item.title}</div>
    if(props.item.type === 'group')  return <div><i className="fa fa-cubes"/> {props.item.title}</div>
    if(props.item.type === 'sphere')  return <div><i className="fa fa-circle"/> {props.item.title}</div>
    if(props.item.type === 'scene')  return <div><i className="fa fa-diamond"/> {props.item.title}</div>
    return <div>{props.item.title}</div>
}

class SceneTreeItemProvider extends TreeItemProvider {
    constructor(root) {
        super();
        this.root = root;
        this.expanded_map = {};
        this.listeners = {};
    }
    on(type,cb) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(cb);
    }
    fire(type, value) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].forEach((cb) => cb(value));
    }
    getSceneRoot() {
        return this.root;
    }
    getRendererForItem(item) {
        return <SceneItemRenderer item={item}/>
    }
    isExpanded(item) {
        if(!item.id) item.id = ""+Math.random();
        if(typeof this.expanded_map[item.id] === 'undefined') this.expanded_map[item.id] = true;
        return this.expanded_map[item.id];
    }
    hasChildren(item) {
        return (item.children && item.children.length>0)
    }
    getChildren(item) {
        return item.children;
    }
    toggleItemCollapsed(item) {
        const current = this.isExpanded(item);
        this.expanded_map[item.id] = !current;
        this.fire(TREE_ITEM_PROVIDER.EXPANDED_CHANGED,item);
    }
    getProperties(item) {
        var defs = [];
        if(!item) return defs;
        if(item.id){
            defs.push({
                name:'ID',
                key:'id',
                value:item.id
            })
        }
        if(item.type) {
            defs.push({
                name:'type',
                key:'type',
                value:item.type
            })
        }
        return defs;
    }
}

const SM = new SceneTreeItemProvider(data.root);


const GridLayout = (props) => {
    return <div className='grid'>{props.children}</div>
};
const Toolbar = (props) => {
    let cls = "toolbar";
    if(props.left) cls+= " left";
    if(props.right) cls+= " right";
    if(props.bottom) cls+= " bottom";
    if(props.top) cls+= " top";
    if(props.scroll) cls+= " scroll";
    return <div className={cls}>{props.children}</div>
};
const Panel = (props) => {
    let cls = 'panel';
    if(props.left) cls+= " left";
    if(props.right) cls+= " right";
    if(props.bottom) cls+= " bottom";
    if(props.top) cls+= " top";
    if(props.scroll) cls+= " scroll";
    return <div className={cls}>{props.children}</div>
};
const Spacer = (props) => {
    return <span className='spacer'/>
};

const Canvas3D = (props) => {
    console.log("drawing the canvas")
    return <div className=''>three dee canvas</div>
};


class App extends Component {
  render() {
    return (
        <GridLayout>
            <Toolbar left top>
                <h3>a really cool 3d editor</h3>
            </Toolbar>
            <Panel scroll left>
                <TreeTable root={data.root} provider={SM}/>
            </Panel>
            <Toolbar left bottom>
                <button className="fa fa-plus-circle"/>
                <button className="fa fa-minus-circle"/>
            </Toolbar>

            <Toolbar center top>
                <label>views</label>
                <button className="fa fa-camera"/>
                <button className="fa fa-object-group"/>
                <button className="fa fa-object-ungroup"/>
            </Toolbar>

            <Panel center middle scroll>
                <Canvas3D root={data.root}/>
            </Panel>

            <Toolbar center bottom>
                <button className="fa fa-caret-left" onClick={this.toggleLeftPane}/>
                <Spacer/>
                <label>saved or not</label>
                <Spacer/>
                <button className="fa fa-caret-right" onClick={this.toggleRightPane}/>
            </Toolbar>

            <Toolbar right top>
                <label>item</label>
                <label>name</label>
            </Toolbar>
            <Panel scroll right>
                <PropSheet provider={SM}/>
            </Panel>
            <Toolbar right bottom>
                <label>some random extra stuff here</label>
            </Toolbar>
        </GridLayout>
    );
  }
}

export default App;
