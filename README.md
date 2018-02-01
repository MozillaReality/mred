make the svg area zoom in and out
show root.nodes and root.connections in the tree view

node should be like this:

{
    type,id,x,y,
    template:'templatename',
    inputs: {
        name: {
            type:'value',
            value:somevalue
            
            or
            
            type:'connection'
            id:someid
            
            }
    }
    outputs:{
        outputs don't have values. they are just the source for a connection, possibly multiple connections.
    }
}

template looks similar
when created, copy default values from the template to the block, always use block values from then on

connection:
{
    output: {  the source node
        node:nodeid
        prop:propname
    }
    input: {  the target node
        node:nodeid
        prop:propname
    }
}

there may be multiple connections with the same output node & prop


to draw the screen we need

getNodes()
getInputConnectionsForNode(node)
getNodeForId(id)
getConnectionForId(id)
getPropertyPosition(node,propname)
getProperties(node) returns full set of property defs.  
    if a node input property comes from a connection, then it is locked
    do not show output properties, only inputs (or should we make them viewable but always locked?)
    if there is no editor for the type (like xyfill) then just print the type

canMakeOutputConnection(input.nodeid,input.prop)
canMakeInputConnection(output.nodeid,output.prop)
    only allow connections from compatible types
    disallow a block connecting to itself
    do allow multiple connections on a single output
    do not allow multiple connections on a single input
    
    
add click event to the canvas to make it refresh
canvas always shows the current output graph. how to search for them?
draw the current target node

getZoomScale()
make viewer resize itself to fit the contents plus some margin. drag to the edges to make more room
draging blocks breaks when you go over to another pane

always pass the document to the viewer, even if we access things through the provider

make sure to unregister anything when the component is unmounted

position the inputs and outputs using a stable sort order for the inputs
position the connection line based on the position of the propname in the node. this can be optimized.
getInputsForNode(node) instead of directly accessing them
computeValueForProperty(node,property)  evaluates local values, and follows connections if needed 



make items draggable in the hypercard 2d
add images to hypercard 2d. create node, set src, it loads automatically, resize with handles

-------------------


General Ed is not a visual authoring tool for general use. It's a platform for us to build
some of our own tools. It is a structured document editor. It should not leave Mozilla because
that would set unrealistic expectations.

demos:
simple SVG editor
simple 2d hypercard
family tree builder
simple 3D hypercard

explain the doc server

what must work for the demo

* //make saving, loading, reloading, pubnub stuff part of the base class
* //3d: button to add a new card, be able to switch cards
* //3d: Make an object spin for ever by attaching an animation object
* //3d: make nav action work in the preview mode
* //3d: create a navigation action object. click event on sphere will attach to this object
* 3d: Make an object spin when I click on it. click action, triggers target animation.
* Move objects between scenes by dragging 


* fix broken hypercard 2d preview
* 3d: be able to select and update light and camera
* 3d: make VR controls for preview mode
* use collapsing panels with new minmax code
* 3d: popup for adding objects: cube, sphere, obj, light, camera
* put the icon in the GUI somewhere
* Show another editor for family tree with auto layout 
* Import drone object and set some animation triggers
* host on vr.josh.earth at a certain port
* Drag in 360 image 
* Drag in gltf model
* 2D: image import, make clickable
* remove color from GLTF object 


attach an action
action can: navigate to new screen, start animation, stop animation, ask the user for input

add 'animation' as an object in the scene
attach onclick to animation to start it or stop it
animation object {
  target: object in the current scene,
   



--------


some cool stuff


server design.

//a document has a unique random URL
//server can save and load from the URL
//when saved, it issues a save event on a channel with the same name as the document ID
//a document is a json file in a docs dir with the filename the same as the docid, plus .json.
//file names are sanitized. only letters and numbers are allowed. no punctuation at all.

editor loads particular document, also subscribes to the channel for that document
when saving, expects to receive an update event
when gets update event, fire reload event which reloads the document from the server
persist selection by using IDs
preview does a save then opens the preview window
save does a save
dirty tracking to not do unnecessary saves

preview receives doc id
loads doc from server
subscribes to channel for that doc
when update, get new doc from the server

this should work whether or not the client is local or on a remote server
the server is always on a remote server (unless I'm directly working on the server component)

