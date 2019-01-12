import React, {Component} from 'react'
import HypercardCanvas3D from './HypercardCanvas3D'
import GridEditorApp, {MenuPopup, Panel, Toolbar} from '../GridEditorApp'
import PropSheet from '../common/PropSheet'
import SelectionManager from '../SelectionManager'
import {PopupManager} from 'appy-comps'

export default class Hypercard3DApp extends Component {
    constructor(props) {
        super(props)
    }
    showAddPopup = (e) => {
        const prov = this.props.provider
        const actions = [
            {
                // title:'rect',
                icon: 'cube',
                fun: () => prov.addToNearestSelectedParent(prov.createCube())
            },
            {
                // title:'circle',
                icon: 'soccer-ball-o',
                fun: () => prov.addToNearestSelectedParent(prov.createSphere())
            },
            {
                // title:'plane',
                icon: 'plane',
                fun: () => prov.addToNearestSelectedParent(prov.createPlane())
            },
            {
                // title:'sky',
                icon: 'cloud',
                fun: () => prov.addToNearestSelectedParent(prov.createSky())
            },
            {
                icon: 'cube',
                title: 'gltf',
                fun: () => prov.addToNearestSelectedParent(prov.createGLTF())
            },
        ]

        PopupManager.show(<MenuPopup actions={actions}/>, e.target)
    }
    render() {
        const prov = this.props.provider
        return <GridEditorApp provider={prov}>

            <Toolbar left top><label>{prov.getTitle()}</label></Toolbar>

            <Toolbar left bottom>
                <button className="fa fa-vcard" onClick={()=>prov.appendChild(prov.getSceneRoot(),prov.createScene())}/>
                <button className="fa fa-plus" onClick={this.showAddPopup}>object</button>
                <button className="fa fa-close" onClick={()=>prov.deleteChild(SelectionManager.getSelection())}/>
            </Toolbar>


            <Toolbar center top>
                <button className="fa fa-save" onClick={prov.save}/>
            </Toolbar>

            <Panel center middle scroll>
                <HypercardCanvas3D provider={prov}/>
            </Panel>

            <Panel scroll right><PropSheet provider={prov}/></Panel>

            <Toolbar right top/>
            <Toolbar right bottom/>

        </GridEditorApp>
    }
}