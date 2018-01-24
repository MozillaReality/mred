
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
* 3d:one object with an action to jump to another scene. make sphere. attach a click action. does a proper link the way aframe does
* 3d: create a navigation action object. click event on sphere will attach to this object
* 3d: Make an object spin for ever 
* 3d: Make an object spin when I click on it
* remove color from GLTF object 
* Move objects between scenes by dragging 


* fix broken hypercard 2d preview
* 3d: be able to select and update light and camera
* 3d: make VR controls for preview mode. Really follow links with mouse click
* use collapsing panels with new minmax code
* 3d: popup for adding objects: cube, sphere, obj, light, camera
* put the icon in the GUI somewhere
* Show another editor for family tree with auto layout 
* Import drone object and set some animation triggers
* host on vr.josh.earth at a certain port
* Drag in 360 image 
* Drag in gltf model
* 2D: image import, make clickable


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

