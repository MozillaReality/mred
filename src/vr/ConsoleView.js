import React, {Component} from 'react'

export class ConsoleView extends Component {
    clearLog = () => {
        this.setState({messages:[]})
    }

    constructor(props) {
        super(props)

        this.state = {
            messages:[]
        }
    }
    componentDidMount() {
        this.props.logger.addEventListener("log",(e)=>{
            this.state.messages.push(e)
            this.setState({messages:this.state.messages})
        })
        this.props.logger.addEventListener("error",(e)=>{
            this.state.messages.push(e)
            this.setState({messages:this.state.messages})
        })
    }

    render() {
        return <div className="console wide">
            <div className="toolbar gray">
                <button className="action gray fa fa-trash borderless" onClick={this.clearLog}/>
                <button className="action gray fa fa-exclamation-triangle borderless"/>
                <input type="text" placeholder="filter messages" className="spacer"/>
            </div>
            <ul className={"message-log"}>
                {this.state.messages.map((msg,i) => {
                    return <li key={i}>
                        <b className={msg.type}>{msg.type}</b>
                        <i>{msg.count}</i>
                        {this.formatMessage(msg)}
                    </li>
                })}

            </ul>
        </div>
    }

    formatMessage(msg) {
        // console.log("formatting",typeof (msg.messages), (msg.messages instanceof Array), msg)
        const msgs =  msg.messages.map((str,i) => {
            if(typeof str === 'string' || str instanceof String) {
                return <b key={i}>{str}</b>
            }
            // console.log("formatting", str)
            return <b key={i}>{str.toString()}</b>
        })
        return <span>{msgs}</span>
    }
}
