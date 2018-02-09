import React, { Component } from 'react';
import {SERVER_URL_ASSETS} from '../TreeItemProvider'

export default class URLFileEditor extends Component {
    constructor(props) {
        super(props)
        this.state = {
            text:""
        }
        if(props.def.value) {
            this.state.text = props.def.value
        }
    }
    editText = (e) => {
        this.setState({text:e.target.value})
    }
    choseFile = (e) => {
        this.setState({text:e.target.files[0].name})
        const fr = new FileReader()
        fr.onload = (e)=>{
            this.props.provider.setPropertyValue(this.props.item,this.props.def,e.target.result)
        }
        fr.readAsDataURL(e.target.files[0])
        this.props.provider.uploadFile(e.target.files[0]).then((ans)=>{
            console.log("got back the asnwer",ans)
            const url = SERVER_URL_ASSETS+ans.id
            this.props.provider.setPropertyValue(this.props.item,this.props.def,url)
            this.setState({text:url})
        })
    }
    render() {
        return <div>
            <input type="text" onChange={this.editText} value={this.state.text}/>
            <input type="file" onChange={this.choseFile}/>
        </div>
    }

}