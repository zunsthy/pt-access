"use strict"
const fs = require('fs');

const log = console.log.bind(console);

var PTLogin = require('./lib/pt-login.js');

const configFile = './conf/config.json';
const config = require(configFile);

Promise.all(Object.keys(config).map(site => {
  let login = new PTLogin(config[site]);
  return login.tryAccess(cookies => config[site].cookies = cookies);
}))
.then((status) => {
  fs.writeFile(configFile, JSON.stringify(config, null, '\t'), 'utf8', (err) => {
    if(err){
      log(`Error(cannot save session): ${err}`);
    } 
    log(`All done`);  
  });
});
