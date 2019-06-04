import React from 'react';
import ReactDOM from 'react-dom';
import {DocGraph} from 'syncing_protocol'
import VREditor from './VREditor'
import {OBJ_TYPES, TOTAL_OBJ_TYPES} from './Common'

it('makes an empty doc', () => {
    const doc = new DocGraph()
    const editor = new VREditor()
    editor.makeEmptyRoot(doc)
    expect(editor.getSceneRootObject().type).toEqual(TOTAL_OBJ_TYPES.ROOT)
});

it('makes a cube',() => {
    const doc = new DocGraph()
    const editor = new VREditor()
    editor.makeEmptyRoot(doc)
    const obj = editor.add3DObject(OBJ_TYPES.cube,editor.getSelectedSceneObject())
    const child = editor.getSceneRootObject().find(ch => ch.id === obj.id)[0]
    console.log("found the child",child)
    expect(child.title).toEqual(obj.title)

})