export function parseOptions(opts) {
    let loc = document.location
    if (loc.search) {
        const parts = loc.search.substring(1).split('&')
        parts.forEach((part)=>{
            const keyval = part.split('=')
            opts[keyval[0]] = keyval[1]
        })
    }
    return opts;
}

export function genID(prefix) {
    return `${prefix}_${Math.floor(Math.random() * 10000)}`
}
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
    console.log("POSTING",path,typeof payload);
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


