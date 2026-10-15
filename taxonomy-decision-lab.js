/* Decision lab page only · taxonomy-decision-lab.html. Loaded after taxonomy-shared.js.
   One block per section; each block returns early when its section is not on the page.
   Blocks talk to each other through events on document (see "lab:setting" below). */
(function(){
  'use strict';

  var DIMS=['Risk information','Uncertainty communication','Presentation and format','Patient and clinician interpretation','Decision support','Explainability and model communication','Equity and subgroup reliability','Shared decision-making'];
  // Each dimension's colors, as on taxonomy.html.
  function dimStyle(n){return 'style="--c:var(--d'+n+');--cf:var(--d'+n+'f)"';}
  // Full chip: links to that dimension's panel on the taxonomy page.
  function dimChip(n){
    return '<li><a class="chip" href="taxonomy.html#dim-'+n+'" '+dimStyle(n)+'><i aria-hidden="true"></i>'+n+' · '+DIMS[n-1]+'</a></li>';
  }
  // Numbered badge for tight spaces. As a link (dimTag) it carries the name as a tooltip and accessible label.
  function dimBadge(n){
    return '<span class="lab-dim" '+dimStyle(n)+' aria-hidden="true">'+n+'</span>';
  }
  function dimTag(n){
    return '<li><a class="lab-dim" href="taxonomy.html#dim-'+n+'" '+dimStyle(n)+' title="'+DIMS[n-1]+'" aria-label="Dimension '+n+', '+DIMS[n-1]+'">'+n+'</a></li>';
  }
  // Chip lists written in the page as <ul class="chips" data-dims="1 6 5">.
  [].forEach.call(document.querySelectorAll('ul[data-dims]'),function(ul){
    ul.innerHTML=ul.getAttribute('data-dims').split(' ').map(Number).map(function(n){return dimChip(n);}).join('');
  });

  // Range inputs: color the track left of the thumb (--fill) using the input's own min and max,
  // write the shown value into its <output for="…">, and give screen readers the spoken form.
  function syncRange(input,shown,spoken){
    var min=+input.min,max=+input.max;
    input.style.setProperty('--fill',((input.value-min)/(max-min)*100)+'%');
    document.querySelector('output[for="'+input.id+'"]').textContent=shown;
    input.setAttribute('aria-valuetext',spoken||shown);
  }
  // A logarithmic scale from lo to hi laid over a range input: frac(x) is x's position from 0 to 1,
  // step(x) is the input value for x, and read() turns the input's current value back into x.
  function logRange(input,lo,hi){
    var min=+input.min,max=+input.max,span=Math.log(hi/lo);
    function frac(x){return Math.log(x/lo)/span;}
    return {
      frac:frac,
      step:function(x){return Math.round(min+(max-min)*frac(x));},
      read:function(){return lo*Math.exp(span*(input.value-min)/(max-min));}
    };
  }
  // Tick labels and marks carry data-value; place each one at its position on the scale (--at, 0 to 1).
  function placeTicks(root,frac){
    [].forEach.call(root.querySelectorAll('[data-value]'),function(el){el.style.setProperty('--at',frac(+el.getAttribute('data-value')).toFixed(4));});
  }
  // Charts are built once with svgAdd; updates then change only the attributes that move (setAttrs).
  function setAttrs(el,attrs){
    for(var k in attrs){if(attrs.hasOwnProperty(k)){el.setAttribute(k,attrs[k]);}}
    return el;
  }
  function svgAdd(parent,tag,attrs,text){
    var el=setAttrs(document.createElementNS('http://www.w3.org/2000/svg',tag),attrs);
    if(text){el.textContent=text;}
    return parent.appendChild(el);
  }

  /* 0 · Clinician test (#test). Six illustrative cases in a fixed order. Each is shown either as a score-only display
     (version A, like the displays in the paper's delirium cases) or as a display built from the taxonomy (version B).
     The versions alternate, and the group decides which cases get which, so across groups every case is seen both ways.
     ref is the risk in each scenario that a perfectly informed reader would arrive at; when is the time window asked
     about (48 hours unless the case says otherwise). */
  var CASES=[
    {id:'ward-red',title:'Medical ward · 84-year-old woman',
     vignette:'Admitted yesterday with pneumonia. Hard of hearing, new to the ward, oriented this morning.',
     a:{kind:'list',icon:'red',unit:'Medical ward 4B'},
     b:{risk:30,lo:24,hi:37,base:'About 10 in 100 patients on this ward',
        reliability:'Checked last month: predictions on this ward had been running higher than observed, so this estimate has been recalibrated.',
        next:'Start the ward’s delirium prevention measures and screen for delirium each shift.'},
     ref:30},
    {id:'clinic-flag',title:'Pre-surgical clinic · 67-year-old man',when:'in the first three days after surgery',
     vignette:'Planned knee replacement next week. Lives independently, no memory problems, takes no sedatives.',
     a:{kind:'flag',text:'High risk of postoperative delirium',sub:'Above threshold'},
     b:{risk:4,lo:2,hi:7,base:'About 1 in 100 patients seen in this clinic',
        reliability:'Flagged because the estimate is above the tool’s 2% screening threshold. At this estimate, about 24 of 25 patients like him do not develop delirium.',
        next:'Share the estimate with the surgical team and plan delirium screening after surgery.'},
     ref:4},
    {id:'icu-score',title:'Intensive care unit · 71-year-old man',
     vignette:'Second day on a ventilator after abdominal surgery. Sedated, waking when sedation is paused.',
     a:{kind:'value',label:'Delirium risk score',value:'0.55'},
     b:{risk:55,lo:47,hi:63,base:'About 30 in 100 patients in this unit',
        reliability:'Checked last quarter: predictions in this unit matched observed rates.',
        next:'Review sedation and screen for delirium each shift.'},
     ref:55},
    {id:'ward-none',title:'Surgical ward · 79-year-old woman',
     vignette:'Admitted from a nursing home for hip fracture repair tomorrow. Lives with moderate dementia.',
     a:{kind:'list',icon:'none',unit:'Surgical ward 2A'},
     b:{risk:8,lo:3,hi:20,base:'About 10 in 100 patients on this ward',
        reliability:'Checked last month: predictions on this ward matched observed rates overall.',
        caution:'The model saw few patients admitted from nursing homes or living with dementia. For patients like her, its estimate is likely too low.',
        next:'Use clinical judgment; consider starting prevention measures and screening each shift.'},
     ref:25},
    {id:'ortho-value',title:'Orthopedic ward · 76-year-old man',
     vignette:'Day one after hip fracture surgery. Taking opioids for pain, slept poorly last night.',
     a:{kind:'value',label:'Predicted probability of delirium',value:'0.20'},
     b:{risk:20,lo:9,hi:38,base:'About 10 in 100 patients on this ward',
        reliability:'The model was checked on few patients after hip surgery, so the range around this estimate is wide.',
        next:'Start prevention measures and screen for delirium each shift.'},
     ref:20},
    {id:'ward-amber',title:'Medical ward · 81-year-old woman',
     vignette:'Admitted with a urinary tract infection. Mild memory problems at home, needed help to the bathroom overnight.',
     a:{kind:'list',icon:'amber',unit:'Medical ward 4B'},
     b:{risk:18,lo:13,hi:24,base:'About 10 in 100 patients on this ward',
        reliability:'Checked last month: predictions on this ward had been running higher than observed, so this estimate has been recalibrated.',
        next:'Start the ward’s delirium prevention measures and screen for delirium each shift.'},
     ref:18}
  ];
  var ACTIONS={usual:'Continue usual care',reassess:'Reassess at the next shift',prevent:'Start prevention now',review:'Ask the team to review now'};

  (function(){
    var box=document.getElementById('test-box');
    if(!box){return;}
    var intro=document.getElementById('test-intro'),caseEl=document.getElementById('test-case'),done=document.getElementById('test-done');
    var form=document.getElementById('test-form'),est=document.getElementById('test-est'),range=document.getElementById('test-range');
    var next=document.getElementById('test-next'),display=document.getElementById('test-display');
    placeTicks(range.parentNode,function(v){return v/100;});

    // ?group=1 or ?group=2 in the link assigns a group; otherwise one is picked at random.
    var asked=/[?&]group=([12])/.exec(location.search);
    var t={group:asked?+asked[1]:(Math.random()<0.5?1:2),answers:[],i:0,start:0,touched:false};

    function when(c){return c.when||'in the next 48 hours';}
    function versionOf(i){return (i%2===0)===(t.group===1)?'A':'B';}
    function displayA(a){
      if(a.kind==='list'){
        var icon=a.icon==='none'?'':'<span class="icon '+a.icon+'"></span>';
        return '<div class="ward test-ward"><div class="ward-bar"><span>Patient list · '+a.unit+'</span><span>Delirium risk</span></div>'
          +'<table><tbody><tr><td>11</td><td><span class="redact" style="--w:58%"></span></td><td><span class="icon amber"></span></td></tr>'
          +'<tr class="test-this"><td>12</td><td>This patient</td><td>'+icon+'</td></tr>'
          +'<tr><td>14</td><td><span class="redact" style="--w:46%"></span></td><td></td></tr></tbody></table></div>'
          +'<ul class="legend"><li><span class="icon red"></span>Very high risk group, 95th to 100th percentile</li><li><span class="icon amber"></span>High risk group, 85th to 94th percentile</li><li><span class="icon none"></span>No symbol for patients classified as low risk</li></ul>';
      }
      if(a.kind==='flag'){return '<div class="test-widget"><p class="label">Delirium risk tool</p><p class="test-flag">'+a.text+'</p><p class="test-widget-sub">'+a.sub+'</p></div>';}
      return '<div class="test-widget"><p class="label">Delirium risk tool</p><p class="test-widget-value"><span>'+a.label+'</span><b class="num">'+a.value+'</b></p></div>';
    }
    function displayB(b,window){
      var cells='';
      for(var k=0;k<100;k++){cells+='<i'+(k<b.risk?' class="on"':'')+'></i>';}
      return '<div class="test-full">'
        +'<div class="test-main"><div><p class="test-big"><b>'+b.risk+'</b> in 100</p><p>similar patients develop delirium '+window+'</p></div><span class="test-array" role="img" aria-label="'+b.risk+' of 100 squares filled">'+cells+'</span></div>'
        +'<div><b>Likely range:</b> '+b.lo+' to '+b.hi+' in 100</div>'
        +'<div><b>For comparison:</b> '+b.base+' develop delirium</div>'
        +'<div><b>Reliability:</b> '+b.reliability+'</div>'
        +(b.caution?'<div class="test-caution"><b>Caution:</b> '+b.caution+'</div>':'')
        +'<div><b>Suggested next step:</b> '+b.next+'</div></div>';
    }
    function checked(name){var el=form.querySelector('input[name="'+name+'"]:checked');return el?el.value:'';}
    function ready(){next.disabled=!(t.touched&&checked('test-act')&&checked('test-sure'));}
    function showEstimate(){
      var v=+est.value;
      syncRange(est,v+' in 100',v+' in 100, '+v+' percent');
    }

    function showCase(){
      var c=CASES[t.i];
      document.getElementById('test-step').textContent='Case '+(t.i+1)+' of '+CASES.length;
      document.getElementById('test-bar-fill').style.width=(t.i/CASES.length*100)+'%';
      document.getElementById('test-patient').textContent=c.title;
      document.getElementById('test-vignette').textContent=c.vignette;
      document.getElementById('test-q1').textContent='1. What is the chance this patient develops delirium '+when(c)+'?';
      display.innerHTML=versionOf(t.i)==='A'?displayA(c.a):displayB(c.b,when(c));
      form.reset();
      est.value=50;
      t.touched=false;
      range.classList.add('test-unset');
      est.style.setProperty('--fill','0%');
      document.querySelector('output[for="test-est"]').textContent='–';
      next.textContent=t.i===CASES.length-1?'Finish':'Next case';
      ready();
      t.start=performance.now();
      document.getElementById('test-patient').focus();
    }
    function finish(){
      caseEl.hidden=true;
      done.hidden=false;
      done.innerHTML='<p class="label">Done</p><h3 class="test-patient">Thank you. All six cases are complete.</h3>';
      done.focus();
    }

    intro.addEventListener('submit',function(e){
      e.preventDefault();
      var code=document.getElementById('test-code').value.trim();
      t.participant=code||'P-'+Math.random().toString(36).slice(2,6).toUpperCase();
      t.role=document.getElementById('test-role').value;
      t.years=document.getElementById('test-years').value;
      intro.hidden=true;
      caseEl.hidden=false;
      showCase();
    });
    // The estimate counts as answered once the participant touches the slider, even if they keep the middle value.
    function touch(){if(!t.touched){t.touched=true;range.classList.remove('test-unset');}showEstimate();ready();}
    est.addEventListener('input',touch);
    est.addEventListener('pointerdown',touch);
    est.addEventListener('keydown',function(e){if(/^(Arrow|Page|Home|End)/.test(e.key)){touch();}});
    form.addEventListener('change',ready);
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(next.disabled){return;}
      var c=CASES[t.i];
      t.answers.push({caseId:c.id,title:c.title,version:versionOf(t.i),estimate:+est.value,ref:c.ref,action:checked('test-act'),sure:+checked('test-sure'),seconds:Math.round((performance.now()-t.start)/100)/10});
      t.i++;
      if(t.i<CASES.length){showCase();}else{finish();}
    });
  })();

  // Hospital settings, shared by the pathway builder (section 1) and the base-rate explorer (section 2).
  // The rates are illustrative, chosen to span a range; they are not prevalence estimates.
  var SETTINGS={
    icu:{phrase:'in an intensive care unit',rate:0.3},
    ward:{phrase:'on an inpatient ward',rate:0.1},
    outpatient:{phrase:'in an outpatient or pre-surgical clinic',rate:0.01}
  };

  /* 1 · Pathway builder (#pathway). Pieces are dragged with pointer events, so mouse, pen and touch all work;
     pressing a piece (click, Enter or Space) places it too. Each kind of piece has exactly one box on the board. */
  (function(){
    var pw=document.getElementById('pw');
    if(!pw){return;}
    // How each piece reads in the summary sentence. Piece labels are read from the tray buttons below.
    var PHRASES={
      data:{single:'derived from one hospital’s EHR',multi:'derived from EHR data from several sites'},
      setting:{},
      patients:{match:'patients who resemble the development cohort',differ:'patients who differ from the development cohort'},
      model:{risk:'A risk prediction model',llm:'A large language model',cds:'A decision support alert',expert:'A rule-based expert system'},
      users:{nurses:'nurses',physicians:'physicians',patients:'patients and families'}
    };
    Object.keys(SETTINGS).forEach(function(id){PHRASES.setting[id]=SETTINGS[id].phrase;});
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
    var LABELS={};
    chips.forEach(function(c){
      var kind=c.getAttribute('data-kind');
      (LABELS[kind]=LABELS[kind]||{})[c.getAttribute('data-id')]=c.textContent.trim();
    });
    function box(kind){return 'the '+kind+' box';}
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
      if(!quiet){say(LABELS[kind][id]+' placed in '+box(kind)+'.');}
      if(kind==='setting'){document.dispatchEvent(new CustomEvent('lab:setting',{detail:{id:id,label:LABELS.setting[id]}}));}
    }
    function removePiece(kind){
      var id=state[kind];
      if(!id){return;}
      state[kind]=null;
      render();
      say(LABELS[kind][id]+' removed from '+box(kind)+'.');
    }

    function sentence(){
      function part(kind,fallback){return state[kind]?PHRASES[kind][state[kind]]:'<span class="ghost">'+fallback+'</span>';}
      return part('model','A model')+' '+part('data','derived from some data')+', used '+part('setting','in some setting')+' by '+part('users','some users')+', for '+part('patients','some patients')+'.';
    }

    function render(){
      chips.forEach(function(c){c.setAttribute('aria-pressed',state[c.getAttribute('data-kind')]===c.getAttribute('data-id')?'true':'false');});
      Object.keys(slots).forEach(function(kind){
        var id=state[kind],body=slots[kind].querySelector('.pw-slot-body');
        slots[kind].classList.toggle('pw-filled',!!id);
        body.innerHTML=id
          ?'<span class="pw-placed"><span>'+LABELS[kind][id]+'</span><button type="button" class="pw-x" data-remove="'+kind+'" aria-label="Remove '+LABELS[kind][id]+'">×</button></span>'
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
        +(state.setting?'<p class="pw-next"><a href="#context">See what a flag means '+SETTINGS[state.setting].phrase+' ↓</a></p>':'')
        +'<ol class="pw-findings">'+findings+'</ol>'
        +(stake.length?'<div class="pw-stake"><p class="label">Dimensions at stake, most often first</p><ul class="chips">'+stake.map(dimChip).join('')+'</ul></div>':'');
    }

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
      say('Example loaded. '+sentence());
    });
    document.getElementById('pw-clear').addEventListener('click',function(){
      Object.keys(state).forEach(function(k){state[k]=null;});
      render();
      say('Board cleared.');
    });

    // Dragging. drag.target is the one box that accepts the piece being dragged.
    var drag=null,suppressClick=false;
    function slotAt(x,y){
      var el=document.elementFromPoint(x,y);
      return el?el.closest('.pw-slot'):null;
    }
    function hover(){drag.target.classList.toggle('pw-over',slotAt(drag.x,drag.y)===drag.target);}
    function endDrag(drop){
      if(!drag){return;}
      var d=drag;
      drag=null;
      if(!d.on){return;}
      cancelAnimationFrame(d.raf);
      d.ghost.remove();
      document.documentElement.classList.remove('pw-dragging');
      d.target.classList.remove('pw-target','pw-over');
      // The click that follows this pointerup must not place the piece a second time.
      suppressClick=true;
      setTimeout(function(){suppressClick=false;},0);
      if(!drop){return;}
      var s=slotAt(d.x,d.y);
      if(s===d.target){place(d.kind,d.id);}
      else if(s){
        s.classList.remove('pw-wrong');void s.offsetWidth;s.classList.add('pw-wrong');
        say('That box takes a different kind of piece. '+LABELS[d.kind][d.id]+' goes in '+box(d.kind)+'.');
      }
    }
    // While dragging near the top or bottom of the window, scroll so far-away boxes can be reached on small screens.
    function edgeScroll(){
      var m=70,h=window.innerHeight,v=0;
      if(drag.y<m){v=-Math.ceil((m-drag.y)/5);}else if(drag.y>h-m){v=Math.ceil((drag.y-(h-m))/5);}
      if(v){window.scrollBy(0,v);hover();}
      drag.raf=requestAnimationFrame(edgeScroll);
    }
    function startDrag(c,e){
      var r=c.getBoundingClientRect();
      drag.on=true;
      try{c.setPointerCapture(e.pointerId);}catch(err){}
      drag.dx=drag.sx-r.left;drag.dy=drag.sy-r.top;
      drag.ghost=c.cloneNode(true);
      drag.ghost.classList.add('pw-ghost');
      drag.ghost.setAttribute('aria-hidden','true');
      drag.ghost.style.width=r.width+'px';
      document.body.appendChild(drag.ghost);
      document.documentElement.classList.add('pw-dragging');
      drag.target.classList.add('pw-target');
      drag.raf=requestAnimationFrame(edgeScroll);
    }
    chips.forEach(function(c){
      // Pressing a piece (click, Enter or Space) places it.
      c.addEventListener('click',function(){
        if(!suppressClick){place(c.getAttribute('data-kind'),c.getAttribute('data-id'));}
      });
      c.addEventListener('pointerdown',function(e){
        if(e.button!==0){return;}
        var kind=c.getAttribute('data-kind');
        drag={chip:c,kind:kind,id:c.getAttribute('data-id'),target:slots[kind],sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,on:false,pid:e.pointerId};
      });
      c.addEventListener('pointermove',function(e){
        if(!drag||drag.chip!==c||e.pointerId!==drag.pid){return;}
        drag.x=e.clientX;drag.y=e.clientY;
        if(!drag.on){
          if(Math.abs(drag.x-drag.sx)+Math.abs(drag.y-drag.sy)<7){return;}
          startDrag(c,e);
        }
        // Hit-test before moving the ghost, so the move does not force a second layout.
        hover();
        drag.ghost.style.transform='translate('+(drag.x-drag.dx)+'px,'+(drag.y-drag.dy)+'px)';
      });
      c.addEventListener('pointerup',function(e){if(drag&&drag.chip===c){drag.x=e.clientX;drag.y=e.clientY;endDrag(true);}});
      c.addEventListener('pointercancel',function(){endDrag(false);});
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&drag){endDrag(false);}});

    render();
  })();

  /* 2 · Risk and context (#context). Natural frequencies for 1,000 patients at a chosen base rate, with the model held at
     sensitivity 0.76 and specificity 0.84. The slider is logarithmic from 0.1% to 60%, so low base rates get room. */
  (function(){
    var input=document.getElementById('ctx-rate');
    if(!input){return;}
    var SENS=0.76,SPEC=0.84,N=1000,ROWS=25;
    var scale=logRange(input,0.001,0.6);
    placeTicks(input.closest('.lab-card'),scale.frac);
    var grid=document.getElementById('ctx-grid');
    var flaggedEl=document.getElementById('ctx-flagged'),tpEl=document.getElementById('ctx-tp'),fnEl=document.getElementById('ctx-fn'),plainEl=document.getElementById('ctx-plain');
    var presets=[].slice.call(document.querySelectorAll('#ctx-presets .btn'));
    // Setting presets take their rate from SETTINGS; any other preset carries its own data-rate.
    function rateOf(b){var id=b.getAttribute('data-setting');return id?SETTINGS[id].rate:+b.getAttribute('data-rate');}
    // Column by column, so each outcome forms a band that reads from left to right. cellClass remembers each
    // cell's outcome, so a slider step only rewrites the few cells at the edges of the bands.
    var cells=[],cellClass=[];
    for(var i=0;i<N;i++){
      cells.push(svgAdd(grid,'rect',{x:Math.floor(i/ROWS)*10+1,y:(i%ROWS)*10+1,width:8,height:8,rx:1.6}));
      cellClass.push('');
    }

    function fmtPct(p){p*=100;return (p<10?p.toFixed(1):String(Math.round(p)))+'%';}
    // Split 1,000 patients into the four outcomes, rounding so the parts still add up to 1,000 (largest remainder).
    function split(p){
      var raw=[SENS*N*p,(1-SPEC)*N*(1-p),(1-SENS)*N*p,SPEC*N*(1-p)];
      var n=raw.map(Math.floor),left=N-n[0]-n[1]-n[2]-n[3];
      raw.map(function(v,k){return [v-n[k],k];}).sort(function(a,b){return b[0]-a[0];}).slice(0,left).forEach(function(e){n[e[1]]++;});
      return {tp:n[0],fp:n[1],fn:n[2],tn:n[3]};
    }

    function update(){
      var p=scale.read(),c=split(p);
      var ppv=SENS*p/(SENS*p+(1-SPEC)*(1-p));
      syncRange(input,fmtPct(p));
      // Flagged patients first (true alerts, then false alarms), then missed cases, then everyone else.
      var k=0;
      [['ctx-tp',c.tp],['ctx-fp',c.fp],['ctx-fn',c.fn],['ctx-tn',c.tn]].forEach(function(g){
        for(var j=0;j<g[1];j++,k++){
          if(cellClass[k]!==g[0]){cellClass[k]=g[0];cells[k].setAttribute('class',g[0]);}
        }
      });
      flaggedEl.textContent=c.tp+c.fp;
      tpEl.textContent=c.tp;
      fnEl.textContent=c.fn;
      var chance=ppv<0.5?'roughly a 1 in '+Math.round(1/ppv)+' chance ('+fmtPct(ppv)+')':'roughly a '+fmtPct(ppv)+' chance';
      var verdict=ppv<0.1?'Almost every flag is a false alarm.':ppv<0.5?'Most flags are still false alarms.':'Most flags are correct, yet about 1 in '+Math.round(1/(1-ppv))+' is a false alarm.';
      plainEl.textContent='At a base rate of '+fmtPct(p)+', the tool flags about '+(c.tp+c.fp)+' of 1,000 patients, and about '+c.tp+' of them go on to develop delirium. A flag means '+chance+' that this patient develops delirium. '+verdict;
      presets.forEach(function(b){b.setAttribute('aria-pressed',scale.step(rateOf(b))===+input.value?'true':'false');});
    }
    function setRate(rate){input.value=scale.step(rate);update();}

    var from=document.getElementById('ctx-from');
    function clearFrom(){from.hidden=true;from.textContent='';}

    input.addEventListener('input',function(){update();clearFrom();});
    presets.forEach(function(b){b.addEventListener('click',function(){setRate(rateOf(b));clearFrom();});});
    // A setting placed in the pathway builder (section 1) moves the base rate to that setting's illustrative value.
    document.addEventListener('lab:setting',function(e){
      var rate=SETTINGS[e.detail.id].rate;
      setRate(rate);
      from.textContent='Set from your pathway: '+e.detail.label+', at an illustrative base rate of '+fmtPct(rate)+'.';
      from.hidden=false;
    });
    setRate(SETTINGS.ward.rate);
  })();

  /* 3 · Model robustness (#robust)
     A: 95% interval around AUROC 0.855 (Jauk et al.) from the Hanley and McNeil (1982) standard error, for an evaluation
        with n1 patients who develop delirium and 9 × n1 who do not. The slider is logarithmic from 10 to 1,000.
     B: an illustrative population whose true risk is logit-normal. Predicted log-odds = true log-odds + drift, so ranks,
        AUROC and percentile icons never change while predicted risk pulls away from observed risk. */
  (function(){
    var nIn=document.getElementById('rob-n'),dIn=document.getElementById('rob-drift');
    if(!nIn||!dIn){return;}
    function f2(x){return x.toFixed(2);}
    function pct(x){return Math.round(x*100)+'%';}
    function expit(x){return 1/(1+Math.exp(-x));}

    // A · sample size
    var A=0.855,Q1=A/(2-A),Q2=2*A*A/(1+A);
    function interval(n1){
      var n2=9*n1,se=Math.sqrt((A*(1-A)+(n1-1)*(Q1-A*A)+(n2-1)*(Q2-A*A))/(n1*n2));
      return [Math.max(0.5,A-1.96*se),Math.min(1,A+1.96*se)];
    }
    var nScale=logRange(nIn,10,1000);
    placeTicks(nIn.closest('.lab-card'),nScale.frac);
    var ci=document.getElementById('rob-ci'),subA=document.getElementById('rob-n-sub'),textA=document.getElementById('rob-ci-text');
    function cx(v){return 16+(v-0.5)/0.5*288;}
    // Axis, ticks and the 0.855 point never change; only the interval band moves.
    svgAdd(ci,'line',{'class':'axis',x1:cx(0.5),x2:cx(1),y1:38,y2:38});
    [0.5,0.6,0.7,0.8,0.9,1].forEach(function(v){
      svgAdd(ci,'line',{'class':'axis',x1:cx(v),x2:cx(v),y1:38,y2:42});
      svgAdd(ci,'text',{'class':'t',x:cx(v),y:55,'text-anchor':'middle'},v.toFixed(1));
    });
    var band=svgAdd(ci,'rect',{'class':'band',y:25,height:10,rx:5});
    svgAdd(ci,'circle',{'class':'dot',cx:cx(A),cy:30,r:5});
    svgAdd(ci,'text',{'class':'t-strong',x:cx(A),y:16,'text-anchor':'middle'},'0.855');
    function drawA(){
      var n1=Math.round(nScale.read()),iv=interval(n1);
      syncRange(nIn,n1.toLocaleString('en-US'),n1+' patients with delirium');
      subA.textContent='and '+(9*n1).toLocaleString('en-US')+' who did not, '+(10*n1).toLocaleString('en-US')+' evaluated in all';
      setAttrs(band,{x:cx(iv[0]),width:Math.max(2,cx(iv[1])-cx(iv[0]))});
      var other=n1<300?Math.min(1000,n1*10):Math.round(n1/10),ov=interval(other);
      var compare=other>n1?'With ten times as many, it would narrow to '+f2(ov[0])+' to '+f2(ov[1])+'.':'With a tenth as many, it would widen to '+f2(ov[0])+' to '+f2(ov[1])+'.';
      textA.textContent='With '+n1.toLocaleString('en-US')+' patients who developed delirium, the 95% interval runs from '+f2(iv[0])+' to '+f2(iv[1])+'. '+compare+' The headline 0.855 looks the same either way; only the interval shows how much evidence stands behind it.';
    }

    // B · calibration drift. Integrate over the standard normal on a fine grid instead of sampling, so the numbers are stable.
    var MU=-2.6,SD=1.2,Z95=1.6449,Z85=1.0364,STEP=0.01,grid=[];
    for(var z=-6;z<=6;z+=STEP){grid.push([z,Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*STEP]);}
    function groupMeans(lo,hi,d){
      var w=0,obs=0,pred=0;
      grid.forEach(function(g){if(g[0]>=lo&&g[0]<hi){var l=MU+SD*g[0];w+=g[1];obs+=g[1]*expit(l);pred+=g[1]*expit(l+d);}});
      return {obs:obs/w,pred:pred/w};
    }
    var cal=document.getElementById('rob-cal'),redEl=document.getElementById('rob-red'),ambEl=document.getElementById('rob-amber'),textB=document.getElementById('rob-cal-text');
    var X0=46,X1=306,Y0=200,Y1=12,TILT=-Math.atan2(Y0-Y1,X1-X0)*180/Math.PI,BINS=20;
    function px(p){return X0+p*(X1-X0);}
    function py(p){return Y0-p*(Y0-Y1);}
    // Built once, back to front: grid and tick labels, the histogram bars, the diagonal, the curve, the two
    // icon-group points, then the axis titles. drawB only moves the bars, the curve and the points.
    [0,0.25,0.5,0.75,1].forEach(function(v){
      svgAdd(cal,'line',{'class':'grid',x1:px(0),x2:px(1),y1:py(v),y2:py(v)});
      svgAdd(cal,'text',{'class':'t',x:X0-6,y:py(v)+3,'text-anchor':'end'},pct(v));
      svgAdd(cal,'text',{'class':'t',x:px(v),y:Y0+14,'text-anchor':'middle'},pct(v));
    });
    var bars=[];
    for(var b=0;b<BINS;b++){bars.push(svgAdd(cal,'rect',{'class':'bar',x:px(b/BINS)+1,width:px(1/BINS)-px(0)-2,y:Y0,height:0}));}
    svgAdd(cal,'line',{'class':'diag',x1:px(0),y1:py(0),x2:px(1),y2:py(1)});
    var curve=svgAdd(cal,'path',{'class':'curve'});
    var ptAmber=svgAdd(cal,'circle',{'class':'pt-amber',r:6}),ptRed=svgAdd(cal,'circle',{'class':'pt-red',r:6});
    svgAdd(cal,'text',{'class':'t',x:px(1),y:Y0+30,'text-anchor':'end'},'Predicted risk →');
    svgAdd(cal,'text',{'class':'t',x:9,y:py(0.5),'text-anchor':'middle',transform:'rotate(-90 9 '+py(0.5)+')'},'Observed rate →');
    svgAdd(cal,'text',{'class':'t',x:px(0.6),y:py(0.6)-7,transform:'rotate('+TILT.toFixed(1)+' '+px(0.6)+' '+(py(0.6)-7)+')'},'perfect calibration');

    function drawB(){
      var d=dIn.value/100,odds=Math.exp(d),k;
      syncRange(dIn,d===0?'None':'×'+odds.toFixed(1)+' odds',d===0?'No overstatement':'Predicted odds '+odds.toFixed(1)+' times the observed odds');
      // Where the predicted risks fall: bar heights scaled to the fullest bin.
      var mass=[],maxB=0;
      for(k=0;k<BINS;k++){mass.push(0);}
      grid.forEach(function(g){mass[Math.min(BINS-1,Math.floor(expit(MU+SD*g[0]+d)*BINS))]+=g[1];});
      mass.forEach(function(m){if(m>maxB){maxB=m;}});
      mass.forEach(function(m,i){var h=m/maxB*46;if(h<=0.3){h=0;}setAttrs(bars[i],{y:Y0-h,height:h});});
      var path='';
      for(k=1;k<=199;k++){var p=k/200,o=expit(Math.log(p/(1-p))-d);path+=(k===1?'M':'L')+px(p).toFixed(1)+' '+py(o).toFixed(1);}
      curve.setAttribute('d',path);
      var red=groupMeans(Z95,99,d),amb=groupMeans(Z85,Z95,d);
      setAttrs(ptAmber,{cx:px(amb.pred),cy:py(amb.obs)});
      setAttrs(ptRed,{cx:px(red.pred),cy:py(red.obs)});
      redEl.textContent=pct(red.pred)+' · '+pct(red.obs);
      ambEl.textContent=pct(amb.pred)+' · '+pct(amb.obs);
      textB.textContent=d===0
        ?'Predicted and observed risk agree. The ward list shows a red icon for the top 5% of patients and a yellow icon for the next 10%.'
        :'Patients with a red icon are now predicted to have a '+pct(red.pred)+' risk, but '+pct(red.obs)+' go on to develop delirium. The patient list looks exactly as before, because icons are assigned by rank. Jauk et al. measured this kind of drift in the manuscript; the display could not show it.';
    }

    nIn.addEventListener('input',drawA);
    dIn.addEventListener('input',drawB);
    drawA();
    drawB();
  })();

  /* 4 · What if (#attention). A hand-set teaching index, not a clinical score:
       index = 8 + 22 × rush + Σ over missing elements of (base + slope × rush), capped at 100,
     where rush runs from 0 (full attention) to 1 (rushed). The base weight is what a missing element costs a careful
     reader; the slope is what it costs on top of that when attention is short. The support line sits at 40. */
  (function(){
    var rush=document.getElementById('att-rush');
    if(!rush){return;}
    var LINE=40;
    var EL={
      time:{dim:1,base:11,slope:4,on:true,name:'Timeframe and absolute risk',fix:'State the timeframe, denominator, and baseline population, and show absolute risk rather than a bare score.'},
      uncertainty:{dim:2,base:10,slope:2,name:'Uncertainty range',fix:'Show an uncertainty range or a qualitative uncertainty cue, and name the main sources of uncertainty in plain language.'},
      format:{dim:3,base:6,slope:9,on:true,name:'Plain-language label and clear visual',fix:'Use a plain-language label, natural frequencies, and an accessible visual, so the output reads at a glance.'},
      review:{dim:4,base:5,slope:6,name:'Prompt to review, not just accept',fix:'Add interpretation guidance and a prompt that invites critical review rather than passive acceptance.'},
      action:{dim:5,base:7,slope:12,name:'Linked next step',fix:'Link the output to a concrete next step, and cut alert fatigue through prioritization and contextual triggering.'},
      reliability:{dim:6,base:10,slope:3,name:'Calibration and reliability status',fix:'Show calibration and reliability status, including expected false positives and false negatives and when the output should not be relied on.'},
      subgroup:{dim:7,base:6,slope:2,name:'Caution for groups the model rarely saw',fix:'Flag data limitations and say when the output should be read with caution for underrepresented groups.'}
    };
    var KEYS=Object.keys(EL),SUM_BASE=0,SUM_SLOPE=0;
    KEYS.forEach(function(k){SUM_BASE+=EL[k].base;SUM_SLOPE+=EL[k].slope;});
    // One checkbox per element, built from EL; "on" marks what the display shows at the start.
    var toggles=document.getElementById('att-toggles');
    toggles.innerHTML=KEYS.map(function(k){
      return '<li><label><input type="checkbox" data-el="'+k+'"'+(EL[k].on?' checked':'')+'>'+dimBadge(EL[k].dim)+'<span class="att-tx">'+EL[k].name+'</span></label></li>';
    }).join('');
    var boxes=[].slice.call(toggles.querySelectorAll('input'));
    var PROFILES={
      wellSupported:{tone:'ok',name:'Well supported',text:'There is time to read the output, and the display answers the questions a careful reader would ask.'},
      stretched:{tone:'warn',name:'Stretched but supported',text:'Attention is short, but the display carries enough on its own: what the risk means and what to do next are visible at a glance.'},
      reader:{tone:'warn',name:'Relies on the reader',text:'An attentive clinician may fill some gaps from experience, but the display leaves important questions unanswered.'},
      needs:{tone:'bad',name:'Needs support',text:'Attention is short and the display leaves gaps. Misreading, overtrust, and inaction become likely, so support has to be built into the display and the workflow.'}
    };
    // The index is floorAt(rush) + gap × spanAt(rush), where gap is the share (0 to 1) of the possible gap cost that is missing.
    function cost(k,s){return EL[k].base+EL[k].slope*s;}
    function floorAt(s){return 8+22*s;}
    function spanAt(s){return SUM_BASE+SUM_SLOPE*s;}
    function indexAt(s,g){return Math.min(100,floorAt(s)+g*spanAt(s));}
    function attentionWord(v){return v<20?'Full':v<45?'Some distraction':v<70?'Divided':'Rushed';}

    var scoreEl=document.getElementById('att-score'),coverEl=document.getElementById('att-cover'),meterEl=document.getElementById('att-meter');
    var profileEl=document.getElementById('att-profile'),profileName=document.getElementById('att-profile-name'),profileText=document.getElementById('att-profile-text');
    var supportEl=document.getElementById('att-support'),lastSupport='';
    meterEl.querySelector('.att-line').style.left=LINE+'%';

    // The map: x is rush, y is the missing share of the gap cost at this rush level, so the shading and the dashed
    // support line are exact for the dot. Everything except the dot is drawn once.
    var map=document.getElementById('att-map'),VIEW_W=map.viewBox.baseVal.width;
    var MX0=30,MX1=312,MY0=176,MY1=8;
    function mx(s){return MX0+s*(MX1-MX0);}
    function my(g){return MY0-g*(MY0-MY1);}
    // Shading is nearly clear at low index values and deepens toward the top right.
    var base='<g class="heat">',i,j,C=28,R=16;
    for(i=0;i<C;i++){for(j=0;j<R;j++){
      var t=Math.max(0,(indexAt((i+0.5)/C,(j+0.5)/R)-12)/88);
      base+='<rect class="cell" x="'+mx(i/C).toFixed(2)+'" y="'+my((j+1)/R).toFixed(2)+'" width="'+((MX1-MX0)/C).toFixed(2)+'" height="'+((MY0-MY1)/R).toFixed(2)+'" opacity="'+(0.03+0.55*Math.pow(t,1.3)).toFixed(3)+'"/>';
    }}
    base+='</g>';
    var line='';
    for(i=0;i<=40;i++){var s1=i/40,g1=(LINE-floorAt(s1))/spanAt(s1);line+=(i?'L':'M')+mx(s1).toFixed(1)+' '+my(Math.max(0,Math.min(1,g1))).toFixed(1);}
    base+='<line class="mid" x1="'+mx(0.5)+'" x2="'+mx(0.5)+'" y1="'+MY1+'" y2="'+MY0+'"/>';
    base+='<path class="line" d="'+line+'"/>';
    base+='<rect class="frame-line" x="'+MX0+'" y="'+MY1+'" width="'+(MX1-MX0)+'" height="'+(MY0-MY1)+'"/>';
    base+='<text class="q" x="'+(MX0+6)+'" y="'+(MY1+14)+'">Relies on the reader</text>';
    base+='<text class="q" x="'+(MX1-6)+'" y="'+(MY1+14)+'" text-anchor="end">Needs support</text>';
    base+='<text class="q" x="'+(MX0+6)+'" y="'+(MY0-7)+'">Well supported</text>';
    base+='<text class="q" x="'+(MX1-6)+'" y="'+(MY0-7)+'" text-anchor="end">Stretched</text>';
    base+='<text class="ax" x="'+MX0+'" y="'+(MY0+14)+'">Full attention</text><text class="ax" x="'+MX1+'" y="'+(MY0+14)+'" text-anchor="end">Rushed →</text>';
    base+='<text class="ax" x="11" y="'+my(0.5)+'" text-anchor="middle" transform="rotate(-90 11 '+my(0.5)+')">Display gaps →</text>';
    map.innerHTML=base;
    var halo=svgAdd(map,'circle',{'class':'halo',r:13}),dot=svgAdd(map,'circle',{'class':'dot',r:7});

    function update(){
      var v=+rush.value,s=v/100,missing=[],gap=0;
      boxes.forEach(function(b){if(!b.checked){var k=b.getAttribute('data-el');missing.push(k);gap+=cost(k,s);}});
      var g=gap/spanAt(s),idx=Math.round(indexAt(s,g));
      syncRange(rush,attentionWord(v),attentionWord(v)+', '+v+'% of the way to rushed');
      scoreEl.textContent=idx;
      coverEl.style.setProperty('--v',idx+'%');
      meterEl.setAttribute('aria-valuenow',idx);
      var p=idx<LINE?(s<0.5?PROFILES.wellSupported:PROFILES.stretched):(s<0.5?PROFILES.reader:PROFILES.needs);
      profileEl.setAttribute('data-tone',p.tone);
      profileName.textContent=p.name;
      profileText.textContent=p.text;
      setAttrs(halo,{cx:mx(s),cy:my(g)});
      setAttrs(dot,{cx:mx(s),cy:my(g)});
      // What to add first: the missing elements that cost the most at the current level of attention.
      // The list is a live region, so it is rewritten only when its content actually changes.
      missing.sort(function(a,b){return cost(b,s)-cost(a,s);});
      var html=!missing.length
        ?'<p class="label">Support to add</p><p class="att-done">Nothing is missing from the display. What remains is attention itself: protect time for the decision, and keep alerts few enough that each one is read.</p>'
        :'<p class="label">'+(idx<LINE?'Worth adding next':'Add these first')+'</p><ol class="att-list">'+missing.slice(0,3).map(function(k){
          var e=EL[k];
          return '<li>'+dimBadge(e.dim)+'<div><b>'+e.name+'</b><p>'+e.fix+'</p><span class="att-gain">Lowers the index by about '+Math.round(cost(k,s))+' points here</span></div></li>';
        }).join('')+'</ol>';
      if(html!==lastSupport){supportEl.innerHTML=lastSupport=html;}
    }

    rush.addEventListener('input',update);
    boxes.forEach(function(b){b.addEventListener('change',update);});
    document.getElementById('att-bare').addEventListener('click',function(){boxes.forEach(function(b){b.checked=false;});update();});
    document.getElementById('att-full').addEventListener('click',function(){boxes.forEach(function(b){b.checked=true;});update();});
    // Pressing or dragging anywhere on the map moves attention, like dragging the dot itself.
    function fromPointer(e){
      var r=map.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*VIEW_W;
      var v=Math.round(Math.max(0,Math.min(1,(x-MX0)/(MX1-MX0)))*100);
      if(v!==+rush.value){rush.value=v;update();}
    }
    map.addEventListener('pointerdown',function(e){try{map.setPointerCapture(e.pointerId);}catch(err){}fromPointer(e);});
    map.addEventListener('pointermove',function(e){if(map.hasPointerCapture(e.pointerId)){fromPointer(e);}});
    update();
  })();
})();
