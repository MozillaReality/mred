//import sum from './sum';

import VREditor from './VREditor'
import ScriptManager from './ScriptManager'
import {ConsoleLogger} from '../syncgraph/PubnubSyncWrapper'

it('finds scene children', () => {
    const mgr = new ScriptManager({},new ConsoleLogger())
    expect(mgr.isRunning()).toEqual(false)
});
