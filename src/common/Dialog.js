import React, {Component} from 'react'

export  class Dialog extends Component {
    clickedScrim = (e) => {
        if(e.target !== this.scrim) return
        if(this.props.onScrimClick) this.props.onScrimClick(e)
    }
    render() {
        if(!this.props.visible) return <div/>;
        const bodyStyle = {}
        if(this.props.width) bodyStyle.width = this.props.width
        if(this.props.height) bodyStyle.height = this.props.height
        return <div className={"dialog-scrim"} ref={(scrim)=>this.scrim=scrim} onClick={this.clickedScrim}>
            <div className={"dialog-body"} style={bodyStyle}>{this.props.children}</div>
        </div>

    }
}
