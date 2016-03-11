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
<div class="row path path-${key}">
  <div class="item title">
    <span>${key}</span>
  </div>
  <div class="item url">
    <input type="text" value="${value}" />
  </div>
</div>
  ` ;
  let nprivate = (key, value) => `
<div class="item private private-${key}">
  <input type="text" placeholder="${key}" value="${value}" />
</div>    
  ` ;
  let disable = site.enable ? '' : 'disable';
  
  let paths = Object.keys(site.paths).map(key => npath(key, site.paths[key])).join('');
  let config = site.legacy ? site.legacy : (site.download ? site.download : {});
  let privates = Object.keys(config).map(key => nprivate(key, config[key])).join('');
  
  let line = `
<div class="line" id="site-${name.toLowerCase()}">
  <div class="line-container">
    <div class="row overview alone">
      <div class="item row info">
        <div class="item sitename">
          ${name}
        </div>
        <div class="item method">
          ${site.method}
        </div>
      </div>
      <div class="space"></div>
      <div class="item row operate">
        <div class="item access">
          <div class="btn"></div>
        </div>
        <div class="item edit">
          <div class="btn"></div>
        </div>
        <div class="item enable">
          <div class="btn ${disable}"></div>
        </div>
      </div>
    </div>
    <div class="details ${disable ? 'hide' : ''} alone">
      <div class="paths alone">
        ${paths}
      </div>
      <div class="flow privates alone">
        ${privates}
      </div>
      <div class="operate alone">
      </div>
    </div>
  </div>
</div>  
<hr></hr>
  ` ;
  
  return line;
};

let npageHeader = () => {
  let header = `
<div class="header">
  <div class="row header-container">
    <div class="item title">
      <h3>PT Access</h3>
    </div>
    <div class="item row operate">
      <div class="item sync-all">
        <div class="btn">
        </div>
      </div>
    </div>
  </div>  
</div>
  `;
  return header;
};

let npageNav = sites => {
  let nlink = id => `
<div class="item link-brick">
  <a class="link" href="#site-${id.toLowerCase()}">
    ${id}
  </a>
  <span class="remove">&times;</span>
</div>
  `;
  let nav = `
<div class="nav">
  <div class="flow nav-container alone">
    ${sites.map(nlink).join('')}
  </div>
</div>  
  `;
  console.log(sites);
  return nav;
};


let sites,
    timerList = [];
    
// TODO: local filter 
let siteFilter = () => true;

getList()
.then(data => sites = data)
.then(data => Object.keys(data).map(key => ninfoLine(key, data[key])).join(''))
.then(html => {
  document.getElementsByTagName('main')[0].innerHTML = html;
  document.getElementsByTagName('header')[0].innerHTML = npageHeader();
  document.getElementsByTagName('nav')[0].innerHTML = npageNav(Object.keys(sites).map(name => name));
});
