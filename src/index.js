import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import '@fortawesome/fontawesome-free/css/all.css'
import App from './App';
import {parseOptions} from 'react-visual-editor-framework'
import {AuthModule} from './vr/AuthModule'

const default_options = {
    mode: 'edit',
}
const options = parseOptions(default_options)
console.log("options is",options);

function init() {
    options.AuthModule = AuthModule
    return <App options={options}/>;
}

ReactDOM.render(init(), document.getElementById("root"));

