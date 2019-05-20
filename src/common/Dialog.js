import React, {Component} from 'react'

export  class Dialog extends Component {
    clickedScrim = (e) => {
        if(e.target !== this.scrim) return
        if(this.props.onScrimClick) this.props.onScrimClick(e)
    }
    render() {
        if(!this.props.visible) return <div/>;
        return <div className={"ac-dialog-scrim"} ref={(scrim)=>this.scrim=scrim} onClick={this.clickedScrim}>
            <div className={"ac-dialog-body"}>{this.props.children}</div>
        </div>

    }
}
