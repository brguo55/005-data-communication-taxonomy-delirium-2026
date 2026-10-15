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
      if(kind==='setting'){document.dispatchEvent(new CustomEvent('ix:setting',{detail:{id:id,label:LABELS.setting[id]}}));}
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
      say('Example loaded. '+sentence());
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
        say('That box takes a different kind of piece. '+LABELS[d.kind][d.id]+' goes in '+box(d.kind)+'.');
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

  /* 2 · Risk and context (#context). Natural frequencies for 1,000 patients at a chosen base rate, with the model held at
     sensitivity 0.76 and specificity 0.84. The slider is logarithmic from 0.1% to 60%, so low base rates get room. */
  (function(){
    var input=document.getElementById('ctx-rate');
    if(!input){return;}
    var SENS=0.76,SPEC=0.84,N=1000,ROWS=25;
    var scale=logRange(input,0.001,0.6);
    placeTicks(input.closest('.ix-card'),scale.frac);
    var grid=document.getElementById('ctx-grid');
    var presets=[].slice.call(document.querySelectorAll('#ctx-presets .btn'));
    // Setting presets take their rate from SETTINGS; any other preset carries its own data-rate.
    function rateOf(b){var id=b.getAttribute('data-setting');return id?SETTINGS[id].rate:+b.getAttribute('data-rate');}
    var cells=[];
    for(var i=0;i<N;i++){
      var r=document.createElementNS('http://www.w3.org/2000/svg','rect');
      // Column by column, so each outcome forms a band that reads from left to right.
      r.setAttribute('x',Math.floor(i/ROWS)*10+1);r.setAttribute('y',(i%ROWS)*10+1);
      r.setAttribute('width',8);r.setAttribute('height',8);r.setAttribute('rx',1.6);
      grid.appendChild(r);cells.push(r);
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
        for(var j=0;j<g[1];j++){cells[k++].setAttribute('class',g[0]);}
      });
      document.getElementById('ctx-flagged').textContent=c.tp+c.fp;
      document.getElementById('ctx-tp').textContent=c.tp;
      document.getElementById('ctx-fn').textContent=c.fn;
      var chance=ppv<0.5?'roughly a 1 in '+Math.round(1/ppv)+' chance ('+fmtPct(ppv)+')':'roughly a '+fmtPct(ppv)+' chance';
      var verdict=ppv<0.1?'Almost every flag is a false alarm.':ppv<0.5?'Most flags are still false alarms.':'Most flags are correct, yet about 1 in '+Math.round(1/(1-ppv))+' is a false alarm.';
      document.getElementById('ctx-plain').textContent='At a base rate of '+fmtPct(p)+', the tool flags about '+(c.tp+c.fp)+' of 1,000 patients, and about '+c.tp+' of them go on to develop delirium. A flag means '+chance+' that this patient develops delirium. '+verdict;
      presets.forEach(function(b){b.setAttribute('aria-pressed',scale.step(rateOf(b))===+input.value?'true':'false');});
    }
    function setRate(rate){input.value=scale.step(rate);update();}

    var from=document.getElementById('ctx-from');
    function clearFrom(){from.hidden=true;from.textContent='';}

    input.addEventListener('input',function(){update();clearFrom();});
    presets.forEach(function(b){b.addEventListener('click',function(){setRate(rateOf(b));clearFrom();});});
    // A setting placed in the pathway builder (section 1) moves the base rate to that setting's illustrative value.
    document.addEventListener('ix:setting',function(e){
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
    placeTicks(nIn.closest('.ix-card'),nScale.frac);
    var ci=document.getElementById('rob-ci');
    function cx(v){return 16+(v-0.5)/0.5*288;}
    function drawA(){
      var n1=Math.round(nScale.read()),iv=interval(n1);
      syncRange(nIn,n1.toLocaleString('en-US'),n1+' patients with delirium');
      document.getElementById('rob-n-sub').textContent='and '+(9*n1).toLocaleString('en-US')+' who did not, '+(10*n1).toLocaleString('en-US')+' evaluated in all';
      var svg='<line class="axis" x1="'+cx(0.5)+'" x2="'+cx(1)+'" y1="38" y2="38"/>';
      [0.5,0.6,0.7,0.8,0.9,1].forEach(function(v){svg+='<line class="axis" x1="'+cx(v)+'" x2="'+cx(v)+'" y1="38" y2="42"/><text class="t" x="'+cx(v)+'" y="55" text-anchor="middle">'+v.toFixed(1)+'</text>';});
      svg+='<rect class="band" x="'+cx(iv[0])+'" y="25" width="'+Math.max(2,cx(iv[1])-cx(iv[0]))+'" height="10" rx="5"/>';
      svg+='<circle class="dot" cx="'+cx(A)+'" cy="30" r="5"/><text class="t-strong" x="'+cx(A)+'" y="16" text-anchor="middle">0.855</text>';
      ci.innerHTML=svg;
      var other=n1<300?Math.min(1000,n1*10):Math.round(n1/10),ov=interval(other);
      var compare=other>n1?'With ten times as many, it would narrow to '+f2(ov[0])+' to '+f2(ov[1])+'.':'With a tenth as many, it would widen to '+f2(ov[0])+' to '+f2(ov[1])+'.';
      document.getElementById('rob-ci-text').textContent='With '+n1.toLocaleString('en-US')+' patients who developed delirium, the 95% interval runs from '+f2(iv[0])+' to '+f2(iv[1])+'. '+compare+' The headline 0.855 looks the same either way; only the interval shows how much evidence stands behind it.';
    }

    // B · calibration drift. Integrate over the standard normal on a fine grid instead of sampling, so the numbers are stable.
    var MU=-2.6,SD=1.2,Z95=1.6449,Z85=1.0364,STEP=0.01,grid=[];
    for(var z=-6;z<=6;z+=STEP){grid.push([z,Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*STEP]);}
    function groupMeans(lo,hi,d){
      var w=0,obs=0,pred=0;
      grid.forEach(function(g){if(g[0]>=lo&&g[0]<hi){var l=MU+SD*g[0];w+=g[1];obs+=g[1]*expit(l);pred+=g[1]*expit(l+d);}});
      return {obs:obs/w,pred:pred/w};
    }
    var cal=document.getElementById('rob-cal');
    var X0=46,X1=306,Y0=200,Y1=12,TILT=-Math.atan2(Y0-Y1,X1-X0)*180/Math.PI;
    function px(p){return X0+p*(X1-X0);}
    function py(p){return Y0-p*(Y0-Y1);}
    function drawB(){
      var d=dIn.value/100,odds=Math.exp(d);
      syncRange(dIn,d===0?'None':'×'+odds.toFixed(1)+' odds',d===0?'No overstatement':'Predicted odds '+odds.toFixed(1)+' times the observed odds');
      var svg='';
      [0,0.25,0.5,0.75,1].forEach(function(v){
        svg+='<line class="grid" x1="'+px(0)+'" x2="'+px(1)+'" y1="'+py(v)+'" y2="'+py(v)+'"/>';
        svg+='<text class="t" x="'+(X0-6)+'" y="'+(py(v)+3)+'" text-anchor="end">'+pct(v)+'</text>';
        svg+='<text class="t" x="'+px(v)+'" y="'+(Y0+14)+'" text-anchor="middle">'+pct(v)+'</text>';
      });
      // Where the predicted risks fall: 20 bins, bar height scaled to the fullest bin.
      var bins=[],k,maxB=0;
      for(k=0;k<20;k++){bins.push(0);}
      grid.forEach(function(g){var b=Math.min(19,Math.floor(expit(MU+SD*g[0]+d)*20));bins[b]+=g[1];});
      bins.forEach(function(b){if(b>maxB){maxB=b;}});
      bins.forEach(function(b,i){var h=b/maxB*46;if(h>0.3){svg+='<rect class="bar" x="'+(px(i/20)+1)+'" y="'+(Y0-h)+'" width="'+(px(1/20)-px(0)-2)+'" height="'+h+'"/>';}});
      svg+='<line class="diag" x1="'+px(0)+'" y1="'+py(0)+'" x2="'+px(1)+'" y2="'+py(1)+'"/>';
      var path='';
      for(k=1;k<=199;k++){var p=k/200,o=expit(Math.log(p/(1-p))-d);path+=(k===1?'M':'L')+px(p).toFixed(1)+' '+py(o).toFixed(1);}
      svg+='<path class="curve" d="'+path+'"/>';
      var red=groupMeans(Z95,99,d),amb=groupMeans(Z85,Z95,d);
      svg+='<circle class="pt-amber" cx="'+px(amb.pred)+'" cy="'+py(amb.obs)+'" r="6"/><circle class="pt-red" cx="'+px(red.pred)+'" cy="'+py(red.obs)+'" r="6"/>';
      svg+='<text class="t" x="'+px(1)+'" y="'+(Y0+30)+'" text-anchor="end">Predicted risk →</text>';
      svg+='<text class="t" x="9" y="'+py(0.5)+'" text-anchor="middle" transform="rotate(-90 9 '+py(0.5)+')">Observed rate →</text>';
      svg+='<text class="t" x="'+px(0.6)+'" y="'+(py(0.6)-7)+'" transform="rotate('+TILT.toFixed(1)+' '+px(0.6)+' '+(py(0.6)-7)+')">perfect calibration</text>';
      cal.innerHTML=svg;
      document.getElementById('rob-red').textContent=pct(red.pred)+' · '+pct(red.obs);
      document.getElementById('rob-amber').textContent=pct(amb.pred)+' · '+pct(amb.obs);
      document.getElementById('rob-cal-text').textContent=d===0
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
      time:{dim:1,base:11,slope:4,name:'Timeframe and absolute risk',fix:'State the timeframe, denominator, and baseline population, and show absolute risk rather than a bare score.'},
      uncertainty:{dim:2,base:10,slope:2,name:'Uncertainty range',fix:'Show an uncertainty range or a qualitative uncertainty cue, and name the main sources of uncertainty in plain language.'},
      format:{dim:3,base:6,slope:9,name:'Plain-language label and clear visual',fix:'Use a plain-language label, natural frequencies, and an accessible visual, so the output reads at a glance.'},
      review:{dim:4,base:5,slope:6,name:'Prompt to review, not just accept',fix:'Add interpretation guidance and a prompt that invites critical review rather than passive acceptance.'},
      action:{dim:5,base:7,slope:12,name:'Linked next step',fix:'Link the output to a concrete next step, and cut alert fatigue through prioritization and contextual triggering.'},
      reliability:{dim:6,base:10,slope:3,name:'Calibration and reliability status',fix:'Show calibration and reliability status, including expected false positives and false negatives and when the output should not be relied on.'},
      subgroup:{dim:7,base:6,slope:2,name:'Caution for groups the model rarely saw',fix:'Flag data limitations and say when the output should be read with caution for underrepresented groups.'}
    };
    var KEYS=Object.keys(EL),SUM_BASE=0,SUM_SLOPE=0;
    KEYS.forEach(function(k){SUM_BASE+=EL[k].base;SUM_SLOPE+=EL[k].slope;});
    var boxes=[].slice.call(document.querySelectorAll('#att-toggles input'));
    var PROFILES={
      wellSupported:{tone:'ok',name:'Well supported',text:'There is time to read the output, and the display answers the questions a careful reader would ask.'},
      stretched:{tone:'warn',name:'Stretched but supported',text:'Attention is short, but the display carries enough on its own: what the risk means and what to do next are visible at a glance.'},
      reader:{tone:'warn',name:'Relies on the reader',text:'An attentive clinician may fill some gaps from experience, but the display leaves important questions unanswered.'},
      needs:{tone:'bad',name:'Needs support',text:'Attention is short and the display leaves gaps. Misreading, overtrust, and inaction become likely, so support has to be built into the display and the workflow.'}
    };
    function cost(k,s){return EL[k].base+EL[k].slope*s;}
    function attentionWord(v){return v<20?'Full':v<45?'Some distraction':v<70?'Divided':'Rushed';}

    // The map: x is rush, y is the share of the possible gap cost that is missing at this rush level,
    // so the shading (index at x, y) and the dashed support line are exact for the dot.
    var map=document.getElementById('att-map');
    var MX0=30,MX1=312,MY0=176,MY1=8;
    function mx(s){return MX0+s*(MX1-MX0);}
    function my(g){return MY0-g*(MY0-MY1);}
    function indexAt(s,g){return Math.min(100,8+22*s+g*(SUM_BASE+SUM_SLOPE*s));}
    // Shading is nearly clear at low index values and deepens toward the top right.
    var base='<g class="heat">',i,j,C=28,R=16;
    for(i=0;i<C;i++){for(j=0;j<R;j++){
      var s0=(i+0.5)/C,g0=(j+0.5)/R,t=Math.max(0,(indexAt(s0,g0)-12)/88);
      base+='<rect class="cell" x="'+mx(i/C).toFixed(2)+'" y="'+my((j+1)/R).toFixed(2)+'" width="'+((MX1-MX0)/C).toFixed(2)+'" height="'+((MY0-MY1)/R).toFixed(2)+'" opacity="'+(0.03+0.55*Math.pow(t,1.3)).toFixed(3)+'"/>';
    }}
    base+='</g>';
    var line='';
    for(i=0;i<=40;i++){var s1=i/40,g1=(LINE-8-22*s1)/(SUM_BASE+SUM_SLOPE*s1);line+=(i?'L':'M')+mx(s1).toFixed(1)+' '+my(Math.max(0,Math.min(1,g1))).toFixed(1);}
    base+='<line class="mid" x1="'+mx(0.5)+'" x2="'+mx(0.5)+'" y1="'+MY1+'" y2="'+MY0+'"/>';
    base+='<path class="line" d="'+line+'"/>';
    base+='<rect class="frame-line" x="'+MX0+'" y="'+MY1+'" width="'+(MX1-MX0)+'" height="'+(MY0-MY1)+'"/>';
    base+='<text class="q" x="'+(MX0+6)+'" y="'+(MY1+14)+'">Relies on the reader</text>';
    base+='<text class="q" x="'+(MX1-6)+'" y="'+(MY1+14)+'" text-anchor="end">Needs support</text>';
    base+='<text class="q" x="'+(MX0+6)+'" y="'+(MY0-7)+'">Well supported</text>';
    base+='<text class="q" x="'+(MX1-6)+'" y="'+(MY0-7)+'" text-anchor="end">Stretched</text>';
    base+='<text class="ax" x="'+MX0+'" y="'+(MY0+14)+'">Full attention</text><text class="ax" x="'+MX1+'" y="'+(MY0+14)+'" text-anchor="end">Rushed →</text>';
    base+='<text class="ax" x="11" y="'+my(0.5)+'" text-anchor="middle" transform="rotate(-90 11 '+my(0.5)+')">Display gaps →</text>';

    function update(){
      var v=+rush.value,s=v/100,missing=[],raw=8+22*s;
      boxes.forEach(function(b){if(!b.checked){var k=b.getAttribute('data-el');missing.push(k);raw+=cost(k,s);}});
      var idx=Math.round(Math.min(100,raw)),g=Math.min(1,(raw-8-22*s)/(SUM_BASE+SUM_SLOPE*s));
      syncRange(rush,attentionWord(v),attentionWord(v)+', '+v+'% of the way to rushed');
      document.getElementById('att-score').textContent=idx;
      document.getElementById('att-cover').style.setProperty('--v',idx+'%');
      document.getElementById('att-meter').setAttribute('aria-valuenow',idx);
      var p=idx<LINE?(s<0.5?PROFILES.wellSupported:PROFILES.stretched):(s<0.5?PROFILES.reader:PROFILES.needs);
      document.getElementById('att-profile').setAttribute('data-tone',p.tone);
      document.getElementById('att-profile-name').textContent=p.name;
      document.getElementById('att-profile-text').textContent=p.text;
      map.innerHTML=base+'<circle class="halo" cx="'+mx(s)+'" cy="'+my(g)+'" r="13"/><circle class="dot" cx="'+mx(s)+'" cy="'+my(g)+'" r="7"/>';
      // What to add first: the missing elements that cost the most at the current level of attention.
      missing.sort(function(a,b){return cost(b,s)-cost(a,s);});
      var sup=document.getElementById('att-support');
      if(!missing.length){
        sup.innerHTML='<p class="label">Support to add</p><p class="att-done">Nothing is missing from the display. What remains is attention itself: protect time for the decision, and keep alerts few enough that each one is read.</p>';
        return;
      }
      sup.innerHTML='<p class="label">'+(idx<LINE?'Worth adding next':'Add these first')+'</p><ol class="att-list">'+missing.slice(0,3).map(function(k){
        var e=EL[k];
        return '<li><span class="att-sw" style="--c:var(--d'+e.dim+');--cf:var(--d'+e.dim+'f)" aria-hidden="true">'+e.dim+'</span><div><b>'+e.name+'</b><p>'+e.fix+'</p><span class="att-gain">Lowers the index by about '+Math.round(cost(k,s))+' points here</span></div></li>';
      }).join('')+'</ol>';
    }

    rush.addEventListener('input',update);
    boxes.forEach(function(b){b.addEventListener('change',update);});
    document.getElementById('att-bare').addEventListener('click',function(){boxes.forEach(function(b){b.checked=false;});update();});
    document.getElementById('att-full').addEventListener('click',function(){boxes.forEach(function(b){b.checked=true;});update();});
    // Dragging anywhere on the map moves attention, like dragging the dot itself.
    var dragging=false;
    function fromPointer(e){
      var r=map.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*320;
      rush.value=Math.round(Math.max(0,Math.min(1,(x-MX0)/(MX1-MX0)))*100);
      update();
    }
    map.addEventListener('pointerdown',function(e){dragging=true;try{map.setPointerCapture(e.pointerId);}catch(err){}fromPointer(e);});
    map.addEventListener('pointermove',function(e){if(dragging){fromPointer(e);}});
    map.addEventListener('pointerup',function(){dragging=false;});
    map.addEventListener('pointercancel',function(){dragging=false;});
    update();
  })();
})();
