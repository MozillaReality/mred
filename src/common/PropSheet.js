import React, {Component} from 'react';
import {PopupManager} from 'appy-comps'

import selMan, {SELECTION_MANAGER} from "../SelectionManager";
import HSLUVColorPicker from "../HSLUVColorPicker";
import {TREE_ITEM_PROVIDER} from '../TreeItemProvider'
import {StringEditor} from "./StringEditor";
import {EnumEditor} from "./EnumEditor";
import {ArrayEditor} from "./ArrayEditor";

/*const COLORS2 = {
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
}*/

export const TYPES = {
    STRING:'string',
    NUMBER:'number',
    BOOLEAN:'boolean',
    ENUM:'enum',
    COLOR:'color',
}

class PropEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value:props.def.getValue()
        }
    }
    componentWillReceiveProps(nextProps) {
        if(this.props.def !== nextProps.def) {
            this.setState({value:nextProps.def.getValue()})
        }
    }
    shouldComponentUpdate(nextProps, nextState) {
        if(this.state.value !== nextState.value) return true
        if(this.props.def.getKey() === nextProps.def.getKey()) {
            if(this.props.def.getValue() === nextProps.def.getValue()) {
                return false
            }
        }
        return true
    }
    changed = (e) => {
        if(this.props.def.isType(TYPES.STRING)) {
            this.setState({value:e.target.value})
            if(this.props.def.isLive()) {
                this.props.def.setValue(e.target.value)
            }
        }
        if(this.props.def.isType(TYPES.NUMBER)) this.updateNum(e.target.value)
        if(this.props.def.isType(TYPES.BOOLEAN)) this.setState({value:e.target.checked})
    }
    customChanged = value => {
        if(this.props.def.isType(TYPES.COLOR)) return this.colorChanged(value)
    }
    keypressed = (e) => {
        if(e.charCode === 13) this.commit();
    }
    updateNum = (v) => {
        const def = this.props.def;
        if(def.hasHints()) {
            if(def.getHints().hasOwnProperty('min')) {
                if(v < def.getHints().min) v = def.getHints().min
            }
            if(def.getHints().hasOwnProperty('max')) {
                if (v > def.getHints().max) v = def.getHints().max
            }
        }
        this.setState({value:v})
        if(!isNaN(parseFloat(v))) {
            def.setValue(parseFloat(v))
        }
    }
    numberKeyDown = (e) => {
        if(e.key === 'ArrowUp' && e.shiftKey) {
            e.preventDefault()
            this.updateNum(this.state.value+10)
        }
        if(e.key === 'ArrowDown' && e.shiftKey) {
            e.preventDefault()
            this.updateNum(this.state.value-10)
        }
    }
    booleanChanged = (e) => {
        this.setState({value:e.target.checked});
        this.props.def.setValue(e.target.checked)
    }
    enumChanged = (value) => {
        this.setState({value:value})
        this.props.def.setValue(value)
    }
    arrayChanged = (value) => {
        this.setState({value:value})
        this.props.def.setValue(value)
    }
    colorChanged = (color) => {
        this.setState({value:color});
        this.props.def.setValue(color)
    }
    commit = () => {
        this.props.def.setValue(this.state.value)
    }
    openColorEditor = (e) => {
        PopupManager.show(<HSLUVColorPicker onSelect={this.colorChanged} value={this.state.value}/>, e.target)
    }
    render() {
        const prop = this.props.def;
        const obj = selMan.getSelection();
        const provider = this.props.provider
        if (prop.isCustom()) return this.props.provider.createCustomEditor(this.props.item, prop, provider, this.state.value, this.customChanged)
        if (prop.isLocked()) return <i>{prop.getValue()}</i>
        if (prop.isType(TYPES.STRING))  return <StringEditor value={this.state.value}
                                 onChange={this.changed}
                                 onBlur={this.commit}
                                 def={prop} obj={obj}
                                 provider={this.props.provider}/>
        if (prop.isType(TYPES.NUMBER))  {
            let step = 1
            if(prop.hasHints()) {
                const hints = prop.getHints()
                if (hints.incrementValue) {
                    step = hints.incrementValue
                }
            }
            return <input type='number'
                          value={this.state.value}
                          onChange={this.changed}
                          onKeyPress={this.keypressed}
                          onKeyDown={this.numberKeyDown}
                          onBlur={this.commit}
                          step={step}/>
        }
        if (prop.isType(TYPES.BOOLEAN)) return <input type='checkbox'
                                                  checked={this.state.value}
                                                  onChange={this.booleanChanged}/>
        if (prop.isType(TYPES.ENUM)) return <EnumEditor value={this.state.value} onChange={this.enumChanged} def={prop} obj={obj} provider={this.props.provider}/>
        if (prop.isType(TYPES.COLOR)) return <button style={{ backgroundColor:this.state.value}} onClick={this.openColorEditor}>{this.state.value}</button>
        if (prop.isType('array')) return <ArrayEditor value={this.state.value} onChange={this.arrayChanged} def={prop} obj={obj} provider={this.props.provider}/>
        return <b>{prop.getType()}:{prop.getValue()}</b>
    }
}

