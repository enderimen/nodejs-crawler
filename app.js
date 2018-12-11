// Modules
var express = require('express'),
    request = require('request'),
    fs      = require('fs'),
    app     = express(),
    port    = 3000,
    {Pool}  = require('pg'),
    sql     = require('sql'),
    lineByLineReader = require('line-by-line'),
    xmlReader = require('xml2js').parseString;

// pug engine (UI)
app.set('view engine', 'pug');

// .css, .js .etc files access permission (only public/ folder)
app.use('/public', express.static('public'));

// CORS error (solve)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// initial assignments
{
    var pool        = "", // postgre define
        regexArray  = "",

        file        = 'sample.csv', // file name
        
        codes       = [],   // list of data to be saved to db
        filtered    = [],   // regexed urls
        
        count       = 0,    // chunk control
        chunkSize   = 2,    // part 
        totalLine   = 0,    // total line number
        id          = 1,    // url id (auto increment)
        
        lineReader  = null; 

    // User Agent
    var MobileGoogleBot  = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        DesktopGoogleBot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

}

// Read file (.xml, .csv) and request
let readFile = (file, filtered) => {

    // read file (Sync)
    lineReader = new lineByLineReader(file);

    // Read file error handle
    lineReader.on('error', (err) => {
        console.log("Error: ", err);
    });
   
    // line by line read
    lineReader.on('line', ( url ) => {
        
        lineReader.resume();

        // regex url
        regexArray = regexControl(url);
        
        // null control
        if(regexArray != null && regexArray.length > 0) {

            count++;   // chunk size (control)
            totalLine++; // total line number
            filtered.push(regexArray[0]); // add url to filtered array

        }

        if(count == chunkSize) {

            lineReader.pause();
            
            getRequest(filtered, chunkSize).then((result) => {
        
                console.log("*********"+ result +"**********");
                
                done(codes);
        
                // reset
                filtered  = [];
                count     = 0;

                if(totalLine % chunkSize == 0){
                    codes = [];
                }
                
                console.log("Total Line Number :", totalLine);
                
                lineReader.resume();
        
            }).catch(() => {
                console.log("Request error: ");
            });
        }
        
    });
    
    // All lines are read, file is closed now.
    lineReader.on('end', () => {

        if(totalLine % chunkSize != 0) {

            chunkSize = totalLine % chunkSize;

            getRequest(filtered, chunkSize).then((result) => {
        
                console.log("*********"+ result +"**********");
                
                done(codes);
        
                // reset
                filtered  = [];
                count     = 0;

                console.log("Total Line Number :", totalLine);
                
                lineReader.close();

                process.exit(1);
        
            }).catch((error) => {
                console.log("Request error: ", error);
            });
        }        
    });
}

// process start
try {
    readFile(file, filtered);
} catch (error) {
    console.log("File not exist!", error);
}

// GET Request
var getRequest = (filtered, chunkSize) => {

    return new Promise((resolve, reject) => {
    
        var callbackControl = 0;

        console.log('Filtered: ', filtered);
        
        filtered.forEach( url => {
            
            agent = chooseUserAgent(url);
            
            request({   url: url,
                        followRedirect: false,
                        headers:{ 'User-Agent': agent }}, (error, response) => {
                        
                        if(response != null) {
                            
                            var response = {
                                "status_code" : response && response.statusCode,
                                "url": url,
                                "request_time": getRequestTime(),
                                "redirect_url": response.headers.location,
                                "url_id": id++
                            };
                            
                            console.log("status", response.status_code, response.url);
                            
                        }

                        if(response != null) {
                            codes.push(response);
                        }
                        
                        callbackControl++;
                        
                        if(callbackControl == chunkSize) {
                            
                            resolve("Chunk Completed!");

                        }
            });

        });
    });
}

// all datas saved to DB.
var done = (result) => {

    console.log(result);

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

        // Bulk insert
        // let query = dataFormat.insert(result).returning(dataFormat.url_id).toQuery();
        // console.log(query);

        // pool.query(query);
        console.log("Rows Affected!");
        
    }catch(e) {
        console.log("Query not created!", e);
    }finally{
        // Connection Closed
        pool.end();
    }
}

// Regex control (http or https url) 
var regexControl = (data) => {

    let regex = /(https?:\/\/[^\s:,]+)/gi;

    return data.match(regex);
}

// get request time
var getRequestTime = () => {

    const date = new Date();

    const time =   date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
                    + " -- " + 
                    date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear();

    return time;
}

// Choose user agent
var chooseUserAgent = (url) => {
    
    var agent   = "",
        temp    = "",
        agentControl    = /(\/\/m+)/gi; // if mobile url: (http(s)://m.example.com) return: m

    temp = (url.match(agentControl) != null) ? url.match(agentControl)[0] : null;
    
    if(temp) {
        // mobile/desktop url control
        agent = temp.substring(2,3);
    }

    // if the url is mobile or desktop, select the relevant googlebot agent.
    agent = ( agent == 'm' ) ? MobileGoogleBot : DesktopGoogleBot;

    return agent;
}

// XML file reader
var getXmlReader = (xmlFile) => {
    
    
    fs.readFile(xmlFile, 'utf-8', (err, data) => {

        if(err) console.log(err);

        let xmlArray    = [],
            xmlUrl      = "";
        
        // we then pass the data to our method here
        xmlReader(data, (err, result) => {

            if(err) console.log("File Error: ", err);
            
            result.products.urun.forEach(index => {

               // here we log the results of our xml string conversion
                xmlUrl = index.urun_url[0];
                xmlArray.push(xmlUrl + '\r\n');
                console.log(xmlUrl);
            });
        });

        // create .csv file and write all result.
        fs.writeFile('sample.csv', xmlArray, function(err) {
            
            if(err) console.log(err);
        
            console.log("The file was saved!");
        }); 
    });
}
// if use, clear comment 
// getXmlReader('sample.xml');

// Listen port
app.listen(port, () => {
    console.log('listening on 3000');
});
