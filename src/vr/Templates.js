export const CUSTOM_BEHAVIOR_SCRIPT = `
/*
 #title untitled behavior
 #description does something
*/
({
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
    click: function(e) {
        //called when object is clicked on
        //this.navigateScene(this.properties.scene)
    }
})
`



export const CUSTOM_SCENE_SCRIPT = `
/*
 #title scene script
 #description does something
*/
({
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
    enter: function() {
        //called when entering a scene
    },
    exit: function() {
        //called when exiting a scene
    },
})
`