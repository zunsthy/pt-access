// page.js
//"use strict"

let api = '/api',
    log = console.log.bind(console),
    obj2qs = obj => Object.keys(obj).filter(key => key in obj).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`).join('&'),
    mergeObj = (target, ...sources) => {
      if(!target instanceof Object){
        target = {};
      }
      sources.forEach(source => {
        for(let key in source){
          target[key] = source[key];
        }
      });
      return target;
    };
    
let requestJSON = (method, _url, params, _data) => new Promise((resolve, reject) => {
  let xhr = new XMLHttpRequest(),
      data = _data ? JSON.stringify(_data) : '',
      url = _url + (params ? '?' + obj2qs(params) : '');
      
  xhr.onreadystatechange = () => {
    if(xhr.readyState === 4){
      if(xhr.status === 200){
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(xhr.status);
      }
    }
  };
  
  if(method === 'POST'){
    xhr.open('POST', url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("Content-length", data.length);
    xhr.send(data);
  } else {
    xhr.open('GET', url, true);
    xhr.send();
  }
});
let getRequest = (url, params) => requestJSON('GET', url, params);
let postRequest = (url, data, params) => requestJSON('POST', url, params, data);

let getList = () => getRequest(api, {action: 'list'}); 
let setData = data => getRequest(api, mergeObj({action: 'set'}, data));
let tryLogin = site => getRequest(api, {action: 'try', site: site}); 
let tryLoginAll = () => getRequest(api, {action: 'all'});


let ninfoLine = (name, site) => {
  let npath = (key, value) => `
<div class="path path-${key}">
  <div class="title">
    <span>${key}</span>
  </div>
  <div class="url">
    <input type="text" value="${value}" />
  </div>
</div>
  ` ;
  let nprivate = (key, value) => `
<div class="privates private-${key}">
  <input type="text" placeholder="${key}" value="${value}" />
</div>    
  ` ;
  let disable = site.enable ? '' : 'disable';
  
  let paths = Object.keys(site.paths).map(key => npath(key, site.paths[key])).join('');
  let config = site.legacy ? site.legacy : (site.download ? site.download : {});
  let privates = Object.keys(config).map(key => nprivate(key, config[key])).join('');
  
  let line = `
<div class="line">
  <div class="line-container">
    <div class="row overview">
      <div class="item info">
        <div class="sitename">
          ${name}
        </div>
        <div class="method">
          ${site.method}
        </div>
      </div>
      <div class="space"></div>
      <div class="item operate">
        <div class="status">
          <div class="access">
            <div class="btn"></div>
          </div>
          <div class="edit">
            <div class="btn"></div>
          </div>
          <div class="enable">
            <div class="btn ${disable}"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="details hide">
      <div class="paths">
        ${paths}
      </div>
      <div class="privates">
        ${privates}
      </div>
      <div class="operate">
      </div>
    </div>
  </div>
</div>  
  ` ;
  
  return line;
};

let npageHeader = () => {
  let header = `
<div class="header-container">
  <div class="title">
    <h3>PT Access</h3>
  </div>
  <div class="operate">
    <div class="sync-all">
      <div class="btn">
      </div>
    </div>
  </div>
</div>  
  `;
  return header;
};


let config,
    timerList = [];

getList()
.then(data => Object.keys(data).map(key => ninfoLine(key, data[key])).join(''))
.then(html => {
  document.getElementsByTagName('main')[0].innerHTML = html;
  document.getElementsByTagName('header')[0].innerHTML = npageHeader();
});
