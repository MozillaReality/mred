import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'font-awesome/css/font-awesome.css'
import App from './App';
import {parseOptions} from './utils'

const default_options = {
    mode: 'edit',
}
const options = parseOptions(default_options)
console.log("options is",options);

function init() {
    return <App options={options}/>;
}

ReactDOM.render(init(), document.getElementById("root"));

