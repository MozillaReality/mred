import React, {Component} from 'react'
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import PropSheet from '../PropSheet'

export default class FamilyTreeApp extends Component {
    addPerson = ()=> this.props.provider.addPerson(this.props.provider.makePerson('unnamed'))
    render() {
        const prov = this.props.provider
        return <GridEditorApp provider={prov}>

            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>

            <Toolbar left bottom>
                <button className="fa fa-plus" onClick={this.addPerson}>add person</button>
            </Toolbar>

            <Panel center middle scroll>{this.props.provider.getCanvas()}</Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>


            <Toolbar center top/>
            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }

}