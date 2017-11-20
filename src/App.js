import React, { Component } from 'react';
import './App.css';

const data = {
    root: {
        title:'root',
        children:[
            {
                title:'camera',
                children:[]
            },
            {
                title:'group',
                children:[
                    {
                        title:'sphere1',
                        children:[]
                    },
                    {
                        title:'sphere2',
                        children:[]
                    }
                ]
            },
            {
                title:'cube',
                children:[]
            }
        ]
    },
};
data.selected = data.root.children[1];


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
        if(node.children && node.children.length >= 1) {
            arrow = <button className="fa fa-caret-down"/>;
        } else {
            arrow = <span className=""/>
        }
        return <div className={cls} onClick={this.onSelect}>{arrow}{node.title}</div>
    }
    renderChildren(node) {
        if(!node.children || node.children.length < 1) return "";
        return <ul>{node.children.map((ch,i)=>{
            return <TreeTableItem key={i} node={ch}/>
        })}</ul>
    }
}
class TreeTable extends Component {
    render() {
        console.log("root", this.props.root);
        return <ul className='tree-table'><TreeTableItem node={this.props.root}/></ul>
    }
}

const Canvas3D = (props) => {
    return <div className=''>three dee canvas</div>
};
const PropSheet = (props) => {
    return <div className=''>this is a props sheet</div>
};


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
