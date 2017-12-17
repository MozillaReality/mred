* create a document model
   stack
     card
         id
         title
       rect
        x
        y
        w
        h
        fill
       text
        x
        y
        text
        w
        fill
        
buttons:
  append card to stack
  append rect to card
  append text to card
  
props:
 x,y,w,h
 text,
 fill

stack view
    shows all cards as a grid with lines connecting them for the links
card view
    shows all rects and text
    can click to select
    can drag to move
button
 delete selected object from parent
 delete selected card from stack
- create new card in the stack
- add and drag around a rect, set it's color
- add and type in text, move, set it's color
- make rect or text be a link to another card
- some sort of a publish button. generate html? preview in another tab?
