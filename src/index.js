import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import '@fortawesome/fontawesome-free/css/all.css'
import App from './App';
import {parseOptions} from 'react-visual-editor-framework'
import {PopupManager, PopupManagerContext} from 'appy-comps'

const default_options = {
    mode: 'edit',
}
const options = parseOptions(default_options)
console.log("options is",options);

function init() {
    return <PopupManagerContext.Provider value={new PopupManager()}>
        <App options={options}/>
    </PopupManagerContext.Provider>
}

ReactDOM.render(init(), document.getElementById("root"));

