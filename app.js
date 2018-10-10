const express = require('express');
const fs = require('fs');
const request = require('sync-request');

const app = express();
const port = 3000;

app.set('view engine', 'pug');

app.use('/public', express.static('public'))

// CORS error (solve)
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', (req, res) => {

    var codes = []; // for status codes
    var codesTotal = [];
    var file = 'd-emlakjet-com.csv';

    var content = fs.readFileSync(file, 'utf8').toString().split("\n"); // line by line
    
    var notFoundTotal = 0;
    var redirectTotal = 0;
    var okTotal = 0;
    var serverErrorTotal = 0;
    var serverUnavailableTotal = 0;
    var badGatewayTotal = 0;

    content = content.map(x => controlRegex(x)); // apply the regex filter
    content = content.filter(x => !!x); // not null fields
    content = content.map(x => x[0]); // url
    console.log("Please wait! Loading...");
    // all url and status codes
    content.forEach(function(item) {

        let value = getTime();
        
        let statusCode = requestUrl(item);

        if(statusCode == '404')
            notFoundTotal++;
        else if(statusCode == '301')
            redirectTotal++;
        else if(statusCode == '200')
            okTotal++;
        else if(statusCode == '501')
            serverErrorTotal++;
        else if(statusCode == '502')
            badGatewayTotal++;
        else if(statusCode == '503')
            serverUnavailableTotal++;

        var res = {"statusCode" : statusCode, "time": value, "url": item}; // GET request to selected URL

        codes.push(res); // add to codes array

        console.log(statusCode);
    });
  
    console.log(codes);

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

    res.end();
});

// regex control (http or https url) 
var controlRegex = (data) => {

    let regex = /(https?:\/\/[^\s:,]+)/gi;

    return data.match(regex);
}

// GET request (returned value: status code)
var requestUrl = (url) => {

    let response = request('GET', url);
    
    return response.statusCode;
};

// Request time
var getTime = () => {

    const date = new Date();

    const value =   date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
                    + " -- " + 
                    date.getDate() + "/" + date.getMonth() + "/" + date.getYear();

    return value;
}

app.listen(port, function() {
    console.log('listening on 3000');
});