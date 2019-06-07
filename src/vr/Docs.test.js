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

it('loads a doc with a cube',() => {
    const editor = new VREditor()
    const doc = {
        type:TOTAL_OBJ_TYPES.ROOT,
        children:[
            {
                type:TOTAL_OBJ_TYPES.SCENE,
                children: [
                    {
                        type:OBJ_TYPES.cube,
                        tx:0,
                        ty:88,
                        tz:0,
                        title:'the awesome cube'
                    }
                ]
            }
        ]
    }
    editor.loadDocFromJSON(doc)
    const child = editor.getSceneRootObject().find(ch => ch.type === 'cube')[0]
    expect(child.title).toEqual('the awesome cube')

})