// page.js
//"use strict"

let api = '/api',
    _prefix = '_pt_access__',
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

let getLocalValue = key => JSON.parse(localStorage.getItem(_prefix + key) || 'null');
let setLocalValue = (key, value) => localStorage.setItem(_prefix + key, JSON.stringify(value || ''));
    
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
  <div class="space url">
    <input type="text" value="${value}" />
  </div>
</div>
  ` ;
  let nprivate = (key, value) => `
<div class="item private private-${key}">
  <input type="text" placeholder="${key}" value="${value}" />
</div>    
  ` ;
  let disable = site.enable ? '' : 'disabled';
  
  let paths = Object.keys(site.paths).map(key => npath(key, site.paths[key])).join('');
  let config = site.legacy ? site.legacy : (site.download ? site.download : {});
  let privates = Object.keys(config).map(key => nprivate(key, config[key])).join('');
  
  let line = `
<div class="line" id="site-${name.toLowerCase()}" data-site-name="${name}">
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
        <div class="item access" title="Access">
          <div class="btn"></div>
        </div>
        <div class="item edit" title="Edit">
          <div class="btn"></div>
        </div>
        <div class="item enable" title="${disable ? 'Enable' : 'Disable'}">
          <div class="btn ${disable}"></div>
        </div>
      </div>
    </div>
    <div class="details hide alone">
      <div class="paths alone">
        ${paths}
      </div>
      <div class="flow privates alone">
        <div class="item">
        ${privates}
        </div>
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
    <div class="space"></div>
    <div class="item row operate">
      <div class="item sync-all" title="Access ALL">
        <div class="btn">
        </div>
      </div>
    </div>
  </div>  
</div>
  `;
  return header;
};

let npageNav = names => {
  let nlink = id => `
<div class="item link-brick" data-site="${id}">
  <a class="link" href="#site-${id.toLowerCase()}">
    ${id}
  </a>
  <span class="remove">&times;</span>
</div>
  `;
  let nav = `
<div class="nav">
  <div class="flow nav-container alone">
    ${names.map(nlink).join('')}
  </div>
</div>  
  `;
  log(names);
  return nav;
};


let bindEvent4Header = () => {
};

let bindEvent4Nav = () => Array.prototype.forEach.call(document.querySelectorAll('.link-brick'), item => {
  let sitename = item.dataset['site'], 
      bremove = item.querySelector('.remove'),
      sitediv = document.querySelector(`#site-${sitename.toLowerCase()}`),
      sitehr = sitediv ? sitediv.nextElementSibling : undefined;
      
  bremove.addEventListener('click', e => {
    sitediv && sitediv.classList.toggle('hide');
    sitehr && sitehr.classList.toggle('hide');
    
    item.classList.toggle('removed');
  });
});

let bindEvent4Line = sites => Array.prototype.forEach.call(document.querySelectorAll('.line'), line => {
  let name = line.dataset['siteName'],
      site = sites[name],
      baccess = line.querySelector('.item.access > .btn'),
      bedit = line.querySelector('.item.edit > .btn'),
      benable = line.querySelector('.item.enable > .btn'),
      details = line.querySelector('.details');
  // log(line, name, baccess, bedit, benable, details);
  baccess.addEventListener('click', e => {
    tryLogin(name)
      .then(data => {
        if(data === true){
          baccess.classList.remove('warning');
          baccess.classList.add('active');
        } else {
          baccess.classList.add('warning');
        }
      });
  });
  bedit.addEventListener('click', e => {
    //e.preventDefault();
    bedit.classList.toggle('active');
    details.classList.toggle('hide');
  });
  
  benable.addEventListener('click', e => {
    setData({
      site: name, 
      enable: benable.classList.contains('disabled'), 
    })
      .then(data => {
        if(data === true){
          benable.classList.toggle('disabled');
        } else {
          alert(data.error);
        }
      });
  });
});



let sites = {},
    sitesBlocked = getLocalValue('site') || [],
    timerList = [];
    
// TODO: local filter 
let LocalFilter = name => sitesBlocked.indexOf(name) === -1;
//let siteFilter = (name, site) => site.enable && localFilter(name);
let siteFilter = (name, site) => true;

getList()
.then(data => {
  for(key in data){
    if(siteFilter(key, data[key])){
      sites[key] = data[key];
    }
  }
  return sites;
})
.then(data => Object.keys(data).map(key => ninfoLine(key, data[key])).join(''))
.then(html => { // render page
  document.getElementsByTagName('main')[0].innerHTML = html;
  document.getElementsByTagName('header')[0].innerHTML = npageHeader();
  document.getElementsByTagName('nav')[0].innerHTML = npageNav(Object.keys(sites).map(name => name));
})
.then(() => { // bind event
  bindEvent4Line(sites);
  bindEvent4Nav();
});
