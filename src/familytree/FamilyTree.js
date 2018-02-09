import React, {Component} from 'react'
import dagre from 'dagre'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {genID} from '../utils'
import SelectionManager from "../SelectionManager";
import GridEditorApp from '../GridEditorApp'
import FamilyTreeApp from './FamilyTreeApp'

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
    getApp() {
        return <FamilyTreeApp provider={this}/>
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
    getSceneRoot = () => this.root
    getDocType =() => "familytree"
    getTitle = () => "Family Tree Editor"
    getCanvas = () => <FamilyTreeCanvas provider={this}/>
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
    if(props.value && props.provider) value = props.provider.findPersonById(props.value).name
    return <b>{value}</b>
}

class FamilyTreeCanvas extends Component {
    render() {
        const g = new dagre.graphlib.Graph()
        g.setGraph({})
        g.setDefaultEdgeLabel(function() { return {}})

        const people = this.props.provider.getSceneRoot().children
        people.forEach((per)=>{
            g.setNode(per.id, {label:per.name, width:100, height:50})
        })

        people.forEach((person)=>{
            person.parents.forEach((parentId)=>{
                g.setEdge(person.id,parentId)
            })
        })
        dagre.layout(g)
        const rects = g.nodes().map((key,i)=>{
            const n = g.node(key)
            return <g key={i} transform={`translate(${n.x},${n.y})`}>
                <rect x={-n.width/2} y={-n.height/2} width={n.width} height={n.height} fill="white" strokeWidth="1" stroke="black"/>
                <text textAnchor="middle">{n.label}</text>
            </g>
        })

        const lines = g.edges().map((key,i)=> {
            const edge = g.edge(key)
            let d = ""
            edge.points.forEach((pt,i)=>{
                d += (i===0)? "M ":" L "
                d += pt.x + " " + pt.y
            })
            return <path key={i} d={d} strokeWidth="3" stroke="black" fill="transparent" strokeLinecap="round" strokeLinejoin="round"/>
        })

        return <svg viewBox="0 0 1024 768" xmlns="http://www.w3.org/2000/svg">{lines}{rects}</svg>
    }
}