import React, {Component} from 'react'
import {} from 'dagre-d3'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {genID} from '../utils'
import SelectionManager from "../SelectionManager";

const example = {
    type:'root',
    title:'my family tree',
    children:[
        {
            type:'person',
            id:genID('person'),
            name:'Bob',
            parents:['bobsr_id']
        },
        {
            type:"person",
            id:genID('person'),
            name:'Bob Sr',
            parents:[]
        }
    ]
}
export default class FamilyTree extends TreeItemProvider {
    constructor() {
        super()
        this.root = {
            type:'root',
            title:'my family tree',
            children:[
                this.makePerson('bob')
            ]
        }
    }
    makeEmptyRoot() {
        return {
            id:genID('root'),
            type:'root',
            title:'my family tree',
            children:[
                this.makePerson('bob')
            ]
        }
    }
    getSceneRoot() {
        return this.root
    }
    getDocType =() => "familytree"
    getTitle = () => "Family Tree Editor"
    getCanvas = () => <div>empty family tree canvas</div>
    hasChildren = (nd) => nd.children?true:false
    getChildren = (nd) => nd.children
    getRendererForItem = (nd) => {
        if (nd.type === 'root') return <div>{nd.title}</div>
        return <div><i className="fa fa-male"></i> {nd.name}</div>
    }

    getProperties = (nd) => {
        if(!nd) return []
        if(nd.type === 'root') return [
            {
                name:'The Title',
                key:'title',
                type:'string',
                value: nd.title,
                locked:false
            }
        ]
        if(nd.type === 'person') {
            return [
                {
                    name:'Name',
                    key:'name',
                    type:'string',
                    value: nd.name,
                    locked:false,
                },
                {
                    name:'Parents',
                    key:'parents',
                    type:'array',
                    value: nd.parents,
                    locked:false,
                    valueDef: {
                        type:'enum',
                    }
                }
            ]
        }
        console.log("getting properties for node",nd);
        return []
    }

    getValuesForEnum(key,obj) {
        if(key === 'parents') return this.root.children.map((ch)=>ch.id)
    }
    getRendererForEnum(key,obj) {
        if(key === 'parents') return IdToNameRenderer;
    }

    generateSelectionPath(node) {
        if(!node) return []
        if(node.type === 'root') return [this.root.id]
        return [this.root.id,node.id]
    }
    findNodeFromSelectionPath(node,path) {
        if(path.length === 1) return node
        return node.children.find((ch)=>ch.id === path[1])
    }

    setPropertyValue(item,def,value) {
        item[def.key] = value
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED, item)
    }

    addPerson(per) {
        this.root.children.push(per)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,per);
        SelectionManager.setSelection(per)
    }

    findPersonById = (id) => this.root.children.find((per)=>per.id === id)

    makePerson(name) {
        return {
            type:'person',
            id:genID('person'),
            name:name,
            parents:[]
        }
    }

    getTreeActions() {
        return [
            {
                icon:'plus',
                title:'person',
                fun: () => this.addPerson(this.makePerson('unnamed'))
            }
        ]
    }
}

const IdToNameRenderer = (props) => {
    let value = "---"
    if(props.value && props.provider) {
        const node = props.provider.findPersonById(props.value)
        value = node.name
    }
    return <b>{value}</b>
}