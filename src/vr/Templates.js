export const CUSTOM_BEHAVIOR_SCRIPT = `
/*
 #title untitled behavior
 #description does something
*/
{
  // defines a target property. must be a scene
  properties: {
    scene: { 
      type:'enum', 
      title: 'target scene', 
      value:null, 
      hints: {
        type:'node',
        nodeType:'scene'
      }
    },
  },
  init: function() {
    //called when the program starts
  },
  onEnter: function() {
    //called when entering a scene
  },
  onExit: function() {
    //called when exiting a scene
  },
  onClick: function(e) {
    //called when object is clicked on
    //e.system.navigateScene(e.props.scene)
  }
}
`