import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'font-awesome/css/font-awesome.css'
import App from './App';
import {Preview} from "./HypercardEditor"
import {parseOptions} from "./utils"

const default_options = {
    mode: 'edit',
}
const options = parseOptions(default_options)
console.log("options is",options);

function init() {
    if(options.mode === 'preview') return <Preview options={options}/>
    return <App/>;
}

ReactDOM.render(init(), document.getElementById("root"));

