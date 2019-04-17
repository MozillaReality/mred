import React, {Component} from "react";
import {HBox, PopupManager, VBox} from "appy-comps";

const EnumPicker = (props) => {
    const Rend = props.renderer
    const items = props.values.map(val=>
        <HBox
            key={val}
            onClick={(e)=>props.onSelect(val)}>
            <Rend value={val} def={props.def} obj={props.obj} provider={props.provider}/>
        </HBox>
    )
    return <VBox className="popup-menu">{items}</VBox>
}

const DefaultEnumRenderer = (props) => {
    let value = ""
    if(typeof props.value !== 'undefined' && props.value !== null) {
        value = props.value.toString()
    }
    return <span>{value}</span>
}

export class EnumEditor extends Component {
    calculateRenderer() {
        const proxy = this.props.def
        const obj = this.props.obj
        if (!this.props.provider.getRendererForEnum) return DefaultEnumRenderer
        const renderer = this.props.provider.getRendererForEnum(proxy.getKey(), obj)
        if (!renderer) return DefaultEnumRenderer
        return renderer
    }

    calculateValues() {
        const vals = this.props.provider.getValuesForEnum(this.props.def.getKey(), this.props.obj, this.props.def)
        if (!vals) {
            console.log(`no values for enum ${this.props.def.getKey()}`);
            return []
        }
        return vals
    }

    open = (e) => {
        PopupManager.show(<EnumPicker
            values={this.calculateValues()}
            renderer={this.calculateRenderer()}
            onSelect={this.selectValue}
            provider={this.props.provider}
        />, e.target)
    }
    selectValue = (value) => {
        PopupManager.hide()
        this.props.onChange(value)
    }
    renderValue = (value) => {
        const def = this.props.def
        const obj = this.props.obj
        const Rend = this.calculateRenderer()
        return <Rend value={value} def={def} obj={obj} provider={this.props.provider}/>
    }

    render() {
        return <button onClick={this.open}>{this.renderValue(this.props.value)}</button>
    }
}