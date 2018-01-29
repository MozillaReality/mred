import React, {Component} from 'react'
import './App.css'
import {PopupManager} from "appy-comps"
import PropSheet from './PropSheet'
import TreeTable from "./TreeTable"
import {TREE_ITEM_PROVIDER} from './TreeItemProvider'
import {PopupContainer, HBox, VBox, HToggleGroup} from "appy-comps"

import SVGEditor from "./SVGEditor"
import HypercardEditor from "./HypercardEditor"
import Hypercard3DEditor from "./Hypercard3DEditor"
import FamilyTree from "./familytree/FamilyTree"
import {toQueryString} from './utils'


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

class App extends Component {
    constructor(props) {
        super(props)
        this.providers = {}
        this.addProvider(new Hypercard3DEditor())
        this.addProvider(new HypercardEditor())
        this.addProvider(new SVGEditor())
        this.addProvider(new FamilyTree())
        this.state = {
            provider: this.providers.svg,
            providerName: 'svg',
            showLeft: true,
            showRight: true,
            selectedTool: this.providers.svg.getTools()[0]
        }
    }
    addProvider(prov) {
        this.providers[prov.getDocType()] = prov
    }

    previewStack = (e) => {
        this.state.provider.save().then(()=>{
            const query = toQueryString({
                mode:'preview',
                provider:this.state.providerName,
                doc:this.state.provider.getDocId()
            })
            window.open('./?'+query)
        })
    }
    saveDoc =(e) => this.state.provider.save()

    toggleLeftPane = (e) => this.setState({showLeft: !this.state.showLeft})
    toggleRightPane = (e) => this.setState({showRight: !this.state.showRight})

    propertyChanged = (prop) => {
        this.setState({root: this.state.provider.getSceneRoot()})
    }

    structureChanged = (prop) => {
        console.log("the structure changed");
        this.setState({root: this.state.provider.getSceneRoot()})
    }
    componentDidMount() {
        let prov = 'hypercard-3d'
        if(this.props.options.doctype) prov = this.props.options.doctype
        this.switchProvider(prov)
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
        this.setState({provider: provider, root: provider.getSceneRoot(), providerName: name})
        provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, this.propertyChanged)
        provider.on(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED, this.structureChanged)
        provider.loadDoc(this.props.options.doc)
    }


    renderProviderList() {
        return <HBox className="toolbar" style={{border:'1px solid #909090', borderWidth:"0 0 1px 0"}}>
            <img src="icon.png" height="20" style={{padding:'0.25em'}}/>
            <label>General Ed</label>

            {Object.keys(this.providers).map((name)=>{
            return <button key={name} onClick={()=>this.switchProvider(name)}>{name}</button>
        })}</HBox>
    }
    render() {
        return (
            <VBox fill>
                {this.renderProviderList()}
                <div style={{position: 'relative', flex: '1'}}>
                    <GridLayout showLeft={this.state.showLeft} showRight={this.state.showRight}>
                        <Toolbar left top>
                            <label>{this.state.provider.getTitle()}</label>
                        </Toolbar>
                        <Panel scroll left>
                            <TreeTable root={this.state.root} provider={this.state.provider}/>
                        </Panel>
                        <Toolbar left bottom>
                            {this.state.provider.getTreeActions().map((action,i)=> this.makeTreeAction(action,i))}
                        </Toolbar>

                        <Toolbar center top>
                            <label>views</label>
                            <button className="fa fa-play" onClick={this.previewStack}/>
                            <button className="fa fa-save" onClick={this.saveDoc}/>
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

    makeTreeAction(action, i) {
        let onclick = action.fun
        if(action.type === 'menu') {
            onclick = (e)=>PopupManager.show(<MenuPopup actions={action.actions}/>,e.target)
        }
        return <button key={i} onClick={onclick}><i  className={'fa fa-' + action.icon}/> {action.title}</button>
    }
}

export default App;

const ToggleTemplate = (props) => {
    let clss = "fa fa-"
    if(props.item.icon) clss += props.item.icon
    if(props.selected) clss += " selected"
    return <button className={clss} onClick={props.onSelect}>{props.item.title}</button>
}


const MenuPopup = (props) => {
    return <VBox>
        {props.actions.map((act,i)=>{
            return <button  key={i} onClick={()=>{
                PopupManager.hide();
                if(act.fun) act.fun()
            }}><i className={'fa fa-' + act.icon}/> {act.title}</button>
        })}
    </VBox>

}