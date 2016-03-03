"use strict"
const fs = require('fs');
const http = require('http');
const https = require('https');
const querystring = require('querystring');


const configFile = './config/config.json';
const config = require(configFile);

const log = console.log.bind(console);
const info = console.info.bind(console);
const error = console.error.bind(console);

const hit = (host) => log(`hit "${host}"`);
const fail = (host) => info(`Info: failed to login "${host}"`);

const extend = (target, source) => {
  for(let prop in source){
    target[prop] = source[prop];
  }
  return target;
};
const matchCookie = (str) => str.match(/([^=]+)=([^;]+)/).slice(1);
const encodeCookies = (obj) => Object.keys(obj).filter((key) => key in obj).map((key) => `${key}=${encodeURIComponent(obj[key])}`).join('; ');
const decodeCookies = (arr) => {
  let cookies = {};
  arr.forEach((item) => {
    let kv = matchCookie(item);
    cookies[kv[0]] = decodeURIComponent(kv[1]);
  });
  return cookies;
};
const receiveData = (res, callback) => {
  let data = ''; 
       
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    callback({
      data: data,
      statusCode: res.statusCode,
      headers: res.headers,
    });
  });
};
const sendData = (method, info, path, cookies, data, otherHeaders) => new Promise((resolve, reject) => {
  let options = {
        method: method.toUpperCase(),
        protocol: info.protocol,
        host: info.host,
        port: +info.port,
        path: path,
        headers: {
          'Accept': 'text/html',
          'Connection': 'keep-alive',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:44.0) Gecko/20100101 Firefox/44.0'
        },
      },
      postData = querystring.stringify(data),
      req;
  
  if(otherHeaders && typeof otherHeaders === 'object'){
    extend(options.headers, otherHeaders); 
  }
  
  if(method.toUpperCase() === 'POST'){
    extend(options.headers, {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    });
  } else if(method.toUpperCase() === 'GET' && postData.length > 0){
    options.path += `?${postData}`;
  }
 
  if(cookies){
    options.headers['Cookie'] = encodeCookies(cookies);
  }
  
  if(info.protocol === 'http:'){
    req = http.request(options, (res) => receiveData(res, resolve));
  } else {
    req = https.request(options, (res) => receiveData(res, resolve));
  }
  
  req.setTimeout(5000, () => {
    try{
      if(req.socket.socket)
        req.socket.socket.destroy();
      req.destroy();
    } catch(e) { }
    reject(new Error('request timeout'));
  });
  
  req.on('error', reject);
  
  if(method === 'POST'){
    req.write(postData);
  }
  req.end();
});


Promise.all(Object.keys(config).map((site) => new Promise((resolve, reject) => {
  let website = config[site];
  if(website.enable === false){
    resolve();
  } else if(website.method === "password"){
    let login, logon, cookies = {};
    if(website.cookies && JSON.stringify(website.cookies).length > 5){
      login = sendData('GET', website.info, website.paths.index, website.cookies)
        .then((ret) => {
          if(ret.statusCode === 302){
            return false;
          } else {
            throw(false);
          }
        }, (err) => {
          error(`Error: ${err}`);
          throw(err);
        });
    } else {
      login = Promise.resolve(true);
    }

    if(website.legacy){
      logon = login.then(() => sendData('GET', website.info, website.paths.blank))
      .then((ret) => {
        if(ret.headers['set-cookie'] && ret.headers['set-cookie'].length){
          cookies = decodeCookies(ret.headers['set-cookie']);
        }
      })
      .then(() => sendData('POST', website.info, website.paths.login, cookies, website.legacy, {
        'Referer': `${website.info.protocol}//${website.info.host}:${website.info.port}${website.paths.blank}`
      }))
      .then((ret) => {
        let _cookies;
        if(ret.statusCode === 200){
          throw(true);
        } else if(ret.statusCode === 302){
          if(ret.headers['set-cookie'] && ret.headers['set-cookie'].length){
            _cookies = decodeCookies(ret.headers['set-cookie']);
          }
          extend(cookies, _cookies);
        } else {
          throw(ret.statusCode);
        }
      })
      .then(() => sendData('GET', website.info, website.paths.index, cookies))
      .then(() => {
        throw(false);
        website.cookies = cookies;
      })
    } else {
      logon = login.then(() => Promise.reject(true));
    }
    logon.catch((err) => err ? fail(website.info.host) : hit(website.info.host))
      .then(resolve);
  } else if(website.method === "passkey"){
    sendData('GET', website.info, website.paths.download, null, website.download)
      .then((ret) => { 
        return ret.statusCode === 200 && /^d8:announce/.test(ret.data) ? Promise.resolve() : Promise.reject(ret.statusCode);
      }, (err) => Promise.reject(err))
      .then(() => hit(website.info.host), (err) => fail(website.info.host))
      .then(resolve);
  } else {
    resolve();
  }
})))
.then(() => fs.writeFile(configFile, JSON.stringify(config, null, '\t'), 'utf8', (err) => {
  if(err){
    error(`Error(cannot save session): ${err}`);
  } else {
    log(`All done`);
  }
}));
