/*

web audio ndoes
 */


export const ADSR_template = {
    title:'envelope',
    inputs: {
        input: {
            type:'pipe'
        },
        attack: {
            type:'number',
            default:0.3,
        },
        decay: {
            type:'number',
            default:0.5
        },
        sustain: {
            type:'number',
            default: 0.5
        },
        release: {
            type:'number',
            default: 0.5
        }
    },
    outputs: {
        output: {
            type:'pipe'
        }
    }
}