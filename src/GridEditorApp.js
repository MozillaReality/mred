import React, {Component} from 'react'
import {PopupContainer, PopupManager, VBox} from 'appy-comps'
import TreeTable from './TreeTable'
import PropSheet from './PropSheet'

const GridLayout = (props) => {
    let clss = "grid fill";
    if (!props.showLeft) clss += ' hide-left';
    if (!props.showRight) clss += ' hide-right';
    return <div className={clss}>{props.children}</div>
};

export const Toolbar = (props) => {
    let cls = "toolbar";
    if (props.left) cls += " left";
    if (props.right) cls += " right";
    if (props.bottom) cls += " bottom";
    if (props.top) cls += " top";
    if (props.scroll) cls += " scroll";
    return <div className={cls}>{props.children}</div>
};
export const Panel = (props) => {
    let cls = 'panel';
    if (props.left) cls += " left";
    if (props.right) cls += " right";
    if (props.bottom) cls += " bottom";
    if (props.top) cls += " top";
    if (props.scroll) cls += " scroll";
    return <div className={cls}>{props.children}</div>
};
export const Spacer = (props) => {
    return <span className='spacer'/>
};

export const MenuPopup = (props) => {
    return <VBox>
        {props.actions.map((act,i)=>{
            return <button  key={i} onClick={()=>{
                PopupManager.hide();
                if(act.fun) act.fun()
            }}><i className={'fa fa-' + act.icon}/> {act.title}</button>
        })}
    </VBox>

}

export default class GridEditorApp extends Component {
    constructor(props) {
        super(props)
        this.state = {
            showLeft: true,
            showRight: true,
        }
    }
    toggleLeftPane = (e) => this.setState({showLeft: !this.state.showLeft})
    toggleRightPane = (e) => this.setState({showRight: !this.state.showRight})
    render() {
        const prov = this.props.provider

        const treeActions = this.props.treeActions.map((act,i)=> this.makeTreeAction(act,i))

        const mainView = this.props.mainView

        return <GridLayout showLeft={this.state.showLeft}
                           showRight={this.state.showRight}
        >

            <Toolbar left top>
                <label>{prov.getTitle()}</label>
            </Toolbar>
            <Panel scroll left>
                <TreeTable root={prov.getSceneRoot()} provider={prov}/>
            </Panel>
            <Toolbar left bottom>{treeActions}</Toolbar>



            <Toolbar center top>
                {this.props.viewActions}
            </Toolbar>
            <Panel center middle scroll>{mainView}</Panel>
            <Toolbar center bottom>
                <button className={'fa' + (this.state.showLeft ? ' fa-caret-left' : ' fa-caret-right')}
                        onClick={this.toggleLeftPane}/>
                <Spacer/>
                {/*<HToggleGroup list={this.state.provider.getTools()}*/}
                {/*template={ToggleTemplate}*/}
                {/*selected={this.state.selectedTool}*/}
                {/*onChange={(tool)=> {*/}
                {/*this.setState({selectedTool:tool})*/}
                {/*}}*/}
                {/*/>*/}
                <button className={'fa' + (this.state.showRight ? ' fa-caret-right' : ' fa-caret-left')}
                        onClick={this.toggleRightPane}/>
            </Toolbar>

            <Toolbar right top>
                <label>selected item</label>
            </Toolbar>


            <Toolbar right bottom>
                <label>some random extra stuff here</label>
            </Toolbar>

            <Panel scroll right>
                <PropSheet provider={this.props.provider}/>
            </Panel>

        </GridLayout>
    }
    makeTreeAction(action, i) {
        let onclick = action.fun
        if(action.type === 'menu') {
            onclick = (e)=>PopupManager.show(<MenuPopup actions={action.actions}/>,e.target)
        }
        return <button key={i} onClick={onclick}><i  className={'fa fa-' + action.icon}/> {action.title}</button>
    }
}
