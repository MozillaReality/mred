import React from 'react';
import ReactDOM from 'react-dom';
import {DocGraph} from 'syncing_protocol'
import VREditor from './VREditor'

it('makes a doc', () => {
    const doc = new DocGraph()
    const editor = new VREditor()
    editor.makeEmptyRoot(doc)
    console.log("made the doc",doc)
});
