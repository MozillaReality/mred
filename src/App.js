import React, { Component } from 'react';
import './App.css';
import PropSheet from './PropSheet'
import TreeTable from "./TreeTable";
import TreeItemProvider, {TREE_ITEM_PROVIDER} from './TreeItemProvider';
import selMan from "./SelectionManager";
import {PopupContainer} from "appy-comps";
// import {} from "./SVGEditor";
import HypercardEditor from "./HypercardEditor";

// const provider = new SceneTreeItemProvider();
const provider = new HypercardEditor()

const GridLayout = (props) => {
    let clss = "grid fill";
    if(!props.showLeft) clss += ' hide-left';
    if(!props.showRight) clss += ' hide-right';
    return <div className={clss}>{props.children}</div>
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

class App extends Component {
    constructor(props) {
        super(props)
        this.state = {
            root: provider.getSceneRoot(),
            showLeft:true,
            showRight:true,
        }
    }

/*    insertRect = (e) => {
        let rect = provider.createRect();
        let node = selMan.getSelection()
        if(provider.hasChildren(node)) {
            provider.appendChild(node,rect);
        }
    }*/

    appendStack = (e) => {
        console.log("appending");
    }

    appendRect = (e) => {
        console.log("appending");
    }
    appendText = (e) => {
        console.log("appending");
    }

    toggleLeftPane = (e) =>  this.setState({showLeft:!this.state.showLeft})
    toggleRightPane = (e) => this.setState({showRight:!this.state.showRight})

    componentDidMount() {
        this.listener = provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, (prop) => this.setState({root:provider.getSceneRoot()}))
        this.listener = provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, (prop) => this.setState({root:provider.getSceneRoot()}))
        this.setState({root:provider.getSceneRoot()})
    }

    render() {
    return (
        <GridLayout showLeft={this.state.showLeft} showRight={this.state.showRight}>
            <Toolbar left top>
                <h3>a really cool 3d editor</h3>
            </Toolbar>
            <Panel scroll left>
                <TreeTable root={this.state.root} provider={provider}/>
            </Panel>
            <Toolbar left bottom>
                <button className="fa fa-plus-circle" onClick={this.appendStack}/>
                <button className="fa fa-plus-circle" onClick={this.appendRect}/>
                <button className="fa fa-plus-circle" onClick={this.appendText}/>
                <button className="fa fa-minus-circle"/>
            </Toolbar>

            <Toolbar center top>
                <label>views</label>
                {/*<button className="fa fa-camera"/>*/}
                {/*<button className="fa fa-object-group"/>*/}
                {/*<button className="fa fa-object-ungroup"/>*/}
            </Toolbar>

            <Panel center middle scroll>{provider.getCanvas()}</Panel>

            <Toolbar center bottom>
                <button className={'fa' + (this.state.showLeft?' fa-caret-left':' fa-caret-right')} onClick={this.toggleLeftPane}/>
                <Spacer/>
                <label>saved or not</label>
                <Spacer/>
                <button className={'fa' + (this.state.showRight?' fa-caret-right':' fa-caret-left')} onClick={this.toggleRightPane}/>
            </Toolbar>

            <Toolbar right top>
                <label>item</label>
                <label>name</label>
            </Toolbar>
            <Panel scroll right>
                <PropSheet provider={provider}/>
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
