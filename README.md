
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

 