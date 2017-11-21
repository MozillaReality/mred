import React, { Component } from 'react';
import SMM, {SELECTION_MANAGER} from "./SelectionManager";
import {TREE_ITEM_PROVIDER} from './TreeItemProvider';



class TreeTableItem extends Component {
    onSelect = (e)=>  SMM.setSelection(this.props.node)
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
        if(this.props.selection && this.props.selection.isSelected(node)) {
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
            return <TreeTableItem key={i} node={ch} provider={this.props.provider} selection={this.props.selection}/>
        })}</ul>
    }
}

export default class TreeTable extends Component {
    constructor(props) {
        super(props)
        this.state = {
            root:this.props.root,
            selection:null
        }
    }
    componentDidMount() {
        this.listener = this.props.provider.on(TREE_ITEM_PROVIDER.EXPANDED_CHANGED,
            (item)=>  this.setState({root:this.props.provider.getSceneRoot()}))
        this.other_listener = SMM.on(SELECTION_MANAGER.CHANGED, (sel)=> this.setState({selection:sel}))
    }
    componentWillUnmount() {
        this.props.provider.off(TREE_ITEM_PROVIDER.EXPANDED_CHANGED, this.listener)
        SMM.off(SELECTION_MANAGER.CHANGED,this.other_listener)
    }
    render() {
        return <ul className='tree-table'>
            <TreeTableItem node={this.state.root} provider={this.props.provider} selection={this.state.selection}/>
        </ul>
    }
}

