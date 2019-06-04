import React from 'react';
import ReactDOM from 'react-dom';
import {DocGraph} from 'syncing_protocol'
import VREditor from './VREditor'
import {TOTAL_OBJ_TYPES} from './Common'

it('makes an empty doc', () => {
    const doc = new DocGraph()
    const editor = new VREditor()
    editor.makeEmptyRoot(doc)
    expect(editor.getSceneRootObject().type).toEqual(TOTAL_OBJ_TYPES.ROOT)
});
