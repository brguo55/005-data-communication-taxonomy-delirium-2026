/* Shared by taxonomy.html, taxonomy-delirium.html and taxonomy-publication.html.
   Each part only acts on elements that exist on the current page. */
(function(){
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
      function done(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy';},1600);}
      function fallback(){try{var r=document.createRange();r.selectNodeContents(el);var s=window.getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}b.textContent='Selected';setTimeout(function(){b.textContent='Copy';},2000);}
      try{navigator.clipboard.writeText(txt).then(done,fallback);}catch(e){fallback();}
    });
  });
})();
