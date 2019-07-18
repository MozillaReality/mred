/*
#title hittest
#description xr hit test and place anchor
*/
({
    properties: {
        speed: {
            type:'number',
            value: 1,
        }
    },
    click: function(e) {
        alert(1)
        console.log(e)
        console.log(this)
        console.log(this.globals)
        // this.globals.getHitAnchorFromNormalizedScreenCoordinates(x,y).then( (anchor) => {
    },
})
 

