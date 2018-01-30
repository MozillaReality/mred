import React, {Component} from 'react'
import TreeItemProvider, {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import SelectionManager, {SELECTION_MANAGER} from "../SelectionManager";

/*

sin produces sin wave based on frequency and time
    inputs
        frequency: 1/sec
        amplitude: 1
    outputs:
        value:

scale, scales the input value by another value
    inputs:
        value
        factor
    outputs:
        value

const, produces a constant value
    inputs:
        value:  (text editor for the input value, is numeric
    outputs: value

graph: graphs the input value over t from 0 to 2Pi



 */


const templates = {
    sin: {
        title:'sin',
        inputs: {
            frequency: {
                type:'number',
                default:1,
            },
            amplitude: {
                type:'number',
                default:1
            }
        },
        outputs: {
            value: {
                type:'number'
            }
        }
    },
    graph: {
        title:'graph',
        inputs: {
            value: {
                type:'number',
                default: 1
            }
        },
        outputs: {},
        view:'graphoutput'
    }

}

const example = {
    id:'root1',
    type:'root',
    children:[
        {
            type:'node',
            id:'node1',
            template:'sin',
            x:50,
            y:50,
            inputs: {
                frequency:8
            }
        },
        {
            type:'node',
            id:'node2',
            template:'graph',
            x:300,
            y:50,
            // connections:[
            //     {
            //         source:'node1',
            //         sourceProperty:'value',
            //         targetProperty:'value'
            //     }
            // ]
        }
    ]
}

export default class TextureEditor extends TreeItemProvider {
    constructor() {
        super()
        this.id_index = {}
        this.setDocument(example,'foo')
    }
    makeEmptyRoot() {
        return {
            id:this.genID('root'),
            type:'root',
            children:[]
        }
    }
    getDocType = () => "texture"
    getTitle = () => "Texture Editor"
    getCanvas = () => <TextureEditorCanvas provider={this}/>

    setDocument(doc,docid) {
        super.setDocument(doc, docid)
        this.id_index = {}
        this.root.children.forEach((ch) => {
            this.id_index[ch.id] = ch
        })
        console.log("doc changed");
    }

    getProperties(node) {
        // console.log("getting properties for node",node)
        const defs = []
        if(!node) return defs

        // ID
        defs.push({
            name:'ID',
            key:'id',
            value:node['id'],
            type:'string',
            locked:true,
        })
        defs.push({
            name:'x',
            key:'x',
            value:node.x,
            type:'number',
            locked:false
        })
        defs.push({
            name:'y',
            key:'y',
            value:node.y,
            type:'number',
            locked:false
        })

        //INPUTS
        if(node.type === 'node') {
            const template = this.getTemplate(node)
            if (!template) {
                console.log("coult not find template for node", node)
            }
            Object.keys(template.inputs).forEach((key) => {
                const t = template.inputs[key]
                defs.push({
                    name: key,
                    key: key,
                    value: t.default,
                    type: t.type
                })
            });
            Object.keys(template.outputs).forEach((key) => {
                const t = template.outputs[key]
                defs.push({
                    name: key,
                    key: key,
                    value: 0,
                    type: t.type
                })
            });
        }

        return defs
    }
    hasChildren(node) {
        return (node.children)
    }
    getTemplate(node) {
        return templates[node.template]
    }
    findNodeById(id) {
        return this.id_index[id]
    }
    getRendererForItem(node) {
        if(node.type === 'root') return <div>root</div>
        return <div>node: {this.getTemplate(node).title}</div>
    }
    setPropertyValue(item,def,value) {
        if(def.type === 'number') value = parseFloat(value);
        item[def.key] = value
        this.fire(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,item)
    }
    getChildren(node) {
        return node.children
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
    appendChild(parent,ch) {
        parent.children.push(ch)
        this.id_index[ch.id] = ch
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,parent);
    }
    deleteNode(child) {
        if(child.type === 'root') return;
        const index = this.root.children.indexOf(child)
        if(index<0) return console.log("not really the parent. invalid!")
        this.root.children.splice(index,1)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,child);
        SelectionManager.setSelection(this.root)
    }

    getTreeActions() {
        return [
            {
                title:'sin',
                icon:'plus',
                fun: () => {
                    this.appendChild(this.getSceneRoot(),this.makeSinNode())
                }
            },
            {
                title:'conn',
                icon:'plus',
                fun: () => {
                    this.makeConnectionNode()
                }
            },
            {
                icon:'close',
                fun: () => {
                    this.deleteNode(SelectionManager.getSelection())
                }
            },
        ]
    }
    makeSinNode() {
        return {
            type: 'node',
            id: this.genID('node'),
            template: 'sin',
            x: 50,
            y: 50,
            inputs: {
                frequency: 8,
                amplitude:3,
            }
        }
    }
    makeConnectionNode() {
        const scene = this.root
        if(!scene.connections) scene.connections = []
        const ch = scene.children[0]
        const tg = scene.children[1]
        const conn = {
            from: ch.id,
            to: tg.id,
            fromProp: 'value',
            toProp: 'value',
        }
        console.log('connection',conn)
        scene.connections.push(conn)
        this.fire(TREE_ITEM_PROVIDER.STRUCTURE_CHANGED,this.root);
    }
    isConnected() {
        return false
    }
}

