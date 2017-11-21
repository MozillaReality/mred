import React, { Component } from 'react';
import './App.css';



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
    return <div>some props {props.item.title}</div>
}

const TREE_ITEM_PROVIDER = {
    EXPANDED_CHANGED:'EXPANDED_CHANGED'
}
class TreeItemProvider {
    constructor(root) {
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
    getProperties() {

    }
}

const SM = new TreeItemProvider(data.root);

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


class TreeTableItem extends Component {
    onSelect = (e)=>{
        console.log("selected",this.props.node.title)
    }
    toggleItemCollapsed = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.props.provider.toggleItemCollapsed(this.props.node);
    }
    render() {
        return <li>
            {this.renderSelf(this.props.node)}
            {this.renderChildren(this.props.node)}
        </li>
    }
    renderSelf(node) {
        let cls = "tree-node";
        if(node === data.selected) {
            cls += " selected"
        }
        let arrow = "";
        const children = this.props.provider.getChildren(node);
        if(this.props.provider.hasChildren(node)) {
            const expanded = this.props.provider.isExpanded(node)
            if(expanded) {
                arrow = <button className="fa fa-caret-down borderless" onClick={this.toggleItemCollapsed}/>;
            } else {
                arrow = <button className="fa fa-caret-right borderless" onClick={this.toggleItemCollapsed}/>;
            }
        } else {
            arrow = <span className=""/>
        }
        return <div className={cls} onClick={this.onSelect}>
            {arrow}
            {this.props.provider.getRendererForItem(node)}
        </div>
    }
    renderChildren(node) {
        if(!this.props.provider.hasChildren(node)) return "";
        if(!this.props.provider.isExpanded(node)) return "";
        const children = this.props.provider.getChildren(node);
        return <ul>{children.map((ch,i)=>{
            return <TreeTableItem key={i} node={ch} provider={this.props.provider}/>
        })}</ul>
    }
}
class TreeTable extends Component {
    constructor(props) {
        super(props)
        this.state = {
            root:this.props.root
        }
    }
    componentDidMount() {
        console.log("adding listener");
        this.listener = SM.on(TREE_ITEM_PROVIDER.EXPANDED_CHANGED, (item)=>{
            console.log("item expanded");
            this.setState({root:SM.getSceneRoot()})
        })
    }
    componentWillUnmount() {
        SM.off(TREE_ITEM_PROVIDER.EXPANDED_CHANGED, this.listener);
    }
    render() {
        return <ul className='tree-table'><TreeTableItem node={this.state.root} provider={SM}/></ul>
    }
}

const Canvas3D = (props) => {
    console.log("drawing the canvas")
    return <div className=''>three dee canvas</div>
};

class PropSheet extends Component {
    render() {
        const props = this.calculateProps(this.props.selectedItem);
        return <ul className="prop-sheet">{props.map((prop, i) => {
            return <li key={i}><label>{prop.name}</label> <b>{prop.value}</b></li>
        })}
        </ul>
    }

    calculateProps(item) {
        return [
            {
                name:'The Title',
                key:'title',
                value:item.title,
            },
            {
                name:'Type',
                key:'type',
                value:item.type,
            }
        ]
    }
}

class App extends Component {
  render() {
    return (
        <GridLayout>
            <Toolbar left top>
                <h3>a really cool 3d editor</h3>
            </Toolbar>
            <Panel scroll left>
                <TreeTable root={data.root}/>
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
                <PropSheet selectedItem={data.selected}/>
            </Panel>
            <Toolbar right bottom>
                <label>some random extra stuff here</label>
            </Toolbar>
        </GridLayout>
    );
  }
}

export default App;
