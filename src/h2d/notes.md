design of common drag and drop code


texture editor uses

Rect.onMouseDown

stop propagation
prevent default
set the selection
create svg point and invert to get the starting position of node in window coordinates from e.clientxy
this is offset between node.pos and cursor.pos

add move listener to the window

get client.xy into window coords

find defs for x and y props
set property value to current.x - start.x




svg canvas uses

one system for moving nodes
one system for adjusting handles

stop prop
prevent default

uses bounding client rectand svgcanvas.viewbox to convert
e.clientxy to get the offset

adds mouse move listener

gets prop defs for tx and ty
set property value to current minus start minus inset




hypercard container uses

stop prop, prevent default, set the selection

get start point from bounding rect
add mouse move listener
call prov.setPropertyValueByName instead of getting the prop defs.
use bounding rect to convert window coords to canvas


in all cases you start drag and hand it off to handlers
handlers need the provider
they need the currently selected item
they need the starting cursor point
conversion routines to turn local cursor to world
convert world to canvas
track when dragging
track start point and current point
update property value, but the property names may be different
clean up when dragging is done


new concept. create a handler object. start it. give it
a mouse event, and item. it cleans itself up when done.

new Handler().startDrag(e, item) 