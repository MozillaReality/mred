


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