class TextureEditorCanvas extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selection:null
        }
    }
    componentDidMount() {
        this.sel_listener = SelectionManager.on(SELECTION_MANAGER.CHANGED, (sel)=> {
            this.setState({selection:sel})
        })
    }
    render() {
        const scene = this.props.provider.getSceneRoot()
        if(!scene) return <div>empty</div>
        const style = {
            width:'800px',
            height:'900px'
        }
        return <div className="node-canvas">
            {/*{this.renderConnections(scene)}*/}
            {/*{scene.children.map((ch,i)=> this.renderNode(ch,i))}*/}
            <svg style={style}>
                {this.renderChildren(scene)}
                {this.renderConnections()}
            </svg>
        </div>
    }

    clickCircle = (e)=>{
        console.log("clicked on",e.target)
    }
    startMovingBG = (e,node) => {
        e.stopPropagation()
        e.preventDefault()
        const l = (e) => {
            const defs = this.props.provider.getProperties(node)
            const xdef = defs.find((def)=>def.key === 'x')
            const ydef = defs.find((def)=>def.key === 'y')
            this.props.provider.setPropertyValue(node,xdef,e.layerX)
            this.props.provider.setPropertyValue(node,ydef,e.layerY)
        }
        let l2 = () => {
            window.removeEventListener('mousemove',l)
            window.removeEventListener('mouseup',l2)
        }
        window.addEventListener('mousemove',l)
        window.addEventListener('mouseup',l2)
    }

    renderChildren(scene) {
        return <g>{scene.children.map((ch,i)=>{
            // console.log('drawing child',ch)
            const temp = this.props.provider.getTemplate(ch)
            // console.log("inputs",temp.inputs)
            const ins = Object.keys(temp.inputs).map((key,i)=>{
                return <g key={key} transform={`translate(0,${i*25})`}>
                    <circle cx="0" cy="-5" r="5" fill="white" stroke="black" strokeWidth="2" onClick={this.clickCircle}/>
                    <text x={10} y={0} textAnchor="start">input</text>
                </g>
            })
            const outs = Object.keys(temp.outputs).map((key,i)=>{
                return <g key={key} transform={`translate(0,${i*25})`}>
                    <circle cx="0" cy="-5" r="5" fill="white" stroke="black" strokeWidth="2" onClick={this.clickCircle}/>
                    <text x={-10} y={0} textAnchor="end">output</text>
                </g>
            })
            return <g key={i} transform={`translate(${ch.x},${ch.y})`}>
                <rect x={0} y={0} width={150} height={100} fill="red" onMouseDown={(e)=>this.startMovingBG(e,ch)}/>
                <rect x={0} y={0} width={150} height={20} fill="blue"/>
                <text x={5} y={15} content="foo" fill="white">some title</text>
                <g transform="translate(10,40)">{ins}</g>
                <g transform="translate(140,40)">{outs}</g>
            </g>
        })}</g>
    }
    renderConnections() {
        return ""
    }
    renderNode(node,i) {
        const template = this.props.provider.getTemplate(node)
        // console.log(node,template)
        const style = {
            left:`${node.x}px`,
            top:`${node.y}px`,
            width:'200px'
        }
        return <div key={i} className="node-wrapper"
                    style={style}
        >
            <div className="title">{template.title}</div>

            <ul className="inputs">
                {Object.keys(template.inputs).map((key)=>{
                    const inp = template.inputs[key]
                    return <li key={key}><i className="fa fa-circle-o"></i> {key}</li>
                })}
            </ul>
            <ul className="outputs">
                {Object.keys(template.outputs).map((key)=>{
                    const oup = template.outputs[key]
                    let icon = <i className="fa fa-circle-o"></i>
                    if(this.props.provider.isConnected(node,key,oup)) {
                        console.log("output",key,'is connected')
                        icon = <i className="fa fa-circle connected"></i>
                    }
                    return <li key={key}>{key} {icon}</li>
                })}
            </ul>

        </div>
    }
    /*
    isConnected(node,key,def) {
        if(!node.connections) return false
        if(node.connections.length <= 0) return false;
        console.log("checking",node.connections,'to',key)
        if(node.connections.some(conn=>conn.srcProp===key)) {
            console.log("real connection")
            return true
        }
        // node.connections.includes((c)=>c.tgtProp == oup)
        return false
    }
    */

    /*
    renderConnections(scene) {
        const outs = []
        scene.children.forEach((ch)=>{
            if(!ch.connections) return
            ch.connections.forEach((conn,i)=>{
                const src = ch;
                const tgt = this.props.provider.findNodeById(conn.target)
                if(!tgt) {
                    return console.log("coulnt find hte target for connection",conn)
                }
                const w = 200
                const style = {
                    left:(src.x+w-15)+"px",
                    top: (src.y+25)+"px",
                    position:'absolute',
                    width:(Math.abs(tgt.x-src.x)+w-20)+'px',
                    height:Math.abs(tgt.y-src.y)+50+'px',
                    border:'1px solid red'
                }
                const dx = -200+(tgt.x-src.x+15+15)
                const dy = 0+(tgt.y-src.y-25+25+10)
                outs.push(<svg key={i} id="svg-foo"  xmlns="http://www.w3.org/2000/svg" style={style}>
                    <path d={`M 5 5 L ${dx} ${dy}`} stroke="black" strokeWidth="5"></path>
                </svg>)
            })
        })
        return outs
    }
    */
}