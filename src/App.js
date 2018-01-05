import React, {Component} from 'react'
import './App.css'
import PropSheet from './PropSheet'
import TreeTable from "./TreeTable"
import {TREE_ITEM_PROVIDER} from './TreeItemProvider'
import {PopupContainer, HBox, VBox, HToggleGroup} from "appy-comps"
import SelectionManager from "./SelectionManager"

import SVGEditor from "./SVGEditor"
import HypercardEditor from "./HypercardEditor"
import Hypercard3DEditor from "./Hypercard3DEditor"


const GridLayout = (props) => {
    let clss = "grid fill";
    if (!props.showLeft) clss += ' hide-left';
    if (!props.showRight) clss += ' hide-right';
    return <div className={clss}>{props.children}</div>
};
const Toolbar = (props) => {
    let cls = "toolbar";
    if (props.left) cls += " left";
    if (props.right) cls += " right";
    if (props.bottom) cls += " bottom";
    if (props.top) cls += " top";
    if (props.scroll) cls += " scroll";
    return <div className={cls}>{props.children}</div>
};
const Panel = (props) => {
    let cls = 'panel';
    if (props.left) cls += " left";
    if (props.right) cls += " right";
    if (props.bottom) cls += " bottom";
    if (props.top) cls += " top";
    if (props.scroll) cls += " scroll";
    return <div className={cls}>{props.children}</div>
};
const Spacer = (props) => {
    return <span className='spacer'/>
};

function genID(prefix) {
    return `${prefix}_${Math.floor(Math.random() * 10000)}`
}


class App extends Component {
    constructor(props) {
        super(props)
        this.providers = {
            hypercard2D: new HypercardEditor(),
            hypercard3D: new Hypercard3DEditor(),
            svg: new SVGEditor()
        }
        this.state = {
            provider: this.providers.svg,
            showLeft: true,
            showRight: true,
            selectedTool: this.providers.svg.getTools()[0]
        }
    }

    /*    insertRect = (e) => {
            let rect = provider.createRect();
            let node = selMan.getSelection()
            if(provider.hasChildren(node)) {
                provider.appendChild(node,rect);
            }
        }*/

    appendCard = (e) => {
        // let node = SelectionManager.getSelection()
        const root = this.state.provider.getSceneRoot();
        const card = {
            id: genID('card'),
            type: 'card',
            title: 'untitled card',
            children: []
        }
        this.state.provider.appendChild(root, card)
    }

    appendRect = (e) => {
        let parent = SelectionManager.getSelection()
        if (parent.type !== 'card') {
            parent = this.state.provider.getParent(parent)
        }
        const rect = {
            id: genID('rect'),
            type: 'rect',
            x: 30,
            y: 30,
            w: 100,
            h: 100,
            title: 'unnamed rect',
            color: 'red'
        }
        this.state.provider.appendChild(parent, rect)
    }
    appendText = (e) => {
        let parent = SelectionManager.getSelection()
        if (parent.type !== 'card') {
            parent = this.state.provider.getParent(parent)
        }
        const text = {
            id: genID('text'),
            type: 'text',
            x: 30,
            y: 30,
            w: 100,
            h: 100,
            title: 'unnamed text',
            text: 'some new text',
            color: 'black'
        }
        this.state.provider.appendChild(parent, text)
    }

    deleteSelection = (e) => {
        let item = SelectionManager.getSelection()
        let parent = this.state.provider.getParent(item)
        this.state.provider.removeChild(parent, item)
    }

    previewStack = (e) => {
        console.log("previewing")
    }

    toggleLeftPane = (e) => this.setState({showLeft: !this.state.showLeft})
    toggleRightPane = (e) => this.setState({showRight: !this.state.showRight})

    propertyChanged = (prop) => {
        this.setState({root: this.state.provider.getSceneRoot()})
    }

    structureChanged = (prop) => {
        this.setState({root: this.state.provider.getSceneRoot()})
    }
    componentDidMount() {
        this.switchProvider('svg')
    }

    switchProvider(name) {
        let provider = this.state.provider
        if(provider) {
            provider.off(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, this.propertyChanged)
            provider.off(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
        }
        console.log("switching to provider",name)
        provider = this.providers[name]
        if(!provider) {
            console.log('couldnt find the provider for ',name)
            return
        }
        this.setState({provider: provider, root: provider.getSceneRoot()})
        provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, this.propertyChanged)
        provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
    }


    render() {
        return (
            <VBox fill>
                <HBox>
                    <button onClick={()=>this.switchProvider('svg')}>SVG editor</button>
                    <button onClick={()=>this.switchProvider('hypercard2D')}>2D hypercard editor</button>
                    <button onClick={()=>this.switchProvider('hypercard3D')}>3D hypercard editor</button>
                </HBox>
                <div style={{position: 'relative', flex: '1'}}>
                    <GridLayout showLeft={this.state.showLeft} showRight={this.state.showRight}>
                        <Toolbar left top>
                            <label>{this.state.provider.getTitle()}</label>
                        </Toolbar>
                        <Panel scroll left>
                            <TreeTable root={this.state.root} provider={this.state.provider}/>
                        </Panel>
                        <Toolbar left bottom>
                            {this.state.provider.getTreeActions().map((action,i)=>{
                                return <button key={i} className={"fa fa-"+action.icon} onClick={action.fun}>{action.title}</button>
                            })}
                            {/*<button className="fa fa-plus-circle" onClick={this.appendCard}>card</button>*/}
                            {/*<button className="fa fa-plus-circle" onClick={this.appendRect}>rect</button>*/}
                            {/*<button className="fa fa-plus-circle" onClick={this.appendText}>text</button>*/}
                            {/*<button className="fa fa-minus-circle" onClick={this.deleteSelection}>item</button>*/}
                        </Toolbar>

                        <Toolbar center top>
                            <label>views</label>
                            <button className="fa fa-play" onClick={this.previewStack}/>
                        </Toolbar>

                        <Panel center middle scroll>{this.state.provider.getCanvas()}</Panel>

                        <Toolbar center bottom>
                            <button className={'fa' + (this.state.showLeft ? ' fa-caret-left' : ' fa-caret-right')}
                                    onClick={this.toggleLeftPane}/>
                            <Spacer/>
                            <HToggleGroup list={this.state.provider.getTools()}
                                          template={ToggleTemplate}
                                          selected={this.state.selectedTool}
                                          onChange={(tool)=> {
                                              this.setState({selectedTool:tool})
                                          }}
                            />
                            <Spacer/>
                            <button className={'fa' + (this.state.showRight ? ' fa-caret-right' : ' fa-caret-left')}
                                    onClick={this.toggleRightPane}/>
                        </Toolbar>

                        <Toolbar right top>
                            <label>item</label>
                            <label>name</label>
                        </Toolbar>
                        <Panel scroll right>
                            <PropSheet provider={this.state.provider}/>
                        </Panel>
                        <Toolbar right bottom>
                            <label>some random extra stuff here</label>
                        </Toolbar>
                        <PopupContainer/>
                    </GridLayout>
                </div>
            </VBox>
        );
    }
}

export default App;

const ToggleTemplate = (props) => {
    let clss = "fa fa-"
    if(props.item.icon) clss += props.item.icon
    if(props.selected) clss += " selected"
    return <button className={clss} onClick={props.onSelect}>{props.item.title}</button>
}
