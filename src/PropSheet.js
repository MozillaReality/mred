import React, { Component } from 'react';
import {HBox, PopupManager, VBox} from 'appy-comps'

import selMan, {SELECTION_MANAGER} from "./SelectionManager";

const COLORS2 = {
    "black": 0x000000,
    "valhalla": 0x222034,
    "loulou": 0x45283c,
    "oiled-cedar": 0x663931,
    "rope": 0x8f563b,
    "tahiti-gold": 0xdf7126,
    "twine": 0xd9a066,
    "pancho": 0xeec39a,
    "golden-fizz": 0xfbf236,
    "atlantis": 0x99e550,
    "christi": 0x6abe30,
    "elf-green": 0x37946e,
    "dell": 0x4b692f,
    "verdigris": 0x524b24,
    "opal": 0x323c39,
    "deep-koamaru": 0x3f3f74,
    "venice-blue": 0x306082,
    "royal-blue": 0x5b6ee1,
    "cornflower": 0x639bff,
    "viking": 0x5fcde4,
    "light-steel-blue": 0xcbdbfc,
    "white": 0xffffff,
    "heather": 0x9badb7,
    "topaz": 0x847e87,
    "dim-gray": 0x696a6a,
    "smokey-ash": 0x595652,
    "clairvoyant": 0x76428a,
    "brown": 0xac3232,
    "mandy": 0xd95763,
    "plum": 0xd77bba,
    "rainforest": 0x8f974a,
    "stinger": 0x8a6f30,
}

class PropEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value:this.props.def.value
        }
    }
    componentWillReceiveProps(nextProps) {
        if(this.props.def !== nextProps.def) {
            this.setState({value:nextProps.def.value})
        }
    }
    changed = (e) => {
        if(this.props.def.type === 'string') this.setState({value:e.target.value})
        if(this.props.def.type === 'number') {
            const v = e.target.value
            this.setState({value:v})
            if(!isNaN(parseFloat(v))) {
                const sel = selMan.getSelection();
                this.props.provider.setPropertyValue(sel, this.props.def, v);
            }
        }
        if(this.props.def.type === 'boolean') this.setState({value:e.target.checked})
    }
    keypressed = (e) => {
        if(e.charCode === 13) this.commit();
    }
    booleanChanged = (e) => {
        this.setState({value:e.target.checked});
        const sel = selMan.getSelection();
        this.props.provider.setPropertyValue(sel,this.props.def,e.target.checked);
    }
    enumChanged = (value) => {
        this.setState({value:value})
        const sel = selMan.getSelection();
        this.props.provider.setPropertyValue(sel,this.props.def,value);
    }
    arrayChanged = (value) => {
        this.setState({value:value})
        const sel = selMan.getSelection();
        this.props.provider.setPropertyValue(sel,this.props.def,value);
    }
    colorChanged = (color) => {
        this.setState({value:color});
        const sel = selMan.getSelection();
        this.props.provider.setPropertyValue(sel,this.props.def,color);
        PopupManager.hide();
    }
    commit = () => {
        const sel = selMan.getSelection();
        this.props.provider.setPropertyValue(sel,this.props.def,this.state.value);
    }
    openColorEditor = (e) => {
        PopupManager.show(<PaletteColorPicker onSelect={this.colorChanged}/>, e.target)
    }
    render() {
        const def = this.props.def;
        const obj = selMan.getSelection();
        if (def.locked === true) return <i>{def.type}:{def.value}</i>
        if (def.type === 'string')  return <input type='string'   value={this.state.value} onChange={this.changed} onKeyPress={this.keypressed} onBlur={this.commit}/>
        if (def.type === 'number')  return <input type='number'   value={this.state.value} onChange={this.changed} onKeyPress={this.keypressed} onBlur={this.commit}/>
        if (def.type === 'boolean') return <input type='checkbox' checked={this.state.value} onChange={this.booleanChanged}/>
        if (def.type === 'enum') return <EnumEditor value={this.state.value} onChange={this.enumChanged} def={def} obj={obj} provider={this.props.provider}/>
        if (def.type === 'color') return <button style={{
            backgroundColor:this.state.value
        }} onClick={this.openColorEditor}>{this.state.value}</button>
        if (def.type === 'array') return <ArrayEditor value={this.state.value} onChange={this.arrayChanged} def={def} obj={obj} provider={this.props.provider}/>
        return <b>{def.type}:{def.value}</b>
    }
}

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
    if(typeof props.value !== 'undefined') {
        value = props.value.toString()
    }
    return <span>{value}</span>
}
class EnumEditor extends Component {
    calculateRenderer() {
        const def = this.props.def
        const obj = this.props.obj
        if(!this.props.provider.getRendererForEnum) return DefaultEnumRenderer
        const renderer = this.props.provider.getRendererForEnum(def.key,obj)
        if(!renderer) return DefaultEnumRenderer
        return renderer
    }
    calculateValues() {
        return this.props.provider.getValuesForEnum(this.props.def.key,this.props.obj)
    }
    open = (e) => {
        PopupManager.show(<EnumPicker
            values={this.calculateValues()}
            renderer={this.calculateRenderer()}
            onSelect={this.selectValue}
            provider={this.props.provider}
        />,e.target)
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

class ArrayEditor extends Component {
    constructor(props) {
        super(props)
        this.state = {
            showEditor:false,
            value:""
        }

    }
    calculateRenderer() {
        const def = this.props.def
        const obj = this.props.obj
        if(!this.props.provider.getRendererForEnum) return DefaultEnumRenderer
        const renderer = this.props.provider.getRendererForEnum(def.key,obj)
        if(!renderer) return DefaultEnumRenderer
        return renderer
    }
    addValue = ()=>{
        this.setState({showEditor:true})
    }
    enumChanged = (value) => {
        const arr = this.props.value.slice();
        arr.push(value)
        this.props.onChange(arr)
    }

    render() {
        const def = this.props.def
        const obj = this.props.obj
        let value = this.props.value
        if(!value) value = []
        return <div>
            {this.renderValues()}
            <button onClick={this.addValue} className="fa fa-plus"/>
            {this.renderEditor()}
        </div>
    }
    deleteItem(val) {
        let arr = this.props.value.slice()
        arr = arr.filter((v)=>v!==val)
        this.props.onChange(arr)
    }
    renderValues() {
        const Renderer = this.calculateRenderer()
        return <VBox>{this.props.value.map((val,i)=>{
            return <div key={i}>
                <button className="fa fa-minus" onClick={()=>this.deleteItem(val)}/>
                <Renderer value={val} provider={this.props.provider}/>
            </div>
        })}</VBox>
    }
    renderEditor() {
        if(!this.state.showEditor) return ""
        const def = this.props.def
        const obj = this.props.obj
        return <EnumEditor value={this.state.value}
                           onChange={this.enumChanged}
                           def={def}
                           obj={obj}
                           provider={this.props.provider}/>

    }
}

class PaletteColorPicker extends Component {
    chooseColor(c) {
        this.props.onSelect(c);
    }
    render() {
        const style = {
            display:'flex',
            flexDirection:'row',
            flexWrap:'wrap'
        }
        return <div style={style}>
            {Object.keys(COLORS2).map((key,i) => {
                let color = COLORS2[key];
                let scolor = color.toString(16);
                while(scolor.length < 6) scolor = "0"+scolor
                scolor = '#' +scolor
                let style = {
                    backgroundColor:scolor,
                    color:'red'
                }
                return <button key={key}
                               style={style}
                               onClick={this.chooseColor.bind(this, scolor)}
                >&nbsp;</button>
            })}
        </div>
    }
}

export default class PropSheet extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selection:null
        }
    }
    componentDidMount() {
        this.listener = selMan.on(SELECTION_MANAGER.CHANGED, (selection) => this.setState({selection:selection}))
    }
    componentWillUnmount() {
        selMan.off(SELECTION_MANAGER.CHANGED, this.listener);
    }
    render() {
        const props = this.calculateProps();
        return <ul className="prop-sheet">{props.map((prop, i) => {
            return <li key={i}><label>{prop.name}</label> <PropEditor def={prop} provider={this.props.provider}/></li>
        })}</ul>
    }
    calculateProps() {
        return this.props.provider.getProperties(selMan.getSelection());
    }
}

