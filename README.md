__
General Ed is not a visual authoring tool for general use. It's a platform for us to build
some of our own tools. It is a structured document editor. It should not leave Mozilla because
that would set unrealistic expectations.

currently implemented demo editors:
* simple SVG editor
* simple 2d hypercard
* family tree builder
* simple 3D hypercard   
* boxes and lines editor for simple WebAudio



# Doc server

General Ed comes with a document server. This server is small and generic, providing
the bare minimum to save and load documents. You can post and get JSON documents from the
store by ID. There is no way to list documents. You must know the ID of the doc you are looking
for.  There are now accounts. Everything is public.  You can also store and load images. In this
case the filetype is preserved, but the filename is not.


# DocumentProvider

The core of every editor is a document provider (currently named TreeItemProviderInterface).
This is an object which provides information about the current document to the rest of the
system. It contains the actual document model and exposes this model through methods like
`findNodeById()`, `findParent()`, `hasChildren()`, etc.   Virtually every standard component of
the editor will access this document provider.

Document providers should extend the `TreeItemProviderInterface`, but most of them will
extend the TreeItemProvider which contains default implementations for many functions, making
it easier to get started.  This default ipmlementation assumes that there is a root 
node at this.root, that all children are stored in an array called node.children, that
every node has an id at node.id. It automatically tracks expanded/collapsed state, maintains
a lookup table of nodes by id, and manages event listeners. Every example application extends
this default TreeItemProvider so that the real provider can just worry about domain specific
tasks.



#Property Sheet

GeneralEd includes a sophisticated property sheet which can display and edit the properties of
any object. It includes built in editors for strings, numbers, booleans, colors, and enums.

A key responsibility of the DocumentProvider is giving the property sheet information about the
properties of the currently selected object. The provider *must* have a method called `getProperties`
which accepts an object. The provider should inspect this object for properties (often just calling
`Object.keys()`) then return an array of property definitions.  A property def is just a JSON
object with certain attributions describing the property.  For example, if the object had
two properties called `name` and `age` then getProperties would return a array like this:

```
[
    {
        key:'name',   //the actual property key
        name:'Name',  // a text description of the property, to display to the user
        type:'string', //indicates this is a string
    },
    {
        key:'age',
        name:"Item's Age",
        type:'number',
    }
]
```

A property definition must include the key and name, but may optionally include many other
attributes of the property.  Common attributes include:

* *type*:  one of `number`, `string`, `boolean`, `enum` or anything else you want.
* *locked*: if true, then the property value will be displayed but not be editable.
* *custom*: if true then the property sheet will ask for a custom editor for this property
* *live*: normally properties are only updated on the actual object once the user does a commit action,
such as leaving the field or pressing enter. However, if `live` is true then it will update on
every change. For example, pressing the up arrow in a number editor will increment the
number but only update when the user leaves the field. If live is true then the object
will update on every up arrow press.
* *value*: represents the current value of the property. this should be removed and obtained another way.
* *hints*: an object with extra information about how the property should be edited. This is specific to each type.


## Property types:

__string__ The default type is 'string'. Strings will be edited with a one line text field.
If you want multiple lines (a textarea) then set `propdef.hints.multiline` to true.

__number__ The type `number` is for both integers and floating point values.
It will use the standard HTML 5 number editor, which is usually a text
box with arrows to increment and decrement the value.  You can also use the
up and down arrow keys. Holding down the shift key will increment by larger values.
The default increment value is 1. To use a different increment use `incrementValue`
and `incrementLargeValue` hints.  To set a minimum or maximum value use `min` and `max` hints.
If the user types in a non-number value then the value will be ignored and the box
put into an error state.

__boolean__ is edited with a checkbox.

__color__ colors are edited with a popup color chooser

__array__  allows the user to edit a growing list of values with the type specified
by the `propdef.valueDef` property. This is really buggy and probably shouldn't be used yet. It could
be used for things like adding tags to a blog, where the tags are a set of values from the provider. ex:
`propdef.valueDef = {type:'enum'}`

__enum__  enums are a value with a set number of values.  If you set the type to enum then
the provider must also implement `getValuesForEnum` which returns an array of values for
the enum.  The provider may also optionally implement `getRendererForEnum` which
returns a React component to render the value. This is useful if your enum values are
integer code values but you want show nicely formatted titles to the user.

Here is an example of using an enum to select between three stroke styles in the SVG editor.

```
    const STROKE_STYLES = ['solid','dotted','dashed']
    ...
    getValuesForEnum(key) {
        if(key === 'strokeStyle') return STROKE_STYLES
        ...
    }
```


Here is an example of using an enum to choose the (human) parent of person
in the family tree. Renderers used for enums will be allocated by the PropSheet
as needed. The renderer will receive a props containing `provider` and `value`.


```
    getValuesForEnum(key,obj) {
        if(key === 'parents') return this.root.children.map((ch)=>ch.id)
    }
    getRendererForEnum(key,obj) {
        if(key === 'parents') return IdToNameRenderer;
    }

    ...

    const IdToNameRenderer = (props) => {
        let value = "---"
        if(props.value && props.provider) value = props.provider.findPersonById(props.value).name
        return <b>{value}</b>
    }
```


## Multiple Selections

You may select an object by calling `SelectionManager.setSelection(object)`. This will always
replace the current selection. To instead add an object so that multiple objects are selected, use
`Selectionmanager.addToSelection(object)`.  To retrieve the selected object use getSelection().
If multiple items are selected then `getSelection()` will only return the first object. To get the
full selection of all objects use `getFullSelection()`.

The property sheet will use getFullSelection. If multiple items are selected then updating a property
will set that property for all objects in the selection. If the selected items have a different set of
properties then only properties available on all items will be editable (the intersection of the property sets).





