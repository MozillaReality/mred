import React, {Component} from 'react'
import {GET_JSON} from '../utils'
import {HBox, VBox} from 'appy-comps'

export default class ClipartSearchPanel extends Component {
    constructor(props) {
        super(props)
        this.state = {
            query:'cat',
            results:[]
        }
    }
    edited = (e) => {
        this.setState({query:e.target.value})
    }
    doSearch = () => {
        console.log("searching for ",this.state.query)
        GET_JSON(`https://openclipart.org/search/json/?query=${this.state.query}`).then((res)=> {
            console.log("got the result", res)
            if (res.msg !== 'success') {
                console.log("not a success!")
                return;
            }

            console.log("total result count", res.info.results, 'cross pages', res.info.pages)
            res.payload.forEach((item) => console.log(item))
            this.setState({results:res.payload})
        })
    }
    keyDown = (e) => {
        if(e.keyCode ===  13) this.doSearch()
    }
    render() {
        return <VBox>
            <HBox>
                <input type="text" value={this.state.query}
                       onChange={this.edited}
                       onKeyDown={this.keyDown}
                /><button onClick={this.doSearch}>search</button></HBox>
            <ul>
                {this.state.results.map((res,i)=><ClipartResult result={res} key={i} provider={this.props.provider}/>)}
            </ul>
        </VBox>
    }
}

class ClipartResult extends Component {
    addToDocument = () => {
        const prov = this.props.provider;
        const url = this.props.result.svg.png_2400px
        prov.appendChild(prov.findSelectedCard(),prov.createImageFromURL(url))
    }
    render() {
        const res = this.props.result;
        return <li>
            {res.title}
            {res.svg_filesize}
            <a href={res.svg.url}>web</a>
            <button className="fa fa-plus-circle" onClick={this.addToDocument}>add</button>
            <br/>
            <img src={res.svg.png_thumb} width='100px'/>
        </li>
    }
}