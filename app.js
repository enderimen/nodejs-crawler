var express = require('express'),
    fs = require('fs'),
    // request = require('sync-request'),
    request = require('request'),
    app = express(),
    port = 3000,
    http = require('http'),
    { Pool } = require('pg');


app.set('view engine', 'pug');

app.use('/public', express.static('public'));

// CORS error (solve)
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var content;
var notFoundTotal = 0,
    redirectTotal = 0,
    okTotal = 0,
    serverErrorTotal = 0,
    serverUnavailableTotal = 0,
    badGatewayTotal = 0,
    pool,
    codes = [], // status codes
    codesTotal = [],
    count = 0;
            
app.get('/', (req, res) => {
    codes = []; // status codes
    codesTotal = [];
    count = 0;
    notFoundTotal = 0;
    redirectTotal = 0;
    okTotal = 0;
    serverErrorTotal = 0;
    serverUnavailableTotal = 0;
    badGatewayTotal = 0;

    try {
        var file = 'm-emlakjet-com.csv';

        content = fs.readFileSync(file, 'utf8').toString().split("\n"); // line by line

        pool = new Pool({
            host: 'localhost',
            user: 'root',
            password: '123',
            database: 'notfound',
            max: 20
        });

        content = content.map(x => controlRegex(x)); // apply the regex filter
        content = content.filter(x => !!x); // not null fields
        content = content.map(x => x[0]); // url
        console.log("Please wait! Loading...");

        console.log('content.length', content.length);
        // all url and status codes
        content.forEach(function(url) {
            request({ url: url, followRedirect: false }, function (error, response, body) {
                
                check(req, res, {
                    statusCode: response && response.statusCode,
                    url: url,
                    redirect: response.headers.location
                });
            });
        });

    } catch (error) {
        console.log("File not exist!", error);
    }
});


function check(req, res, item ){
    console.log(item.statusCode, item.url, count+1);
    if(item.statusCode == '404')
        notFoundTotal++;
    else if(item.statusCode == '301')
        redirectTotal++;
    else if(item.statusCode == '200')
        okTotal++;
    else if(item.statusCode == '501')
        serverErrorTotal++;
    else if(item.statusCode == '502')
        badGatewayTotal++;
    else if(item.statusCode == '503')
        serverUnavailableTotal++;

    var response = {"id": count+1, "statusCode" : item.statusCode, "time": getTime(), "url": item.url, "redirectUrl": item.redirect}; // GET request to selected URL

    codes.push(response); // add to codes array

    count++;
    if(count == content.length){
        done(req, res, codes);
    }
}

function done(req, res, result){

    console.log(result);
    var total = {
        notFoundTotal : notFoundTotal, 
        redirectTotal : redirectTotal, 
        okTotal : okTotal, 
        serverErrorTotal : serverErrorTotal,
        serverUnavailableTotal: serverUnavailableTotal,
        badGatewayTotal: badGatewayTotal
    };

    codesTotal.push(total);

    // send to index file
    res.render('index', {
        title: "Emlakjet - 404 Analysis",
        data: codes,
        total: codesTotal
    });
        
    console.log("Mission Completed!");

    pool.connect((err, client, release) => {
        if (err) {
            return console.error('Error acquiring client', err.stack)
        }

        result.forEach((item) => {

            client.query('INSERT into url(url_id, status_code, url, request_time, redirect_url) VALUES($1, $2, $3, $4, $5)', 
            [item.id, item.statusCode, item.url, item.time, item.redirectUrl], (err, result) => {
                release()
                if (err) {
                return console.error('Error executing query', err.stack)
                }
                console.log(result.rows);
            });
        });
    });

    res.end();
}

// regex control (http or http url) 
var controlRegex = (data) => {

    let regex = /(https?:\/\/[^\s:,]+)/gi;

    return data.match(regex);
}

// Request time
var getTime = () => {

    const date = new Date();

    const value =   date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
                    + " -- " + 
                    date.getDate() + "/" + date.getMonth() + "/" + date.getYear();

    return value;
}

var redirectControl = (url) => {
    
    http.get(url, (response) => {
        
        console.log(response.statusCode);
        console.log(response.headers.location);
        
    });
};

// redirectControl('https://www.emlakjet.com/ilan/5979755');

app.listen(port, function() {
    console.log('listening on 3000');
});