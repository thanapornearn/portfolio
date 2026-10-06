/* demo-kit.js — shared runtime for portfolio demo dashboards.
   - Intercepts the dashboard's data requests (fetch / google.script.run) and answers them
     with simulated data from window.DEMO_DATA generators. The dashboard's own UI code is untouched.
   - Shows a small "simulated data" badge with a link back to the portfolio.
   All numbers are generated with a fixed seed: same output on every load, no real data. */
(function(){
  'use strict';
  var OWNER = 'thanapornearn';
  // ---------- seeded random ----------
  function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; var t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  var D = window.DEMO = {
    rng: rng,
    routes: [],
    /** register a mock endpoint: test(url) -> bool, handler(url, init) -> object (JSON) | string (CSV/text) */
    route: function(test, handler){ D.routes.push({test:test, handler:handler}); },
    gsr: {},           // google.script.run handlers: name -> function(...args) returns value
    owner: OWNER,
    // helpers
    pick: function(r, arr){ return arr[Math.floor(r()*arr.length)]; },
    round: function(n, d){ var k=Math.pow(10,d||0); return Math.round(n*k)/k; },
    csv: function(rows){ return rows.map(function(r){ return r.map(function(v){ v = v==null?'':String(v); return /[",\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }).join(','); }).join('\n'); },
    thMonths: ['', 'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'],
    thMonthsShort: ['', 'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
    branches: ['Branch A','Branch B','Branch C','Branch D','Branch E'],
    branchFactor: [1.22, 1.0, 0.86, 1.08, 0.72]
  };

  // ---------- fetch interception ----------
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  function urlOf(input){ return typeof input === 'string' ? input : (input && input.url) || String(input); }
  window.fetch = function(input, init){
    var url = urlOf(input);
    for (var i=0;i<D.routes.length;i++){
      var r = D.routes[i];
      if (r.test(url, init)) {
        return new Promise(function(res){ setTimeout(res, 180); }).then(function(){
          var body = r.handler(url, init);
          var isText = typeof body === 'string';
          return new Response(isText ? body : JSON.stringify(body), { status:200, headers:{ 'Content-Type': isText ? 'text/csv; charset=utf-8' : 'application/json' } });
        });
      }
    }
    if (/demo\.invalid/.test(url)) return Promise.resolve(new Response('Not available in demo', {status:404}));
    return realFetch ? realFetch(input, init) : Promise.reject(new Error('fetch unavailable'));
  };

  // ---------- google.script.run shim (Apps Script HTML service) ----------
  function makeRunner(success, failure){
    return new Proxy({}, { get: function(_, name){
      if (name === 'withSuccessHandler') return function(fn){ return makeRunner(fn, failure); };
      if (name === 'withFailureHandler') return function(fn){ return makeRunner(success, fn); };
      if (name === 'withUserObject') return function(){ return makeRunner(success, failure); };
      return function(){
        var args = arguments, h = D.gsr[name];
        setTimeout(function(){
          try {
            if (!h) throw new Error('Demo: "'+name+'" is not available in demo mode');
            var out = h.apply(null, args);
            success && success(out);
          } catch(e){ failure ? failure(e) : console.warn(e); }
        }, 160);
      };
    }});
  }
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', { get: function(){ return makeRunner(null, null); }, configurable:true });

  // ---------- badge ----------
  function badge(){
    if (document.getElementById('demoBadge')) return;
    var b = document.createElement('div');
    b.id = 'demoBadge';
    b.setAttribute('role','note');
    b.innerHTML = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#3BD18F;margin-right:7px"></span>'
      + 'DEMO · ข้อมูลจำลอง / Simulated data · © ' + OWNER
      + ' <a href="../index.html#work" target="_top" style="color:#9FE3D0;margin-left:10px;text-decoration:none;font-weight:700">← Portfolio</a>';
    b.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;background:rgba(14,23,38,.92);color:#E6ECF2;'
      + 'font:600 12px/1.2 Inter,"Noto Sans Thai",system-ui,sans-serif;padding:8px 12px;border-radius:999px;'
      + 'box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:auto;max-width:calc(100vw - 24px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', badge); else badge();
})();
