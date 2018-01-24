import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'font-awesome/css/font-awesome.css'
import App from './App';
import {Preview2D} from "./HypercardEditor"
import Preview3D from "./h3d/Preview3D"
import {genAlphaID, parseOptions} from './utils'

const default_options = {
    mode: 'edit',
    doc:genAlphaID(20)
}
const options = parseOptions(default_options)
console.log("options is",options);

function init() {
    if(options.mode === 'preview') {
        if(options.provider === 'hypercard2D')  return <Preview2D options={options}/>
        if(options.provider === 'hypercard3D')  return <Preview3D options={options}/>
        console.log("invalid provider")
    }
    return <App options={options}/>;
}

ReactDOM.render(init(), document.getElementById("root"));

