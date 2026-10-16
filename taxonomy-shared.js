/* Shared by taxonomy.html, taxonomy-delirium.html, taxonomy-decision-lab.html and taxonomy-publication.html.
   Each part only acts on elements that exist on the current page. */
(function(){
  var root=document.documentElement;

  // Language switch (all pages). Text exists in English and Chinese: [data-l] pairs in the markup, L(en,zh) in scripts, and
  // data-zh-alt / data-zh-label / data-zh-title for attributes. <html lang> decides which shows. Like the theme, the choice
  // is saved, and the inline script in each page's <head> applies it (or ?lang=en|zh) before the first paint.
  // Scripts that write text listen for the "taxonomy:lang" event and re-render.
  var langBtn=document.querySelector('.lang-toggle');
  var titleEn=document.title,titleZh=root.getAttribute('data-title-zh')||titleEn;
  function isZh(){return /^zh/i.test(root.lang);}
  function L(en,zh){return isZh()?zh:en;}
  function swapAttrs(zh){
    ['alt','aria-label','title'].forEach(function(a){
      var key=a==='aria-label'?'label':a;
      [].forEach.call(document.querySelectorAll('[data-zh-'+key+']'),function(el){
        if(!el.hasAttribute('data-en-'+key)){el.setAttribute('data-en-'+key,el.getAttribute(a)||'');}
        el.setAttribute(a,el.getAttribute(zh?'data-zh-'+key:'data-en-'+key));
      });
    });
  }
  function applyLang(){
    var zh=isZh();
    document.title=zh?titleZh:titleEn;
    swapAttrs(zh);
    if(langBtn){
      langBtn.textContent=zh?'EN':'中文';
      langBtn.setAttribute('lang',zh?'en':'zh-CN');
      langBtn.setAttribute('aria-label',zh?'切换到英文':'Switch to Chinese');
    }
    if(toggle){syncToggle();}
  }
  if(langBtn){
    langBtn.addEventListener('click',function(){
      var next=isZh()?'en':'zh';
      root.lang=next==='zh'?'zh-CN':'en';
      try{localStorage.setItem('taxonomy-lang',next);}catch(e){}
      applyLang();
      document.dispatchEvent(new CustomEvent('taxonomy:lang'));
    });
  }

  // Theme switch (all pages). A choice is saved in localStorage; without one the page follows the system setting.
  // The inline script in each page's <head> applies a saved choice before the first paint, so there is no flash.
  var toggle=document.querySelector('.theme-toggle');
  var systemDark=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
  function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':!!(systemDark&&systemDark.matches);}
  function syncToggle(){
    var d=isDark();
    toggle.setAttribute('aria-pressed',d?'true':'false');
    toggle.setAttribute('aria-label',L('Dark theme','深色模式'));
    toggle.title=d?L('Switch to light theme','切换到浅色模式'):L('Switch to dark theme','切换到深色模式');
  }
  applyLang();
  if(toggle){
    toggle.addEventListener('click',function(){
      var t=isDark()?'light':'dark';
      root.setAttribute('data-theme',t);
      try{localStorage.setItem('taxonomy-theme',t);}catch(e){}
      syncToggle();
    });
    if(systemDark&&systemDark.addEventListener){systemDark.addEventListener('change',syncToggle);}
  }
  // Links to the old single page (taxonomy.html#delirium, #paper, #methods, #cite) open the page that now holds that section.
  var moved={delirium:'taxonomy-delirium.html',paper:'taxonomy-publication.html',methods:'taxonomy-publication.html#methods',cite:'taxonomy-publication.html#cite'};
  var hash=location.hash.slice(1);
  if(moved[hash]&&!document.getElementById(hash)){location.replace(moved[hash]);return;}
  // Dimension rail and panels (taxonomy.html)
  var tabs=[].slice.call(document.querySelectorAll('.node'));
  var panels=[].slice.call(document.querySelectorAll('.panel'));
  function select(i,focus){
    tabs.forEach(function(t,j){var on=j===i;t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;panels[j].hidden=!on;});
    if(focus){tabs[i].focus();}
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){
      select(i,false);
      if(window.innerWidth<760){var rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;panels[i].scrollIntoView({behavior:rm?'auto':'smooth',block:'start'});}
    });
    t.addEventListener('keydown',function(e){
      var n=tabs.length,k=null;
      if(e.key==='ArrowRight'||e.key==='ArrowDown'){k=(i+1)%n;}
      else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){k=(i-1+n)%n;}
      else if(e.key==='Home'){k=0;}
      else if(e.key==='End'){k=n-1;}
      if(k!==null){e.preventDefault();select(k,true);}
    });
  });
  document.querySelectorAll('[data-goto]').forEach(function(a){
    a.addEventListener('click',function(){select(parseInt(a.getAttribute('data-goto'),10)-1,false);});
  });
  var m=/^#dim-([1-8])$/.exec(location.hash||'');
  if(m&&tabs.length){select(parseInt(m[1],10)-1,false);var tx=document.getElementById('taxonomy');if(tx){tx.scrollIntoView();}}
  // Overlap highlight (taxonomy.html)
  var ob=document.getElementById('overlapBtn'),rail=document.querySelector('.rail');
  if(ob&&rail){ob.addEventListener('click',function(){
    var on=ob.getAttribute('aria-pressed')!=='true';
    ob.setAttribute('aria-pressed',on?'true':'false');
    rail.classList.toggle('overlap',on);
    ob.textContent=on?'Clear highlight':'Highlight on the rail';
  });}
  // Copy buttons (taxonomy-publication.html)
  document.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click',function(){
      var el=document.getElementById(b.getAttribute('data-copy'));
      var txt=el.textContent;
      var label=b.innerHTML;
      function done(){b.textContent=L('Copied','已复制');setTimeout(function(){b.innerHTML=label;},1600);}
      function fallback(){try{var r=document.createRange();r.selectNodeContents(el);var s=window.getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}b.textContent=L('Selected','已选中');setTimeout(function(){b.innerHTML=label;},2000);}
      try{navigator.clipboard.writeText(txt).then(done,fallback);}catch(e){fallback();}
    });
  });
})();
