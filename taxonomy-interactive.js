/* Interactive page only · taxonomy-interactive.html. Loaded after taxonomy-shared.js.
   One block per section; each block returns early when its section is not on the page.
   Blocks talk to each other through events on document (see "ix:setting" below). */
(function(){
  'use strict';

  var DIMS=['Risk information','Uncertainty communication','Presentation and format','Patient and clinician interpretation','Decision support','Explainability and model communication','Equity and subgroup reliability','Shared decision-making'];
  // Full chip, as on taxonomy.html: links to that dimension's panel.
  function dimChip(n){
    return '<li><a class="chip" href="taxonomy.html#dim-'+n+'" style="--c:var(--d'+n+');--cf:var(--d'+n+'f)"><i aria-hidden="true"></i>'+n+' · '+DIMS[n-1]+'</a></li>';
  }
  // Compact tag for tight spaces: just the number, with the name as a tooltip and accessible label.
  function dimTag(n){
    return '<li><a href="taxonomy.html#dim-'+n+'" style="--c:var(--d'+n+');--cf:var(--d'+n+'f)" title="'+DIMS[n-1]+'" aria-label="Dimension '+n+', '+DIMS[n-1]+'">'+n+'</a></li>';
  }

  /* 1 · Pathway builder (#pathway). Pieces are dragged with pointer events, so mouse, pen and touch all work;
     pressing a piece (click, Enter or Space) places it too. Each kind of piece has exactly one box on the board. */
  (function(){
    var pw=document.getElementById('pw');
    if(!pw){return;}
    var PIECES={
      data:{single:{label:'Single-site EHR',phrase:'derived from one hospital’s EHR'},multi:{label:'Multi-site EHR',phrase:'derived from EHR data from several sites'}},
      setting:{icu:{label:'ICU',phrase:'in an intensive care unit'},ward:{label:'Inpatient ward',phrase:'on an inpatient ward'},outpatient:{label:'Outpatient clinic',phrase:'in an outpatient or pre-surgical clinic'}},
      patients:{match:{label:'Like the development cohort',phrase:'patients who resemble the development cohort'},differ:{label:'Unlike the development cohort',phrase:'patients who differ from the development cohort'}},
      model:{risk:{label:'Risk prediction model',phrase:'A risk prediction model'},llm:{label:'Large language model',phrase:'A large language model'},cds:{label:'Decision support alert',phrase:'A decision support alert'},expert:{label:'Rule-based expert system',phrase:'A rule-based expert system'}},
      users:{nurses:{label:'Nurses',phrase:'nurses'},physicians:{label:'Physicians',phrase:'physicians'},patients:{label:'Patients and families',phrase:'patients and families'}}
    };
    var BOX={data:'the data box',setting:'the setting box',patients:'the patients box',model:'the model box',users:'the users box'};
    var EXAMPLE={data:'single',setting:'ward',patients:'match',model:'risk',users:'nurses'};

    // What each checkpoint on the board asks, given the pieces placed so far. Returns null until its pieces are in place.
    var CHECKS=[
      {key:'fair',name:'Fairness across patient groups',wait:'Place the patients.',fn:function(s){
        if(!s.patients){return null;}
        return s.patients==='match'
          ?{dims:[7],text:'The patients resemble the development cohort, so the headline performance is a reasonable starting point. Performance can still differ by sex, age, or language, and those subgroup results should be shown where they exist.'}
          :{dims:[7],text:'The patients differ from the development cohort. Performance and calibration may not carry over, and users should be told when an output deserves extra caution for groups the model rarely saw.'};
      }},
      {key:'output',name:'Uncertainty at the model output',wait:'Place a model.',fn:function(s){
        if(!s.model){return null;}
        var m={
          risk:{dims:[1,2,6],text:'A risk score needs its timeframe, its absolute scale, and an uncertainty range. Calibration matters as much as ranking: a well-ranked score can still overstate risk.'},
          llm:{dims:[2,3,6],text:'Fluent generated text can sound more certain than the evidence behind it. The output should say what the model is unsure about, and its explanations should not be read as causal.'},
          cds:{dims:[1,5,6],text:'An alert turns a probability into a yes or no. The threshold behind it, and the false alarms it accepts, should be explained rather than hidden.'},
          expert:{dims:[1,6],text:'Rules are transparent but brittle. The output should say which conditions the rules were written for and when clinical judgment should override them.'}
        }[s.model];
        var t=m.text;
        if(s.data==='single'){t+=' Derived from one site, it may not transport elsewhere: report external validation, or say that none exists.';}
        if(s.data==='multi'){t+=' Derived from several sites, it should report whether performance holds at each site, not only on average.';}
        return {dims:m.dims,text:t};
      }},
      {key:'exchange',name:'Uncertainty in the exchange with users',wait:'Place a model and its users.',fn:function(s){
        if(!s.model||!s.users){return null;}
        var u={
          nurses:{dims:[3,4,5],text:'Nurses meet the output inside busy patient lists and rounds. Keep the encoding simple, label what each color or icon means, and avoid adding to alert burden.'},
          physicians:{dims:[4,6],text:'Physicians weigh the output against their own judgment. Showing reliability next to the estimate lets trust be calibrated instead of all or nothing.'},
          patients:{dims:[3,4,8],text:'Patients and families need plain language, natural frequencies, and visual aids. A bare probability is easy to misread.'}
        }[s.users];
        var t=u.text;
        if(s.model==='llm'){t+=' The exchange runs both ways: how a question is put to the model can change its answer.';}
        return {dims:u.dims,text:t};
      }},
      {key:'decision',name:'Uncertainty at the decision',wait:'Place the setting and the users.',fn:function(s){
        if(!s.users||!s.setting){return null;}
        var d={
          icu:{dims:[5],text:'In the ICU, alarms compete for attention and many patients are already at high risk. Link the output to a specific next step and a time window.'},
          ward:{dims:[5],text:'On a ward, a flag helps only if someone knows what happens next: who reassesses the patient, which prevention measures start, and when.'},
          outpatient:{dims:[5,8],text:'Before admission or surgery, delirium is a future and uncertain event. The output should support a conversation about trade-offs rather than issue a directive.'}
        }[s.setting];
        var dims=d.dims.slice(),t=d.text;
        if(s.users==='patients'){if(dims.indexOf(8)<0){dims.push(8);}t+=' With patients and families at the table, their goals and values belong in the decision.';}
        return {dims:dims,text:t};
      }}
    ];

    var state={data:null,setting:null,patients:null,model:null,users:null};
    var chips=[].slice.call(pw.querySelectorAll('.pw-chip'));
    var slots={};
    [].forEach.call(pw.querySelectorAll('.pw-slot'),function(el){slots[el.getAttribute('data-slot')]=el;});
    var checkEls={};
    [].forEach.call(pw.querySelectorAll('.pw-check'),function(el){checkEls[el.getAttribute('data-check')]=el;});
    var live=document.getElementById('pw-live');
    var read=document.getElementById('pw-read');

    function say(t){live.textContent='';setTimeout(function(){live.textContent=t;},30);}

    function place(kind,id,quiet){
      state[kind]=id;
      render();
      if(!quiet){say(PIECES[kind][id].label+' placed in '+BOX[kind]+'.');}
      if(kind==='setting'){document.dispatchEvent(new CustomEvent('ix:setting',{detail:{id:id,label:PIECES.setting[id].label}}));}
    }
    function removePiece(kind){
      var id=state[kind];
      if(!id){return;}
      state[kind]=null;
      render();
      say(PIECES[kind][id].label+' removed from '+BOX[kind]+'.');
    }

    function sentence(){
      function part(kind,fallback){return state[kind]?PIECES[kind][state[kind]].phrase:'<span class="ghost">'+fallback+'</span>';}
      return part('model','A model')+' '+part('data','derived from some data')+', used '+part('setting','in some setting')+' by '+part('users','some users')+', for '+part('patients','some patients')+'.';
    }

    function render(){
      chips.forEach(function(c){c.setAttribute('aria-pressed',state[c.getAttribute('data-kind')]===c.getAttribute('data-id')?'true':'false');});
      Object.keys(slots).forEach(function(kind){
        var id=state[kind],body=slots[kind].querySelector('.pw-slot-body');
        slots[kind].classList.toggle('pw-filled',!!id);
        body.innerHTML=id
          ?'<span class="pw-placed"><span>'+PIECES[kind][id].label+'</span><button type="button" class="pw-x" data-remove="'+kind+'" aria-label="Remove '+PIECES[kind][id].label+'">×</button></span>'
          :'<span class="pw-empty">Drop here</span>';
      });
      var count={},findings='';
      CHECKS.forEach(function(c){
        var r=c.fn(state),el=checkEls[c.key];
        el.classList.toggle('pw-on',!!r);
        el.querySelector('.pw-check-body').innerHTML=r?'<ul class="pw-dims">'+r.dims.map(dimTag).join('')+'</ul>':'<p class="pw-check-wait">'+c.wait+'</p>';
        if(r){r.dims.forEach(function(n){count[n]=(count[n]||0)+1;});}
        findings+='<li class="pw-finding'+(r?'':' pw-wait')+'"><p class="pw-finding-name">'+c.name+'</p><p>'+(r?r.text:c.wait+' This check appears once they are on the board.')+'</p>'+(r?'<ul class="chips">'+r.dims.map(dimChip).join('')+'</ul>':'')+'</li>';
      });
      var stake=Object.keys(count).map(Number).sort(function(a,b){return count[b]-count[a]||a-b;});
      read.innerHTML='<p class="label">Your pathway</p><p class="pw-sentence">'+sentence()+'</p>'
        +'<ol class="pw-findings">'+findings+'</ol>'
        +(stake.length?'<div class="pw-stake"><p class="label">Dimensions at stake, most often first</p><ul class="chips">'+stake.map(dimChip).join('')+'</ul></div>':'');
    }

    // Pressing a piece places it. A click that ends a drag is ignored, because the drop already placed it.
    var suppressClick=false;
    chips.forEach(function(c){
      c.addEventListener('click',function(){
        if(suppressClick){suppressClick=false;return;}
        place(c.getAttribute('data-kind'),c.getAttribute('data-id'));
      });
    });
    pw.addEventListener('click',function(e){
      var x=e.target.closest('[data-remove]');
      if(!x){return;}
      var kind=x.getAttribute('data-remove'),id=state[kind];
      removePiece(kind);
      var back=pw.querySelector('.pw-chip[data-kind="'+kind+'"][data-id="'+id+'"]');
      if(back){back.focus();}
    });
    document.getElementById('pw-example').addEventListener('click',function(){
      Object.keys(EXAMPLE).forEach(function(k){place(k,EXAMPLE[k],true);});
      say('Example loaded: a risk prediction model from single-site EHR data, used on an inpatient ward by nurses.');
    });
    document.getElementById('pw-clear').addEventListener('click',function(){
      Object.keys(state).forEach(function(k){state[k]=null;});
      render();
      say('Board cleared.');
    });

    // Dragging
    var drag=null;
    function slotAt(x,y){
      var el=document.elementFromPoint(x,y);
      return el?el.closest('.pw-slot'):null;
    }
    function endDrag(drop){
      if(!drag){return;}
      var d=drag;
      drag=null;
      if(!d.on){return;}
      cancelAnimationFrame(d.raf);
      d.ghost.remove();
      pw.classList.remove('pw-dragging');
      document.documentElement.classList.remove('pw-dragging');
      Object.keys(slots).forEach(function(k){slots[k].classList.remove('pw-target','pw-over');});
      suppressClick=true;
      setTimeout(function(){suppressClick=false;},0);
      if(!drop){return;}
      var s=slotAt(d.x,d.y);
      if(!s){return;}
      if(s.getAttribute('data-slot')===d.kind){place(d.kind,d.id);}
      else{
        s.classList.remove('pw-wrong');void s.offsetWidth;s.classList.add('pw-wrong');
        say('That box takes a different kind of piece. '+PIECES[d.kind][d.id].label+' goes in '+BOX[d.kind]+'.');
      }
    }
    // While dragging near the top or bottom of the window, scroll so far-away boxes can be reached on small screens.
    function edgeScroll(){
      if(!drag||!drag.on){return;}
      var m=70,h=window.innerHeight,v=0;
      if(drag.y<m){v=-Math.ceil((m-drag.y)/5);}else if(drag.y>h-m){v=Math.ceil((drag.y-(h-m))/5);}
      if(v){window.scrollBy(0,v);hover();}
      drag.raf=requestAnimationFrame(edgeScroll);
    }
    function hover(){
      var s=slotAt(drag.x,drag.y);
      Object.keys(slots).forEach(function(k){slots[k].classList.toggle('pw-over',slots[k]===s&&k===drag.kind);});
    }
    chips.forEach(function(c){
      c.addEventListener('pointerdown',function(e){
        if(e.button!==0){return;}
        drag={chip:c,kind:c.getAttribute('data-kind'),id:c.getAttribute('data-id'),sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,on:false,pid:e.pointerId};
      });
      c.addEventListener('pointermove',function(e){
        if(!drag||drag.chip!==c||e.pointerId!==drag.pid){return;}
        drag.x=e.clientX;drag.y=e.clientY;
        if(!drag.on){
          if(Math.abs(drag.x-drag.sx)+Math.abs(drag.y-drag.sy)<7){return;}
          drag.on=true;
          try{c.setPointerCapture(e.pointerId);}catch(err){}
          var r=c.getBoundingClientRect();
          drag.dx=drag.sx-r.left;drag.dy=drag.sy-r.top;
          drag.ghost=c.cloneNode(true);
          drag.ghost.removeAttribute('id');
          drag.ghost.classList.add('pw-ghost');
          drag.ghost.setAttribute('aria-hidden','true');
          drag.ghost.style.width=r.width+'px';
          document.body.appendChild(drag.ghost);
          pw.classList.add('pw-dragging');
          document.documentElement.classList.add('pw-dragging');
          slots[drag.kind].classList.add('pw-target');
          drag.raf=requestAnimationFrame(edgeScroll);
        }
        drag.ghost.style.transform='translate('+(drag.x-drag.dx)+'px,'+(drag.y-drag.dy)+'px)';
        hover();
      });
      c.addEventListener('pointerup',function(e){if(drag&&drag.chip===c){drag.x=e.clientX;drag.y=e.clientY;endDrag(true);}});
      c.addEventListener('pointercancel',function(){endDrag(false);});
      c.addEventListener('lostpointercapture',function(){if(drag&&drag.on&&drag.chip===c){endDrag(true);}});
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&drag){endDrag(false);}});

    render();
  })();
})();
