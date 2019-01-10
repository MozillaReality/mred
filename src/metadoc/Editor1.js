import React, {Component} from 'react'
import TreeItemProvider from "../TreeItemProvider";

export default class MetadocEditor extends  TreeItemProvider {
    constructor() {
        super()
    }

    getDocType = () => "metadoc"
    getApp = () => <MetadocApp provider={this}/>

}


class MetadocApp extends Component {
    constructor(props) {
        super(props)
    }
}