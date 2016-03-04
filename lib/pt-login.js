"use strict"

const http = require('http');
const https = require('https');
const querystring = require('querystring');

const log = console.log.bind(console);

const merge = (target, source) => {
  for(let prop in source){
    target[prop] = source[prop];
  }
  return target;
};

const getCookieKV = str => (kv => ({[decodeURIComponent(kv[0])]: decodeURIComponent(kv[1])}))(str.match(/([^=]+)=([^;]+)/).slice(1));
const encodeCookies = obj => Object.keys(obj).filter(key => key in obj).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`).join('; ');
const decodeCookies = arr => arr.reduce((obj, item) => merge(obj, getCookieKV(item)), {});
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
    merge(options.headers, otherHeaders); 
  }
  
  if(method.toUpperCase() === 'POST'){
    merge(options.headers, {
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

class PTLogin {
  constructor(website, hit, fail){
    this.enable = website.enable;
    this.method = website.method;
    
    this.info = website.info;
    this.paths = website.paths;
    this.cookies = website.cookies;
    this.legacy = website.legacy;
    this.download = website.download;
    
    this.hit = () => {
      if(hit && hit instanceof Function){
        hit(this.info.host);
      } else {
        log(`hit "${this.info.host}"`);
      }
      return 0;
    };
    this.fail = (err) => {
      if(fail && fail instanceof Function){
        fail(this.info.host, err);
      } else {
        if(err === true){
          log(`Failed to access "${this.info.host}"`);
        } else {
          log(`Failed to access "${this.info.host}": ${err}`);
        }
      }
      return -1;
    }
  }
  
  _useCookie(cookies){
    return sendData('GET', this.info, this.paths.index, cookies)
      .then(ret => {
        if(ret.statusCode === 302){
          throw(true);
        } else if(ret.statusCode === 200){
          return true;
        } else {
          throw(ret.statusCode);
        }
      });
  }
  
  _usePassword(){
    let cookies;
    return sendData('GET', this.info, this.paths.blank)
      .then(ret => {
        cookies = (ret.headers['set-cookie'] && ret.headers['set-cookie'].length) ? decodeCookies(ret.headers['set-cookie']) : {};
      })
      .then(() => sendData('POST', this.info, this.paths.login, cookies, this.legacy, {
        'Referer': `${this.info.protocol}//${this.info.host}:${this.info.port}${this.paths.blank}`
      }))
      .then(ret => {
        if(ret.statusCode === 200){
          throw(true);
        } else if(ret.statusCode === 302){
          if(ret.headers['set-cookie'] && ret.headers['set-cookie'].length){
            this.cookies = merge(cookies, decodeCookies(ret.headers['set-cookie']));
          }
        } else {
          throw(ret.statusCode);
        }
      })
      .then(() => this._useCookie(cookies));
  }
  
  _usePasskey(){
    return sendData('GET', this.info, this.paths.download, null, this.download)
      .then(ret => ret.statusCode === 200 && /^d8:announce/.test(ret.data) ? Promise.resolve() : Promise.reject(ret.statusCode === 200 ? ret.data : ret.statusCode));
  }
  
  tryAccess(setCookieCallback){
    if(!this.enable){
      return Promise.resolve(true); 
    } else if(this.method === 'passkey'){
      return this._usePasskey()
        .then(this.hit, this.fail);
    } else if(this.method === 'password'){
      let tryAccess;
      if(this.cookies){
        tryAccess = this._useCookie(this.cookies);
      } else {
        tryAccess = Promise.reject(true);
      }
      return tryAccess.catch(() => this._usePassword())
        .then(() => setCookieCallback(this.cookies))
        .then(this.hit, this.fail);
    } else if(this.method === 'cookie'){
      if(this.cookies){
        return this._useCookie(this.cookies)
        .then(this.hit, this.fail);
      } else {
        return Promise.resolve(1);
      }
    } else {
      return Promise.resolve(1);
    }
  }
}

module.exports = PTLogin;
