# Crawler - Chunk by Chunk GET Request

Asynchronously reading a list of URLs in a file (.csv, .txt, etc.) with the desired number (50, 100 etc.)
The request is made and the response is returned to the POSTGRES database.

NOTE: For a specific XML format;
Clear All URLs There is also a Save as .csv file feature.

## Used Library (Requirements)

    require('express'),
    require('request'),
    require('fs'),
    require('pg'),
    require('sql'),
    require('line-by-line'),
    require('xml2js');
  
  ## Run
  
    node app.js
  
  ## Project Development Steps

* Read the number of URLs requested from the file. ✅
* Assigning URLs in weaving lines to a clear array with REGEX. ✅
* Request a GET asynchronously to this URL list. ✅
* From the corresponding response, save the information to which the requested 
  pages are redirected, the requested URL, and the request time to the table in the corresponding postgres database. ✅
