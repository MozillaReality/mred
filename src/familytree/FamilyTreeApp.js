import React, {Component} from 'react'
import GridEditorApp, {Panel, Toolbar} from '../GridEditorApp'
import PropSheet from '../PropSheet'
import InputManager from '../common/InputManager'
import TreeTable from '../TreeTable'

export default class FamilyTreeApp extends Component {

    constructor(props) {
        super(props)
        this.im = new InputManager()
        this.im.addKeyBinding({
            id:'save',
            key:InputManager.KEYS.S,
            modifiers:[InputManager.MODIFIERS.COMMAND]
        })
        this.im.addListener('save',this.save)
    }
    componentDidMount() {
        this.im.attachKeyEvents(document)
    }
    save = () => this.props.provider.save()
    addPerson = ()=> this.props.provider.addPerson(this.props.provider.makePerson('unnamed'))
    render() {
        const prov = this.props.provider
        return <GridEditorApp>

            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>
            <Panel scroll left middle>
                <TreeTable root={prov.getSceneRoot()} provider={prov}/>
            </Panel>
            <Toolbar left bottom>
                <button className="fa fa-plus" onClick={this.addPerson}>add person</button>
            </Toolbar>

            <Panel center middle scroll>{this.props.provider.getCanvas()}</Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>


            <Toolbar center top>
                <button className="fa fa-save" onClick={prov.save}/>
            </Toolbar>
            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }

}