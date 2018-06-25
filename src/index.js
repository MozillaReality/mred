import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'font-awesome/css/font-awesome.css'
import App from './App';
import HypercardPreview3D from "./h3d/HypercardPreview3D"
import {genAlphaID, parseOptions} from './utils'
import HypercardPreview2D from './h2d/HypercardPreview2D'
import { Preview360} from "./360/Editor360Editor"

const default_options = {
    mode: 'edit',
    doc:genAlphaID(20)
}
const options = parseOptions(default_options)
console.log("options is",options);

function init() {
    if(options.mode === 'preview') {
        if(options.doctype === 'hypercard-2d')  return <HypercardPreview2D options={options}/>
        if(options.doctype === 'hypercard-3d')  return <HypercardPreview3D options={options}/>
        if(options.doctype === '360')  return <Preview360 options={options}/>
        console.log("invalid provider")
    }
    return <App options={options}/>;
}

ReactDOM.render(init(), document.getElementById("root"));

