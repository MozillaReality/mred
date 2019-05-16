import React, {Component} from 'react'

export class ErrorCatcher extends Component {


    constructor(props, context) {
        super(props, context)
        this.state = {error:false }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({error:true})
        const logger = this.props.logger
        if(!logger) {
            console.log("NO LOGGER!")
            return
        }
        logger.error("an error occurred at the react level")
        logger.error(error)
        logger.error(errorInfo)
    }

    render() {
        if(this.state.error === true) {
            return <div><h1>An error happened. Please look at the console</h1></div>
        }

        return this.props.children
    }

}