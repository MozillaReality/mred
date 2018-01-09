import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'font-awesome/css/font-awesome.css'
import App from './App';
import Hypercard2DEditor from "./HypercardEditor"
import Hypercard3DEditor from "./Hypercard3DEditor"
import {parseOptions} from "./utils"

const default_options = {
    mode: 'edit',
}
const options = parseOptions(default_options)
console.log("options is",options);

function init() {
    if(options.mode === 'preview') {
        if(options.provider === 'hypercard2D')  return <Hypercard2DEditor.Preview options={options}/>
        if(options.provider === 'hypercard3D')  return <Hypercard3DEditor.Preview options={options}/>
    }
    return <App/>;
}

ReactDOM.render(init(), document.getElementById("root"));

