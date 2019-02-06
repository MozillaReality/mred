import React, {Component} from "react";
import {VBox} from "appy-comps";
import {EnumEditor} from "./EnumEditor";

const DefaultEnumRenderer = (props) => {
    let value = ""
    if(typeof props.value !== 'undefined') {
        value = props.value.toString()
    }
    return <span>{value}</span>
}

export class ArrayEditor extends Component {
    constructor(props) {
        super(props)
        this.state = {
            showEditor: false,
            value: ""
        }

    }

    calculateRenderer() {
        const def = this.props.def
        const obj = this.props.obj
        if (!this.props.provider.getRendererForEnum) return DefaultEnumRenderer
        const renderer = this.props.provider.getRendererForEnum(def.key, obj)
        if (!renderer) return DefaultEnumRenderer
        return renderer
    }

    addValue = () => {
        this.setState({showEditor: true})
    }
    enumChanged = (value) => {
        const arr = this.props.value.slice();
        arr.push(value)
        this.props.onChange(arr)
    }

    render() {
        // const def = this.props.def
        // const obj = this.props.obj
        let value = this.props.value
        if (!value) value = []
        return <div>
            {this.renderValues()}
            <button onClick={this.addValue} className="fa fa-plus"/>
            {this.renderEditor()}
        </div>
    }

    deleteItem(val) {
        let arr = this.props.value.slice()
        arr = arr.filter((v) => v !== val)
        this.props.onChange(arr)
    }

    renderValues() {
        const Renderer = this.calculateRenderer()
        return <VBox>{this.props.value.map((val, i) => {
            return <div key={i}>
                <button className="fa fa-minus" onClick={() => this.deleteItem(val)}/>
                <Renderer value={val} provider={this.props.provider}/>
            </div>
        })}</VBox>
    }

    renderEditor() {
        if (!this.state.showEditor) return ""
        const def = this.props.def
        const obj = this.props.obj
        return <EnumEditor value={this.state.value}
                           onChange={this.enumChanged}
                           def={def}
                           obj={obj}
                           provider={this.props.provider}/>

    }
}
