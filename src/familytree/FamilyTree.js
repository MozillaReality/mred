import {} from 'dagre-d3'
import TreeItemProvider from '../TreeItemProvider'
import {genID} from '../utils'

const example = {
    type:'root',
    title:'my family tree',
    children:[
        {
            type:'person',
            id:genID('person'),
            name:'Bob',
            parents:['bobsr_id']
        },
        {
            type:"person",
            id:genID('person'),
            name:'Bob Sr',
            parents:[]
        }
    ]
}
export default class FamilyTree extends TreeItemProvider {

}