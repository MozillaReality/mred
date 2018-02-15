import React, { Component } from 'react';
import selMan, {SELECTION_MANAGER} from "./SelectionManager";
import {TREE_ITEM_PROVIDER} from './TreeItemProvider';
import {PopupManager} from "appy-comps";
import {makePoint} from './utils'


const ContextMenu = (props) => {
    return <ul className="popup-menu">
        {props.menu.map((item,i)=>{
            return <li key={i} onClick={()=>{
                PopupManager.hide()
                item.fun()
            }}
            >{item.title}</li>
        })}
    </ul>
}

class TreeTableItem extends Component {
    onSelect = (e)=>  selMan.setSelection(this.props.node)
    onContextMenu = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if(this.props.provider.calculateContextMenu) {
            const menu = this.props.provider.calculateContextMenu()
            PopupManager.show(<ContextMenu menu={menu}/>,e.target)
        }
    }
    toggleItemCollapsed = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.props.provider.toggleItemCollapsed(this.props.node);
    }
    findTreeNodeAtElement(elem) {
        if(elem.getAttribute('data-nodeid')) return elem
        if(elem.parentElement) return this.findTreeNodeAtElement(elem.parentElement)
        return null;
    }
    startDrag = (e,item) => {
        e.preventDefault()
        e.stopPropagation()
        const l1 = (e) => {
            let target = this.findTreeNodeAtElement(e.target)
            if(target) {
                const node = this.props.provider.findNodeById(target.getAttribute("data-nodeid"))
                selMan.setDropTarget(node)
            }
        }
        const l2 = (e) => {
            window.document.removeEventListener('mousemove',l1)
            window.document.removeEventListener('mouseup',l2)
            if(!selMan.getDropTarget()) return console.log("no drop target")
            const prov = this.props.provider
            const snode =   item
            const tnode =   selMan.getDropTarget()
            const tparent = prov.findParent(prov.getSceneRoot(),tnode)
            prov.deleteChild(snode)
            prov.insertNodeBefore(tparent,tnode,snode)
            selMan.setDropTarget(null)
        }
        window.document.addEventListener('mousemove',l1)
        window.document.addEventListener('mouseup',l2)

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
        if(selMan.getDropTarget() === node)  cls += " drop-target"
        let arrow = "";
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
        let dragHandle = <button className="fa fa-bars drag-handle" onMouseDown={(e)=>this.startDrag(e,node)}/>
        return <div className={cls} onClick={this.onSelect} onContextMenu={this.onContextMenu}
                    data-nodeid={node.id}
        >
            {arrow}
            {this.props.provider.getRendererForItem(node)}
            {dragHandle}
        </div>
    }
    renderChildren(node) {
        if(!this.props.provider.hasChildren(node)) return "";
        if(!this.props.provider.isExpanded(node)) return "";
        const children = this.props.provider.getChildren(node);
        return <ul>{children.map((ch,i)=>{
            return <TreeTableItem key={i} node={ch}
                                  provider={this.props.provider}
                                  selection={this.props.selection}
            />
        })}</ul>
    }
}

export default class TreeTable extends Component {
    constructor(props) {
        super(props)
        this.state = {
            root:this.props.root,
            dropTarget:null,
            selection:null
        }
    }
    componentDidMount() {
        this.listener = this.props.provider.on(TREE_ITEM_PROVIDER.EXPANDED_CHANGED,
            (item)=>  this.setState({root:this.props.provider.getSceneRoot()}))
        this.other_listener = selMan.on(SELECTION_MANAGER.CHANGED, (sel)=> this.setState({selection:sel}))
        selMan.on(SELECTION_MANAGER.DROP_TARGET_CHANGED, (sel) => this.setState({dropTarget:selMan.getDropTarget()}))
    }
    componentWillUnmount() {
        this.props.provider.off(TREE_ITEM_PROVIDER.EXPANDED_CHANGED, this.listener)
        selMan.off(SELECTION_MANAGER.CHANGED,this.other_listener)
    }
    componentWillReceiveProps(newProps) {
        if(newProps.root) this.setState({root:newProps.root})
    }

    render() {
        if(!this.state.root) return <ul>no root yet</ul>
        return <ul className='tree-table'>
            <TreeTableItem node={this.state.root}
                           provider={this.props.provider}
                           selection={this.state.selection}
            />
        </ul>
    }
}

