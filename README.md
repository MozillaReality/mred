
    style: text, spin, color-picker, slider, dropdown

class LibraryManager {

A scene has a library of objects which can be reused.
ex: create a lambert material, give it a name, reference it as the material for several objects. When I change the material all of the objects get it. This is a live reference.  Reusable objects from the library are not live. You always get a copy.
