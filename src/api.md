the lifecycle of a document:


* connect to the doc server using AuthModule.init()
* load the document
* parse and cache all of the behaviors in the behaviors list
* load all images in the assets 
* rebuild three-js objects in the tree. pass in cache obj with provider methods