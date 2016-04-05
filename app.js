/* global process */
"use strict"
const fs = require('fs');
const url = require('url');
const path = require('path');
const http = require('http');
const open = require('open');
const querystring = require('querystring');

const log = console.log.bind(console);
const PTAccess = require('./lib/pt-access.js');

let siteConfigFile = './conf/config.json';
let args = process.argv.slice(2);

let siteConfig = require(siteConfigFile),
    method = 'html',// DEBUG 
    silent = true;

args.forEach(arg => {
  let flag = arg.split('=');
  switch(flag[0]){
    case '-s': 
      silent = true;
      break;
    case '--silent':
      silent = flag[1] ? ((flag[1] == 'true') ? true : false) : true;
      break;
    case '--html':
      method = 'html';
      break;
    case '--cli':
      method = 'cli';
      break;
    default: 
      method = 'cli';
      break;
  }
});

if(method === 'html'){
  let rStaticFile = /\/web\//,
      rApi = /\/api/,
      sites = Object.keys(siteConfig).reduce((m, site) => m.set(site, new PTAccess(siteConfig[site])), new Map());
  
  let errorHandle = (code, res) => {
    res.writeHead(code);
    res.end();
  };
  
  let staticFileHandle = (uri, res) => {
    let contentType;
    switch(path.extname(uri)){
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.html':
      default: 
        contentType = 'text/html';
        break;
    }
    
    fs.access(uri, fs.R_OK | fs.R_OK, err => {
      if(err){
        res.writeHead(404);
        res.end();
      } else {
        fs.readFile(uri, (err, content) => {
          if(err){
            res.writeHead(500);
            res.end();
          } else {
            res.writeHead(200, {
              'Content-Type': contentType,
            });
            res.end(content, 'utf-8');
          }
        });
      }
    });
  };
  
  let apiHandle = (params, res) => {
    let contentType = 'application/json';
    if(params.action === 'list'){
      res.writeHead(200, {
        'Content-Type': contentType,
      });
      res.end(JSON.stringify(siteConfig), 'utf-8');
    } else if(params.action === 'set' && !!params.site){
      let site = sites.get(params.site);
      if(!!site){
        if('enable' in params){
          site.enable = params.enable === 'true' ? true : false; 
        }
        if('method' in params){
          // TODO: if method changed, remove old data 
          site.method = params.method.toLowerCase();
        }
        ['username', 'password'].forEach(key => key in params && (site.legacy[key] = params[key]));
        ['passkey', 'id'].forEach(key => key in params && (site.download[key] = params[key]));
        ['blank', 'login', 'index', 'download'].forEach(key => key in params && (site.paths[key] = params[key]));
        
        res.writeHead(200, {
          'Content-Type': contentType,
        });
        fs.writeFile(siteConfigFile, JSON.stringify(siteConfig, null, '\t'), 'utf8', err => {
          if(err){
            res.end(JSON.stringify({ error: err }), 'utf-8');
          } else {
            res.end(JSON.stringify(true), 'utf-8');
          }
        });
      } else {
        errorHandle(400, res);
      }
    } else if(params.action === 'try' && !!params.site){
      let site = sites.get(params.site);
      if(!!site){
        site.tryAccess(cookies => siteConfig[params.site].cookies = cookies)
          .then(status => {
            res.writeHead(200, {
              'Content-Type': contentType,
            });
            res.end(JSON.stringify(status), 'utf-8');
          });
      } else {
        errorHandle(500, res);
      }
    } else if(params.action === 'all'){
      let arr = [];
      sites.forEach((site, name) =>  
        arr.push(site.tryAccess(cookies => siteConfig[name].cookies = cookies)
          .then(status => [name, status])
        )
      );
      Promise.all(arr)
        .then(results => {
          let ret = {};
          results.filter(result => result[1] !== 2).forEach(result => {
            ret[result[0]] = result[1];
          });
          return ret;
        })
        .then(obj => {
          res.writeHead(200, {
            'Content-Type': contentType,
          });
          res.end(JSON.stringify(obj), 'utf-8');
        }).then(() => {
          // TODO: if nothing new   
          // save cookies
          fs.writeFile(siteConfigFile, JSON.stringify(siteConfig, null, '\t'), 'utf-8', err => {
            if(err){
              log(`Error(cannot save session): ${err}`);
            } 
          });
        });
    } else {
      errorHandle(400, res);
    }
  };
  
  let requestListener = (request, response) => {
    if(rStaticFile.test(request.url)){
      staticFileHandle('.' + request.url, response);
    } else if(rApi.test(request.url)){
      apiHandle(querystring.parse(request.url.replace(/^.*\?/, '')), response);
    } else {
      errorHandle(400, response);
    }
  };
  
  let server = http.createServer(requestListener); 
  server.listen(22079, 'localhost');
  
  open('http://localhost:22079/web/index.html');
} else { // if(method === 'cli')
  Promise.all(Object.keys(siteConfig).map(site => {
    let access = new PTAccess(siteConfig[site]);
    return access.tryAccess(cookies => siteConfig[site].cookies = cookies);
  }))
  .then((status) => {
    fs.writeFile(siteConfigFile, JSON.stringify(siteConfig, null, '\t'), 'utf8', (err) => {
      if(err){
        log(`Error(cannot save session): ${err}`);
      } 
      log(`All done`);  
    });
  });
}
