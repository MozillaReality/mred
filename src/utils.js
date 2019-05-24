export function parseOptions(opts) {
    let loc = document.location
    if (loc.search) {
        const parts = loc.search.substring(1).split('&')
        parts.forEach((part)=>{
            const keyval = part.split('=')
            opts[keyval[0]] = keyval[1]
        })
    }
    // console.log(opts)
    // if(typeof opts.switcher === 'string') {
    //     console.log("parsing switcher")
    // }
    return opts;
}


export const on = (elem,type,cb) => elem.addEventListener(type,cb)
export const $ = (sel) => document.querySelector(sel)

export function genID(prefix) {
    return `${prefix}_${Math.floor(Math.random() * 10000)}`
}

export function toFlatString(obj) {
    return JSON.stringify(obj)
}

/*
export function GET_JSON(path, cb) {
    return new Promise((res,rej) => {
        console.log("fetching",path);
        const req = new XMLHttpRequest()
        req.onreadystatechange = function() {
            // console.log("got",req.readyState, req.status)
            if(req.readyState === 4) {
                if(req.status === 200) return res(JSON.parse(req.responseText));
                //if anything other than 200, reject it
                rej(req)
            }
            if(req.status === 500) rej(req);
            if(req.status === 404) rej(req);
        };
        req.open("GET",path,true);
        req.send();
    });
}


export function POST_JSON(path, payload) {
    // console.log("POSTING",path,payload);
    return new Promise((res,rej)=>{
        const req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if(req.readyState === 4 && req.status === 200) {
                try {
                    res(JSON.parse(req.responseText));
                } catch(e) {
                    rej(e);
                }
            }
            if(req.status === 500) rej(req);
            if(req.status === 404) rej(req);
        };
        req.onerror = (e) => rej(e);
        req.open("POST",path,true);
        req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        if(typeof payload === 'string') {
            req.send(payload)
        } else {
            req.send(JSON.stringify(payload));
        }
    })
}
 */


export function makePoint(x,y) {
    return {
        x:x,
        y:y,
        minus: function(pt) {
            return makePoint(this.x-pt.x, this.y-pt.y);
        },
        add: function(pt) {
            return makePoint(this.x+pt.x, this.y+pt.y);
        },
        divide: function(v) {
            return makePoint(this.x/v,this.y/v)
        },
        multiply: function(v) {
            return makePoint(this.x*v,this.y*v)
        },
        idivide: function(v) {
            return makePoint(
                Math.floor(this.x/v),
                Math.floor(this.y/v)
            )
        },
        floor: function() {
            return makePoint(
                Math.floor(this.x),
                Math.floor(this.y)
            )
        },
        distance(pt) {
            const dx = pt.x-this.x;
            const dy = pt.y-this.y;
            return Math.sqrt(dx*dx+dy*dy)
        },
        equals(pt) {
            return pt.x === this.x && pt.y === this.y
        },
        toString() {
            return `(${x},${y})`
        }
    }
}

//use only capital letters, 65->90
export function genAlphaID(count) {
    let id = ""
    for(let i=0; i<count; i++) {
        id += String.fromCharCode(65 + Math.floor(Math.random() * (90 - 65)))
    }
    return id
}

export function setQuery(obj) {
    const oldOpts = parseOptions({})
    const final = {}
    Object.keys(oldOpts).forEach(key=> final[key] = oldOpts[key])
    Object.keys(obj).forEach(key=> final[key] = obj[key])
    const query = Object.keys(final).map((key)=>`${key}=${final[key]}`).join('&')
    window.history.pushState(obj,'a title','?'+query)
}
export function toQueryString(obj) {
    return Object.keys(obj).map((key)=>`${key}=${obj[key]}`).join('&')
}


export function shallowCopy(obj) {
    const out = {};
    Object.keys(obj).forEach((key) => out[key] = obj[key])
    return out;
}
