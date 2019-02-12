import React, {Component} from 'react'
import * as ToasterManager from './ToasterManager'

export class ToasterNotification extends Component {
    constructor(props) {
        super(props)
        this.state = {
            notification:'saved',
            visible:false
        }
    }

    add = (payload) => {
        this.setState({notification:payload, visible:true})
        setTimeout(this.hide,2000)
    }

    hide = () => this.setState({visible:false})

    componentWillMount() {
        ToasterManager.onAdd(this.add)
    }

    render() {
        return <div style={{
            position:'absolute',
            bottom:'10px',
            left:'10px',
            backgroundColor:'rgba(0,0,0,0.6)',
            borderRadius:'1em',
            color:'white',
            fontSize:'24pt',
            padding:'1em',
            display:this.state.visible?'block':'none'
        }}>{this.state.notification}</div>
    }
}