/*class PaletteColorPicker extends Component {
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
*/
export default class PropSheet extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selection:null
        }
    }
    componentDidMount() {
        this.h2 = () => this.setState({selection:selMan.getSelection()})
        this.props.provider.on(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,this.h2)
        this.hand = (s) => this.setState({selection:selMan.getSelection()})
        selMan.on(SELECTION_MANAGER.CHANGED, this.hand)
    }
    componentWillUnmount() {
        selMan.off(SELECTION_MANAGER.CHANGED, this.hand);
        this.props.provider.off(TREE_ITEM_PROVIDER.PROPERTY_CHANGED,this.h2)
    }
    render() {
        const props = this.calculateProps();
        const item = selMan.getSelection()
        return <ul className="prop-sheet">{props.map((prop, i) => {
            return [
                <label key={prop.getKey()+'-label'}>{prop.getName()}</label>,
                this.renderIndeterminate(prop,i),
                <PropEditor key={prop.getKey()+'-editor'} def={prop} provider={this.props.provider} item={item}/>
            ]
        })}</ul>
    }
    renderIndeterminate(prop, i) {
        if(prop.isIndeterminate()) {
            return <i key={prop.getKey()+'-indeterminate'} className="icon fa fa-exclamation-circle"/>
        } else {
            return ""
        }
    }
    calculateProps() {
        const items = selMan.getFullSelection()
        const first = items[0]
        const prov = this.props.provider
        let props = prov.getProperties(first)
        items.forEach((item)=>{
            props = calculateIntersection(props, prov.getProperties(item))
        })
        return props.map((prop)=>{
            const multi = new MultiPropProxy(prov, prop.key)
            items.forEach((item)=>{
                const p2 = prov.getProperties(item)
                const match = p2.find(def=>def.key === prop.key)
                multi.addSubProxy(new PropProxy(prov,item,match))
            })
            return multi
        });
    }

}

//return items from A that are also in B
function calculateIntersection(A,B) {
    return  A.filter((pa)=> B.find((pb)=>pa.key===pb.key))
}


class MultiPropProxy {
    constructor(provider,key) {
        this.provider = provider
        this.key = key
        this.subs = []
    }
    addSubProxy(sub) {
        this.subs.push(sub)
    }
    first() {
        return this.subs[0]
    }
    getName()  { return this.first().getName()  }
    getValue() { return this.first().getValue() }
    isCustom() { return this.first().isCustom() }
    hasHints() { return this.first().hasHints() }
    getHints() { return this.first().getHints() }
    isLocked() { return this.first().isLocked() }
    getType()  { return this.first().getType()  }
    isType(s)  { return this.first().isType(s)  }
    isLive()   { return this.first().isLive()   }
    getKey()   { return this.key                }
    setValue(v) {
        this.subs.forEach((s)=> s.setValue(v))
    }
    isIndeterminate() {
        let same = true
        let value = this.first().getValue()
        this.subs.forEach((s)=>{
            if(s.getValue() !== value) same = false
        })
        return !same;
    }
}


class PropProxy {
    constructor(provider, item, def) {
        this.provider = provider
        this.item = item
        this.def = def
    }
    getKey() {
        return this.def.key
    }
    getName() {
        return this.def.name
    }
    isCustom() {
        return this.def.custom
    }
    isLocked() {
        return this.def.locked
    }
    getType() {
        return this.def.type
    }
    getValue() {
        return this.def.value
    }
    isLive() {
        return this.def.live
    }
    isType(type) {
        return this.def.type === type
    }
    setValue(value) {
        return this.provider.setPropertyValue(this.item,this.def,value)
    }
    hasHints() {
        return this.def.hints
    }
    getHints() {
        return this.def.hints
    }
    isIndeterminate() { return false; }
}
