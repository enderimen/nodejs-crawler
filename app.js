var express = require('express'),
    request = require('request'),
    app = express(),
    port = 3000,
    { Pool } = require('pg'),
    sql = require('sql'),
    lineByLineReader = require('line-by-line');

app.set('view engine', 'pug');

app.use('/public', express.static('public'));

// CORS error (solve)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// initial assignments
var pool        = "",
    regexArray  = "",
    file        = 'm-emlakjet-com.csv',
    codes       = [], // status codes
    filtered    = [],
    count       = 0,
    lineNumber  = 0,  
    chunkSize   = 5,
    totalLine   = 0;  // line by line

app.get('/', (req, res) => {
    
    codes       = []; //
    pool        = "";
    regexArray  = "";
    codes       = []; // status codes
    filtered    = [];
    count       = 0;
    lineNumber  = 0;
    totalLine   = 0;

    try {
    
        // read file (Sync)
        lr = new lineByLineReader(file);

        // Read file error handle
        lr.on('error', function (err) {
            console.log("Error: ", err);
        });

        // line by line read
        lr.on('line', ( url ) => {
            
            // read next line
            lr.resume();
            
            // regex url
            regexArray = regexControl(url);

            // null control
            if(regexArray != null && regexArray.length > 0) {
                count++;   // chunk size (control)
                totalLine++; // total line number
                filtered.push(regexArray[0]); // add url to filtered array
            }
            
            // chunk by chunk
            let promise = new Promise((resolve, reject) => {

                // chunk control
                if(count == chunkSize) {

                    // reading stoped
                    lr.pause();
                    
                    console.log("****************");

                    // GET Request
                    requestPromise(req, res, filtered);
                    
                    // reset
                    filtered = [];
                    count = 0;
                    
                    resolve("stoped!");
                    
                    // reading resume
                    lr.resume();

                }else {
                    reject("Fail");
                }
            });
            
            // promise result
            promise.then( (res) => {
                //console.log("Result: ", res);
            }).catch( (err) => {
                //console.log("Promise Result: ", err);
            });
        });
        
        // All lines are read, file is closed now.
        lr.on('end', function () {
            
            lr.close();

            // Example; chunk: 5, line number: 7 (5 | 2)

            if(totalLine % chunkSize != 0) {  
                requestPromise(req, res, filtered); // 2 line
            }
        });

    } catch (error) {
        console.log("File not exist!", error);
    }
});

// GET Request
let requestPromise = (req, res, filtered) => {
        
    return new Promise((resolve, reject) => {

        if(resolve != null){

            filtered.forEach(url => {

                console.log("Request: ", url);

                request({   url: url,
                            followRedirect: false,
                            headers: {
                                'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; http://www.google.com/bot.html)'                                
                            }}, (error, response, body) => {
                            console.log(JSON.stringify(req.headers));
                            if(response != null) {
                                check(req, res, {
                                    statusCode: response && response.statusCode,
                                    url: url,
                                    redirect: response.headers.location
                                });
                            }
                });
            });
        }
    });

};

// overflow control
var check = (req, res, item ) => {

    // id (for table)
    lineNumber++; 

    // GET request to selected URL
    var response = {
                        "status_code" : item.statusCode,
                        "url": item.url,
                        "request_time": getRequestTime(),
                        "redirect_url": item.redirect,
                        "url_id": lineNumber,
                    };

    codes.push(response); // add to codes array
    
    if(totalLine == lineNumber) {
        done(req, res, codes);
    }
}

// all datas saved to DB.
var done = (req, res, result) => {

    console.log(result);

    // DB connect
    let dataFormat = sql.define({
        name: 'url',
        columns: [
            'status_code',
            'url',
            'request_time',
            'redirect_url',
            'url_id'
        ]
    });

    try {

        // DB connection string
        pool = new Pool({
            host: 'localhost',
            user: 'root',
            password: '123',
            database: 'notfound',
            max: 20
        });
        
        //Connection Opened
        pool.connect();

        // Bulk insert
        //let query = dataFormat.insert(result).returning(dataFormat.url_id).toQuery();
        //console.log(query);

        //let rows = pool.query(query);
        console.log("Rows Affected!");
        
    }catch(e) {
        console.log("Query not created!", e);
    }finally{
        // Connection Closed
        pool.end();
    }

    res.end();
}

// Regex control (http or http url) 
var regexControl = (data) => {

    let regex = /(https?:\/\/[^\s:,]+)/gi;

    return data.match(regex);
}

// Request time
var getRequestTime = () => {

    const date = new Date();

    const value =   date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
                    + " -- " + 
                    date.getDate() + "/" + date.getMonth() + "/" + date.getYear();

    return value;
}

// XML file reader
var getXmlReader = (xml) => {

    // read with jackson.
    const ast = XmlReader.parseSync(xml);

}

// Listen port
app.listen(port, function() {
    console.log('listening on 3000');
});