import React, { Component } from 'react';
import './App.css';
import PropSheet from './PropSheet'
import TreeTable from "./TreeTable";
import TreeItemProvider, {TREE_ITEM_PROVIDER} from './TreeItemProvider';
import selMan from "./SelectionManager";
import {PopupContainer} from "appy-comps";

const data = {
    root: {
        title:'root',
        type:'scene',
        children:[
            {
                type:'rect',
                title:'rect1',
                x:20,
                y:30,
                w:40,
                h:40,
                color:'red',
                visible:true,
                children:[]
            },
            {
                type:'group',
                title:'some group',
                tx:100,
                ty:50,
                visible:true,
                children:[
                    {
                        type:'rect',
                        title:'rect2',
                        x:0,
                        y:0,
                        w:50,
                        h:50,
                        color:'yellow',
                        visible:true,
                    },
                    {
                        type:'rect',
                        title:'rect2',
                        x:20,
                        y:20,
                        w:50,
                        h:50,
                        color:'yellow',
                        visible:true,
                    },

                ]
            },
            {
                type:'circle',
                title:'next circle',
                cx:100,
                cy:300,
                r:40,
                color:'blue',
                visible:true,
            }
        ]
    },
};

const SceneItemRenderer = (props) => {
    const type = props.item.type;
    if(type === 'rect')   return <div><i className="fa fa-square"/> {props.item.title}</div>
    if(type === 'circle') return <div><i className="fa fa-circle"/> {props.item.title}</div>
    if(type === 'scene')  return <div><i className="fa fa-diamond"/> {props.item.title}</div>
    if(type === 'group')  return <div><i className="fa fa-object-group"/> {props.item.title}</div>
    return <div>unknown item type</div>
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

    appendChild(parent,child) {
        parent.children.push(child);
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,child);
    }

    toggleItemCollapsed(item) {
        const current = this.isExpanded(item);
        this.expanded_map[item.id] = !current;
        this.fire(TREE_ITEM_PROVIDER.EXPANDED_CHANGED,item);
    }
    getProperties(item) {
        var defs = [];
        if(!item) return defs;
        Object.keys(item).forEach((key)=>{
            if(key === 'children') return;
            let type = 'string';
            let locked = false;
            if(key === 'visible') type = 'boolean';
            if(key === 'type') locked = true;
            if(key === 'id') locked = true;
            if(key === 'x') type = 'number';
            if(key === 'color') type = 'color'
            defs.push({
                name:key,
                key:key,
                value:item[key],
                type:type,
                locked:locked,
            })
        })
        return defs;
    }
    setPropertyValue(item,def,value) {
        if(def.type === 'number') value = parseFloat(value);
        item[def.key] = value;
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,item)
    }
    createRect() {
        return {
            type:'rect',
                title:'rect1',
            x:20,
            y:30,
            w:40,
            h:40,
            color:'red',
            visible:true,
            children:[]
        }
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

class CanvasSVG extends Component {
    constructor(props) {
        super(props);
        this.state = {
            root:null
        }
    }
    componentDidMount() {
        this.listener = SM.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, (prop) => this.setState({root:SM.getSceneRoot()}))
        this.listener = SM.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, (prop) => this.setState({root:SM.getSceneRoot()}))
        this.setState({root:SM.getSceneRoot()})
    }

    render() {
        return <div>{this.drawSVG(this.state.root, 0)}</div>
    }
    drawSVG(item,key) {
        if(!item) return "";
        const type = item.type;
        if (type === 'scene')  return this.drawSVGRoot(item,key);
        if (type === 'rect')   return this.drawRect(item,key)
        if (type === 'circle') return this.drawCircle(item,key)
        if (type === 'group')  return this.drawGroup(item,key);
    }
    drawChildren(item) {
        return item.children.map((it, i) => this.drawSVG(it, i));
    }
    drawRect(item,key) {
        const vis = item.visible?'visible':'hidden';
        return <rect key={key} x={item.x} y={item.y} width={item.w} height={item.h} fill={item.color} visibility={vis}/>
    }
    drawCircle(item,key) {
        const vis = item.visible?'visible':'hidden';
        return <circle cx={item.cx} cy={item.cy} r={item.r} fill={item.color} key={key} visibility={vis}/>
    }

    drawGroup(item, key) {
        const vis = item.visible?'visible':'hidden';
        return <g key={key} transform={`translate(${item.tx},${item.ty})`} visibility={vis}>{this.drawChildren(item)}</g>
    }

    drawSVGRoot(item, key) {
        return <svg key={key} viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">{this.drawChildren(item)}</svg>
    }
}

class App extends Component {
    constructor(props) {
        super(props)
        this.state = {
            root: SM.getSceneRoot()
        }
    }
    insertRect = (e) => {
        let rect = SM.createRect();
        let node = selMan.getSelection()
        if(SM.hasChildren(node)) {
            SM.appendChild(node,rect);
        }
    }
    componentDidMount() {
        this.listener = SM.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, (prop) => this.setState({root:SM.getSceneRoot()}))
        this.listener = SM.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, (prop) => this.setState({root:SM.getSceneRoot()}))
        this.setState({root:SM.getSceneRoot()})
    }

  render() {
    return (
        <GridLayout>
            <Toolbar left top>
                <h3>a really cool 3d editor</h3>
            </Toolbar>
            <Panel scroll left>
                <TreeTable root={this.state.root} provider={SM}/>
            </Panel>
            <Toolbar left bottom>
                <button className="fa fa-plus-circle" onClick={this.insertRect}/>
                <button className="fa fa-minus-circle"/>
            </Toolbar>

            <Toolbar center top>
                <label>views</label>
                <button className="fa fa-camera"/>
                <button className="fa fa-object-group"/>
                <button className="fa fa-object-ungroup"/>
            </Toolbar>

            <Panel center middle scroll>
                <CanvasSVG/>
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
            <PopupContainer/>
        </GridLayout>
    );
  }
}

export default App;
