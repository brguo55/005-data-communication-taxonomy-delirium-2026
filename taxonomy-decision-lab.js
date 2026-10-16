/* Decision lab page only · taxonomy-decision-lab.html. Loaded after taxonomy-shared.js.
   One block per section; each block returns early when its section is not on the page.
   Blocks talk to each other through events on document (see "lab:setting" below).
   Every text exists in English and Chinese. Markup written here carries both as [data-l] pairs (bi), so it follows the
   language switch by itself; plain text, SVG labels and attributes use the current language (L) and are redrawn on the
   shared "taxonomy:lang" event. Bilingual data is stored as {en:…, zh:…}. */
(function(){
  'use strict';

  function isZh(){return /^zh/i.test(document.documentElement.lang);}
  function L(en,zh){return isZh()?zh:en;}
  function T(x){return isZh()?x.zh:x.en;}
  function bi(en,zh){return '<span data-l="en">'+en+'</span><span data-l="zh">'+zh+'</span>';}
  function biT(x){return bi(x.en,x.zh);}
  // An attribute in the current language that the shared script can switch later (it reads data-en-* and data-zh-*).
  function biAttr(name,en,zh){
    var key=name==='aria-label'?'label':name;
    return name+'="'+L(en,zh)+'" data-en-'+key+'="'+en+'" data-zh-'+key+'="'+zh+'"';
  }
  function onLang(fn){document.addEventListener('taxonomy:lang',fn);}

  var DIMS=[
    {en:'Risk information',zh:'风险信息'},
    {en:'Uncertainty communication',zh:'不确定性沟通'},
    {en:'Presentation and format',zh:'呈现与格式'},
    {en:'Patient and clinician interpretation',zh:'患者与医生的解读'},
    {en:'Decision support',zh:'决策支持'},
    {en:'Explainability and model communication',zh:'可解释性与模型沟通'},
    {en:'Equity and subgroup reliability',zh:'公平性与亚组可靠性'},
    {en:'Shared decision-making',zh:'医患共同决策'}
  ];
  // Each dimension's colors, as on taxonomy.html.
  function dimStyle(n){return 'style="--c:var(--d'+n+');--cf:var(--d'+n+'f)"';}
  // Full chip: links to that dimension's panel on the taxonomy page.
  function dimChip(n){
    return '<li><a class="chip" href="taxonomy.html#dim-'+n+'" '+dimStyle(n)+'><i aria-hidden="true"></i>'+n+' · '+biT(DIMS[n-1])+'</a></li>';
  }
  // Numbered badge for tight spaces. As a link (dimTag) it carries the name as a tooltip and accessible label.
  function dimBadge(n){
    return '<span class="lab-dim" '+dimStyle(n)+' aria-hidden="true">'+n+'</span>';
  }
  function dimTag(n){
    var d=DIMS[n-1];
    return '<li><a class="lab-dim" href="taxonomy.html#dim-'+n+'" '+dimStyle(n)+' '+biAttr('title',d.en,d.zh)+' '+biAttr('aria-label','Dimension '+n+', '+d.en,'维度 '+n+'：'+d.zh)+'>'+n+'</a></li>';
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
  var WARD_BASE={en:'About 10 in 100 patients on this ward',zh:'这个病房约每 100 位患者中有 10 位'};
  var RECALIBRATED={en:'Checked last month: predictions on this ward had been running higher than observed, so this estimate has been recalibrated.',zh:'上月检查：这个病房的预测一直高于实际，因此这个估计已重新校准。'};
  var WARD_NEXT={en:'Start the ward’s delirium prevention measures and screen for delirium each shift.',zh:'启动病房的谵妄预防措施，并每班筛查谵妄。'};
  var CASES=[
    {id:'ward-red',title:{en:'Medical ward · 84-year-old woman',zh:'内科病房 · 84 岁女性'},
     vignette:{en:'Admitted yesterday with pneumonia. Hard of hearing, new to the ward, oriented this morning.',zh:'昨天因肺炎入院。听力不好，刚转入病房，今早定向力正常。'},
     a:{kind:'list',icon:'red',unit:{en:'Medical ward 4B',zh:'内科病房 4B'}},
     b:{risk:30,lo:24,hi:37,base:WARD_BASE,reliability:RECALIBRATED,next:WARD_NEXT},
     ref:30},
    {id:'clinic-flag',title:{en:'Pre-surgical clinic · 67-year-old man',zh:'术前门诊 · 67 岁男性'},
     when:{en:'in the first three days after surgery',zh:'在术后头三天内'},
     vignette:{en:'Planned knee replacement next week. Lives independently, no memory problems, takes no sedatives.',zh:'下周计划做膝关节置换。独立生活，没有记忆问题，不服用镇静药。'},
     a:{kind:'flag',text:{en:'High risk of postoperative delirium',zh:'术后谵妄高风险'},sub:{en:'Above threshold',zh:'高于阈值'}},
     b:{risk:4,lo:2,hi:7,base:{en:'About 1 in 100 patients seen in this clinic',zh:'这个门诊约每 100 位患者中有 1 位'},
        reliability:{en:'Flagged because the estimate is above the tool’s 2% screening threshold. At this estimate, about 24 of 25 patients like him do not develop delirium.',zh:'之所以被标记，是因为估计值高于工具 2% 的筛查阈值。在这个估计下，像他这样的患者约 25 位中有 24 位不会发生谵妄。'},
        next:{en:'Share the estimate with the surgical team and plan delirium screening after surgery.',zh:'把这个估计告诉手术团队，并计划术后筛查谵妄。'}},
     ref:4},
    {id:'icu-score',title:{en:'Intensive care unit · 71-year-old man',zh:'重症监护室 · 71 岁男性'},
     vignette:{en:'Second day on a ventilator after abdominal surgery. Sedated, waking when sedation is paused.',zh:'腹部手术后上呼吸机第二天。处于镇静状态，暂停镇静时会醒来。'},
     a:{kind:'value',label:{en:'Delirium risk score',zh:'谵妄风险评分'},value:'0.55'},
     b:{risk:55,lo:47,hi:63,base:{en:'About 30 in 100 patients in this unit',zh:'这个科室约每 100 位患者中有 30 位'},
        reliability:{en:'Checked last quarter: predictions in this unit matched observed rates.',zh:'上季度检查：这个科室的预测与实际发生率一致。'},
        next:{en:'Review sedation and screen for delirium each shift.',zh:'评估镇静方案，并每班筛查谵妄。'}},
     ref:55},
    {id:'ward-none',title:{en:'Surgical ward · 79-year-old woman',zh:'外科病房 · 79 岁女性'},
     vignette:{en:'Admitted from a nursing home for hip fracture repair tomorrow. Lives with moderate dementia.',zh:'从养老院入院，明天做髋部骨折修复手术。患有中度痴呆。'},
     a:{kind:'list',icon:'none',unit:{en:'Surgical ward 2A',zh:'外科病房 2A'}},
     b:{risk:8,lo:3,hi:20,base:WARD_BASE,
        reliability:{en:'Checked last month: predictions on this ward matched observed rates overall.',zh:'上月检查：这个病房的预测总体上与实际发生率一致。'},
        caution:{en:'The model saw few patients admitted from nursing homes or living with dementia. For patients like her, its estimate is likely too low.',zh:'模型见过的养老院入院或痴呆患者很少。对像她这样的患者，这个估计很可能偏低。'},
        next:{en:'Use clinical judgment; consider starting prevention measures and screening each shift.',zh:'请结合临床判断；考虑启动预防措施，并每班筛查。'}},
     ref:25},
    {id:'ortho-value',title:{en:'Orthopedic ward · 76-year-old man',zh:'骨科病房 · 76 岁男性'},
     vignette:{en:'Day one after hip fracture surgery. Taking opioids for pain, slept poorly last night.',zh:'髋部骨折术后第一天。正在用阿片类药物止痛，昨晚睡得不好。'},
     a:{kind:'value',label:{en:'Predicted probability of delirium',zh:'谵妄预测概率'},value:'0.20'},
     b:{risk:20,lo:9,hi:38,base:WARD_BASE,
        reliability:{en:'The model was checked on few patients after hip surgery, so the range around this estimate is wide.',zh:'这个模型只在很少的髋部手术后患者身上检验过，所以这个估计的范围很宽。'},
        next:{en:'Start prevention measures and screen for delirium each shift.',zh:'启动预防措施，并每班筛查谵妄。'}},
     ref:20},
    {id:'ward-amber',title:{en:'Medical ward · 81-year-old woman',zh:'内科病房 · 81 岁女性'},
     vignette:{en:'Admitted with a urinary tract infection. Mild memory problems at home, needed help to the bathroom overnight.',zh:'因尿路感染入院。在家时有轻度记忆问题，夜里需要人扶着去卫生间。'},
     a:{kind:'list',icon:'amber',unit:{en:'Medical ward 4B',zh:'内科病房 4B'}},
     b:{risk:18,lo:13,hi:24,base:WARD_BASE,reliability:RECALIBRATED,next:WARD_NEXT},
     ref:18}
  ];
  var ACTIONS={
    usual:{en:'Continue usual care',zh:'继续常规护理'},
    reassess:{en:'Reassess at the next shift',zh:'下一班次再评估'},
    prevent:{en:'Start prevention now',zh:'现在开始预防'},
    review:{en:'Ask the team to review now',zh:'现在请团队查看'}
  };

  (function(){
    var box=document.getElementById('test-box');
    if(!box){return;}
    var intro=document.getElementById('test-intro'),caseEl=document.getElementById('test-case'),done=document.getElementById('test-done');
    var form=document.getElementById('test-form'),est=document.getElementById('test-est'),range=document.getElementById('test-range');
    var next=document.getElementById('test-next'),display=document.getElementById('test-display');
    placeTicks(range.parentNode,function(v){return v/100;});

    // <option> cannot hold markup, so the role labels are swapped here; their values stay English for the CSV.
    function syncOptions(){
      [].forEach.call(document.querySelectorAll('#test-role option[data-zh]'),function(o){
        if(!o.hasAttribute('data-en')){o.setAttribute('data-en',o.text);}
        o.text=isZh()?o.getAttribute('data-zh'):o.getAttribute('data-en');
      });
    }
    syncOptions();

    // ?group=1 or ?group=2 in the link assigns a group; otherwise one is picked at random.
    var asked=/[?&]group=([12])/.exec(location.search);
    var t={group:asked?+asked[1]:(Math.random()<0.5?1:2),answers:[],i:0,start:0,touched:false};

    var NEXT_48={en:'in the next 48 hours',zh:'在接下来 48 小时内'};
    function when(c){return c.when||NEXT_48;}
    function versionOf(i){return (i%2===0)===(t.group===1)?'A':'B';}
    function displayA(a){
      if(a.kind==='list'){
        var icon=a.icon==='none'?'':'<span class="icon '+a.icon+'"></span>';
        return '<div class="ward test-ward"><div class="ward-bar"><span>'+bi('Patient list · '+a.unit.en,'患者列表 · '+a.unit.zh)+'</span><span>'+bi('Delirium risk','谵妄风险')+'</span></div>'
          +'<table><tbody><tr><td>11</td><td><span class="redact" style="--w:58%"></span></td><td><span class="icon amber"></span></td></tr>'
          +'<tr class="test-this"><td>12</td><td>'+bi('This patient','这位患者')+'</td><td>'+icon+'</td></tr>'
          +'<tr><td>14</td><td><span class="redact" style="--w:46%"></span></td><td></td></tr></tbody></table></div>'
          +'<ul class="legend"><li><span class="icon red"></span>'+bi('Very high risk group, 95th to 100th percentile','极高风险组，第 95 至 100 百分位')+'</li>'
          +'<li><span class="icon amber"></span>'+bi('High risk group, 85th to 94th percentile','高风险组，第 85 至 94 百分位')+'</li>'
          +'<li><span class="icon none"></span>'+bi('No symbol for patients classified as low risk','被判为低风险的患者不显示标记')+'</li></ul>';
      }
      var head='<p class="label">'+bi('Delirium risk tool','谵妄风险工具')+'</p>';
      if(a.kind==='flag'){return '<div class="test-widget">'+head+'<p class="test-flag">'+biT(a.text)+'</p><p class="test-widget-sub">'+biT(a.sub)+'</p></div>';}
      return '<div class="test-widget">'+head+'<p class="test-widget-value"><span>'+biT(a.label)+'</span><b class="num">'+a.value+'</b></p></div>';
    }
    function displayB(b,win){
      var cells='';
      for(var k=0;k<100;k++){cells+='<i'+(k<b.risk?' class="on"':'')+'></i>';}
      return '<div class="test-full">'
        +'<div class="test-main"><div><p class="test-big">'+bi('<b>'+b.risk+'</b> in 100','每 100 人中 <b>'+b.risk+'</b> 人')+'</p><p>'+bi('similar patients develop delirium '+win.en,'类似患者'+win.zh+'会发生谵妄')+'</p></div>'
        +'<span class="test-array" role="img" '+biAttr('aria-label',b.risk+' of 100 squares filled','100 个方格中有 '+b.risk+' 个被填满')+'>'+cells+'</span></div>'
        +'<div>'+bi('<b>Likely range:</b> '+b.lo+' to '+b.hi+' in 100','<b>可能范围：</b>每 100 人中 '+b.lo+' 到 '+b.hi+' 人')+'</div>'
        +'<div>'+bi('<b>For comparison:</b> '+b.base.en+' develop delirium','<b>对比：</b>'+b.base.zh+'发生谵妄')+'</div>'
        +'<div>'+bi('<b>Reliability:</b> '+b.reliability.en,'<b>可靠性：</b>'+b.reliability.zh)+'</div>'
        +(b.caution?'<div class="test-caution">'+bi('<b>Caution:</b> '+b.caution.en,'<b>注意：</b>'+b.caution.zh)+'</div>':'')
        +'<div>'+bi('<b>Suggested next step:</b> '+b.next.en,'<b>建议的下一步：</b>'+b.next.zh)+'</div></div>';
    }
    function checked(name){var el=form.querySelector('input[name="'+name+'"]:checked');return el?el.value:'';}
    function ready(){next.disabled=!(t.touched&&checked('test-act')&&checked('test-sure'));}
    function showEstimate(){
      var v=+est.value;
      syncRange(est,L(v+' in 100','100 人中 '+v+' 人'),L(v+' in 100, '+v+' percent','100 人中 '+v+' 人，即 '+v+'%'));
    }

    function showCase(){
      var c=CASES[t.i],w=when(c);
      document.getElementById('test-step').innerHTML=bi('Case '+(t.i+1)+' of '+CASES.length,'第 '+(t.i+1)+' 个病例，共 '+CASES.length+' 个');
      document.getElementById('test-bar-fill').style.width=(t.i/CASES.length*100)+'%';
      document.getElementById('test-patient').innerHTML=biT(c.title);
      document.getElementById('test-vignette').innerHTML=biT(c.vignette);
      document.getElementById('test-q1').innerHTML=bi('1. What is the chance this patient develops delirium '+w.en+'?','1. 这位患者'+w.zh+'发生谵妄的可能性有多大？');
      display.innerHTML=versionOf(t.i)==='A'?displayA(c.a):displayB(c.b,w);
      form.reset();
      est.value=50;
      t.touched=false;
      range.classList.add('test-unset');
      est.style.setProperty('--fill','0%');
      document.querySelector('output[for="test-est"]').textContent='–';
      next.innerHTML=t.i===CASES.length-1?bi('Finish','完成'):bi('Next case','下一个病例');
      ready();
      t.start=performance.now();
      document.getElementById('test-patient').focus();
    }
    // Results: distance from each scenario's reference risk, in percentage points, averaged per display version.
    var VERSION_NAME={A:{en:'Score only',zh:'仅分数'},B:{en:'Full display',zh:'完整显示'}};
    function mean(xs){var sum=0;xs.forEach(function(x){sum+=x;});return xs.length?sum/xs.length:0;}
    function summary(v){
      var rows=t.answers.filter(function(a){return a.version===v;});
      var off=Math.round(mean(rows.map(function(a){return Math.abs(a.estimate-a.ref);}))),sure=mean(rows.map(function(a){return a.sure;})).toFixed(1);
      return '<div><dt>'+biT(VERSION_NAME[v])+'</dt><dd>'+bi('<b class="num">'+off+'</b> points off on average','平均偏差 <b class="num">'+off+'</b> 个百分点')+'</dd><dd>'+bi('Confidence '+sure+' of 5','确定程度 '+sure+' / 5')+'</dd></div>';
    }
    function finish(){
      t.finishedAt=new Date().toISOString();
      t.lang=isZh()?'zh':'en';
      caseEl.hidden=true;
      done.hidden=false;
      done.innerHTML='<p class="label">'+bi('Your results · '+t.participant+' · group '+t.group,'你的结果 · '+t.participant+' · 第 '+t.group+' 组')+'</p>'
        +'<h3 class="test-patient">'+bi('Thank you. Here is how your estimates compare','谢谢！下面是你的估计与参考值的比较')+'</h3>'
        +'<dl class="test-summary">'+summary('A')+summary('B')+'</dl>'
        +'<p class="test-key"><span class="test-key-ref"></span>'+bi('Reference risk in the scenario','情境中的参考风险')+'<span class="test-key-you"></span>'+bi('Your estimate','你的估计')+'</p>'
        +'<ol class="test-results">'+t.answers.map(function(a){
          var c=CASES[a.index],off=Math.abs(a.estimate-a.ref);
          return '<li><div class="test-result-head"><b>'+biT(c.title)+'</b><span class="test-tag test-tag-'+a.version+'">'+biT(VERSION_NAME[a.version])+'</span></div>'
            +'<div class="test-strip" role="img" '+biAttr('aria-label','Your estimate '+a.estimate+' in 100, reference '+a.ref+' in 100','你的估计为 100 人中 '+a.estimate+' 人，参考值为 100 人中 '+a.ref+' 人')+'><span class="test-ref" style="left:'+a.ref+'%"></span><span class="test-you" style="left:'+a.estimate+'%"></span></div>'
            +'<p class="test-line">'+bi('You '+a.estimate+' · reference '+a.ref+' · '+off+' points off · '+ACTIONS[a.action].en+' · sure '+a.sure+' of 5 · '+a.seconds+' s',
                                      '你 '+a.estimate+' · 参考 '+a.ref+' · 偏差 '+off+' · '+ACTIONS[a.action].zh+' · 确定程度 '+a.sure+'/5 · '+a.seconds+' 秒')+'</p></li>';
        }).join('')+'</ol>'
        +'<p class="lab-small">'+bi('Points off is the distance between your estimate and the scenario’s reference risk, in percentage points. One person’s answers say little on their own; the study compares answers pooled across clinicians.',
                                   '偏差是你的估计与情境参考风险之间的差距，单位是百分点。单个人的回答说明不了太多；研究会汇总比较许多临床医生的回答。')+'</p>'
        +'<div class="test-added"><p class="label">'+bi('What the full display added','完整显示多提供了什么')+'</p><ul class="chips">'+[1,2,3,6,7,5].map(function(n){return dimChip(n);}).join('')+'</ul></div>'
        +'<label class="test-field test-comment"><span>'+bi('Anything that confused you, or that you would change? <em>optional</em>','有没有让你困惑、或你想修改的地方？<em>选填</em>')+'</span><textarea id="test-comment" rows="3"></textarea></label>'
        +'<div class="test-next-row"><button class="btn primary" type="button" id="test-download">'+bi('Download answers (CSV)','下载回答（CSV）')+'</button>'
        +'<button class="btn" type="button" id="test-copy">'+bi('Copy answers','复制回答')+'</button>'
        +'<button class="btn" type="button" id="test-again">'+bi('Start over for the next person','为下一位参与者重新开始')+'</button></div>'
        +'<p class="lab-small" id="test-saved" aria-live="polite"></p>';
      done.focus();
    }

    // One CSV row per case, with the participant details and comment repeated so each row stands alone. Codes and
    // labels stay English whatever the page language, so files from different participants line up; language records
    // which version of the page the participant used.
    function csv(){
      function cell(v){v=String(v===undefined||v===null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
      var comment=document.getElementById('test-comment').value.trim();
      var lines=[['participant','role','years_in_practice','group','case_number','case_id','display','estimate_in_100','reference_in_100','points_off','action','sure_1_to_5','seconds','comment','finished_at','language'].join(',')];
      t.answers.forEach(function(a,i){
        lines.push([t.participant,t.role,t.years,t.group,i+1,CASES[a.index].id,VERSION_NAME[a.version].en,a.estimate,a.ref,Math.abs(a.estimate-a.ref),a.action,a.sure,a.seconds,comment,t.finishedAt,t.lang].map(cell).join(','));
      });
      return lines.join('\n')+'\n';
    }
    function saved(en,zh){document.getElementById('test-saved').innerHTML=bi(en,zh);}
    done.addEventListener('click',function(e){
      var btn=e.target.closest('button'),id=btn?btn.id:'';
      if(id==='test-download'){
        var name='decision-lab-'+t.participant+'.csv';
        var url=URL.createObjectURL(new Blob([csv()],{type:'text/csv'}));
        var a=document.createElement('a');
        a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
        setTimeout(function(){URL.revokeObjectURL(url);},1000);
        saved('Saved '+name+'. Please send this file to the research team.','已保存 '+name+'。请把这个文件发给研究团队。');
      }else if(id==='test-copy'){
        var text=csv();
        var fallback=function(){
          saved('Copying is blocked here. Select the text below and copy it.','这里无法直接复制。请选中下面的文字后复制。');
          var ta=document.createElement('textarea');
          ta.className='test-copybox';ta.readOnly=true;ta.value=text;ta.rows=6;
          done.appendChild(ta);ta.select();
        };
        try{navigator.clipboard.writeText(text).then(function(){saved('Answers copied. Paste them into an email or a file for the research team.','回答已复制。请粘贴到邮件或文件中发给研究团队。');},fallback);}catch(err){fallback();}
      }else if(id==='test-again'){
        // Without a group in the link, alternate groups between participants to keep them balanced.
        if(!asked){t.group=t.group===1?2:1;}
        t.answers=[];t.i=0;
        intro.reset();
        done.hidden=true;done.innerHTML='';
        intro.hidden=false;
        document.getElementById('test-role').focus();
      }
    });

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
      t.answers.push({index:t.i,version:versionOf(t.i),estimate:+est.value,ref:CASES[t.i].ref,action:checked('test-act'),sure:+checked('test-sure'),seconds:Math.round((performance.now()-t.start)/100)/10});
      t.i++;
      if(t.i<CASES.length){showCase();}else{finish();}
    });
    onLang(function(){syncOptions();if(t.touched){showEstimate();}});
  })();

  // Hospital settings, shared by the pathway builder (section 1) and the base-rate explorer (section 2).
  // The rates are illustrative, chosen to span a range; they are not prevalence estimates.
  var SETTINGS={
    icu:{phrase:{en:'in an intensive care unit',zh:'重症监护室'},rate:0.3},
    ward:{phrase:{en:'on an inpatient ward',zh:'住院病房'},rate:0.1},
    outpatient:{phrase:{en:'in an outpatient or pre-surgical clinic',zh:'门诊或术前门诊'},rate:0.01}
  };

  /* 1 · Pathway builder (#pathway). Pieces are dragged with pointer events, so mouse, pen and touch all work;
     pressing a piece (click, Enter or Space) places it too. Each kind of piece has exactly one box on the board. */
  (function(){
    var pw=document.getElementById('pw');
    if(!pw){return;}
    // How each piece reads in the summary sentence. Chinese builds the sentence in its own word order (see sentence()).
    var PHRASES={
      data:{single:{en:'derived from one hospital’s EHR',zh:'基于单家医院 EHR 开发的'},multi:{en:'derived from EHR data from several sites',zh:'基于多中心 EHR 数据开发的'}},
      setting:{},
      patients:{match:{en:'patients who resemble the development cohort',zh:'与开发队列相似的患者'},differ:{en:'patients who differ from the development cohort',zh:'与开发队列不同的患者'}},
      model:{risk:{en:'A risk prediction model',zh:'风险预测模型'},llm:{en:'A large language model',zh:'大语言模型'},cds:{en:'A decision support alert',zh:'决策支持警报'},expert:{en:'A rule-based expert system',zh:'基于规则的专家系统'}},
      users:{nurses:{en:'nurses',zh:'护士'},physicians:{en:'physicians',zh:'医生'},patients:{en:'patients and families',zh:'患者及家属'}}
    };
    Object.keys(SETTINGS).forEach(function(id){PHRASES.setting[id]=SETTINGS[id].phrase;});
    var GAP={
      data:{en:'derived from some data',zh:'基于某些数据开发的'},setting:{en:'in some setting',zh:'某个场景'},
      patients:{en:'some patients',zh:'某些患者'},model:{en:'A model',zh:'某个模型'},users:{en:'some users',zh:'某些使用者'}
    };
    var BOX={data:{en:'the data box',zh:'数据框'},setting:{en:'the setting box',zh:'场景框'},patients:{en:'the patients box',zh:'患者框'},model:{en:'the model box',zh:'模型框'},users:{en:'the users box',zh:'使用者框'}};
    var EXAMPLE={data:'single',setting:'ward',patients:'match',model:'risk',users:'nurses'};
    function both(a,b){return {en:a.en+b.en,zh:a.zh+b.zh};}

    // What each checkpoint on the board asks, given the pieces placed so far. Returns null until its pieces are in place.
    var CHECKS=[
      {key:'fair',name:{en:'Fairness across patient groups',zh:'跨患者群体的公平性'},wait:{en:'Place the patients.',zh:'请放入患者。'},fn:function(s){
        if(!s.patients){return null;}
        return s.patients==='match'
          ?{dims:[7],text:{en:'The patients resemble the development cohort, so the headline performance is a reasonable starting point. Performance can still differ by sex, age, or language, and those subgroup results should be shown where they exist.',
                           zh:'患者与开发队列相似，所以总体性能是一个合理的起点。但性能仍可能因性别、年龄或语言而不同，有亚组结果时应当显示出来。'}}
          :{dims:[7],text:{en:'The patients differ from the development cohort. Performance and calibration may not carry over, and users should be told when an output deserves extra caution for groups the model rarely saw.',
                           zh:'患者与开发队列不同。性能和校准可能无法照搬过来；当输出对模型很少见过的人群需要格外谨慎时，应当告知使用者。'}};
      }},
      {key:'output',name:{en:'Uncertainty at the model output',zh:'模型输出处的不确定性'},wait:{en:'Place a model.',zh:'请放入一个模型。'},fn:function(s){
        if(!s.model){return null;}
        var m={
          risk:{dims:[1,2,6],text:{en:'A risk score needs its timeframe, its absolute scale, and an uncertainty range. Calibration matters as much as ranking: a well-ranked score can still overstate risk.',zh:'风险评分需要写明时间范围、绝对尺度和不确定性范围。校准与排序同样重要：排序很好的评分仍可能高估风险。'}},
          llm:{dims:[2,3,6],text:{en:'Fluent generated text can sound more certain than the evidence behind it. The output should say what the model is unsure about, and its explanations should not be read as causal.',zh:'流畅的生成文字可能听起来比背后的证据更确定。输出应当说明模型对哪些地方没有把握，它的解释也不应被理解为因果。'}},
          cds:{dims:[1,5,6],text:{en:'An alert turns a probability into a yes or no. The threshold behind it, and the false alarms it accepts, should be explained rather than hidden.',zh:'警报把概率变成了“是”或“否”。它背后的阈值，以及它接受的误报，应当解释清楚，而不是藏起来。'}},
          expert:{dims:[1,6],text:{en:'Rules are transparent but brittle. The output should say which conditions the rules were written for and when clinical judgment should override them.',zh:'规则透明但脆弱。输出应当说明这些规则是为哪些条件写的，以及何时应由临床判断推翻它们。'}}
        }[s.model];
        var t=m.text;
        if(s.data==='single'){t=both(t,{en:' Derived from one site, it may not transport elsewhere: report external validation, or say that none exists.',zh:'由于只来自一家医院，它可能无法迁移到别处：请报告外部验证，或说明没有做过。'});}
        if(s.data==='multi'){t=both(t,{en:' Derived from several sites, it should report whether performance holds at each site, not only on average.',zh:'由于来自多家医院，它应当报告各家医院的性能是否都成立，而不只是平均值。'});}
        return {dims:m.dims,text:t};
      }},
      {key:'exchange',name:{en:'Uncertainty in the exchange with users',zh:'与使用者交互中的不确定性'},wait:{en:'Place a model and its users.',zh:'请放入模型和使用者。'},fn:function(s){
        if(!s.model||!s.users){return null;}
        var u={
          nurses:{dims:[3,4,5],text:{en:'Nurses meet the output inside busy patient lists and rounds. Keep the encoding simple, label what each color or icon means, and avoid adding to alert burden.',zh:'护士是在繁忙的患者列表和查房中看到输出的。编码要简单，标明每种颜色或图标的含义，并避免增加警报负担。'}},
          physicians:{dims:[4,6],text:{en:'Physicians weigh the output against their own judgment. Showing reliability next to the estimate lets trust be calibrated instead of all or nothing.',zh:'医生会把输出与自己的判断相权衡。在估计旁边显示可靠性，能让信任有分寸，而不是要么全信、要么不信。'}},
          patients:{dims:[3,4,8],text:{en:'Patients and families need plain language, natural frequencies, and visual aids. A bare probability is easy to misread.',zh:'患者及家属需要通俗的语言、自然频数和图示。只给一个概率很容易被误读。'}}
        }[s.users];
        var t=u.text;
        if(s.model==='llm'){t=both(t,{en:' The exchange runs both ways: how a question is put to the model can change its answer.',zh:'这种交互是双向的：怎样向模型提问，可能会改变它的回答。'});}
        return {dims:u.dims,text:t};
      }},
      {key:'decision',name:{en:'Uncertainty at the decision',zh:'决策处的不确定性'},wait:{en:'Place the setting and the users.',zh:'请放入场景和使用者。'},fn:function(s){
        if(!s.users||!s.setting){return null;}
        var d={
          icu:{dims:[5],text:{en:'In the ICU, alarms compete for attention and many patients are already at high risk. Link the output to a specific next step and a time window.',zh:'在 ICU，各种报警争夺注意力，很多患者本来就是高风险。请把输出与具体的下一步和时间窗口联系起来。'}},
          ward:{dims:[5],text:{en:'On a ward, a flag helps only if someone knows what happens next: who reassesses the patient, which prevention measures start, and when.',zh:'在病房，只有当有人知道接下来做什么时，标记才有用：谁来重新评估患者、启动哪些预防措施、什么时候开始。'}},
          outpatient:{dims:[5,8],text:{en:'Before admission or surgery, delirium is a future and uncertain event. The output should support a conversation about trade-offs rather than issue a directive.',zh:'在入院或手术之前，谵妄是一个未来且不确定的事件。输出应当支持关于利弊取舍的讨论，而不是下达指令。'}}
        }[s.setting];
        var dims=d.dims.slice(),t=d.text;
        if(s.users==='patients'){if(dims.indexOf(8)<0){dims.push(8);}t=both(t,{en:' With patients and families at the table, their goals and values belong in the decision.',zh:'当患者及家属参与讨论时，他们的目标和价值观应当纳入决策。'});}
        return {dims:dims,text:t};
      }}
    ];

    var state={data:null,setting:null,patients:null,model:null,users:null};
    var chips=[].slice.call(pw.querySelectorAll('.pw-chip'));
    // Piece labels come from the tray buttons, which hold both languages (a label that is the same in both, like ICU, has no pair).
    var LABELS={};
    chips.forEach(function(c){
      var kind=c.getAttribute('data-kind'),en=c.querySelector('[data-l="en"]'),zh=c.querySelector('[data-l="zh"]'),plain=c.textContent.trim();
      (LABELS[kind]=LABELS[kind]||{})[c.getAttribute('data-id')]={en:en?en.textContent:plain,zh:zh?zh.textContent:plain};
    });
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
      var lb=LABELS[kind][id];
      if(!quiet){say(L(lb.en+' placed in '+BOX[kind].en+'.',lb.zh+' 已放入'+BOX[kind].zh+'。'));}
      if(kind==='setting'){document.dispatchEvent(new CustomEvent('lab:setting',{detail:{id:id,label:lb}}));}
    }
    function removePiece(kind){
      var id=state[kind];
      if(!id){return;}
      state[kind]=null;
      render();
      var lb=LABELS[kind][id];
      say(L(lb.en+' removed from '+BOX[kind].en+'.',lb.zh+' 已从'+BOX[kind].zh+'移除。'));
    }

    // The summary sentence in each language, with a dashed placeholder for every piece not yet placed.
    function part(kind,lang){
      var x=state[kind]?PHRASES[kind][state[kind]]:GAP[kind];
      return state[kind]?x[lang]:'<span class="ghost">'+x[lang]+'</span>';
    }
    function sentenceEn(){return part('model','en')+' '+part('data','en')+', used '+part('setting','en')+' by '+part('users','en')+', for '+part('patients','en')+'.';}
    function sentenceZh(){return '一个'+part('data','zh')+part('model','zh')+'，由'+part('users','zh')+'在'+part('setting','zh')+'使用，面向'+part('patients','zh')+'。';}

    function render(){
      chips.forEach(function(c){c.setAttribute('aria-pressed',state[c.getAttribute('data-kind')]===c.getAttribute('data-id')?'true':'false');});
      Object.keys(slots).forEach(function(kind){
        var id=state[kind],body=slots[kind].querySelector('.pw-slot-body'),lb=id&&LABELS[kind][id];
        slots[kind].classList.toggle('pw-filled',!!id);
        body.innerHTML=id
          ?'<span class="pw-placed"><span>'+biT(lb)+'</span><button type="button" class="pw-x" data-remove="'+kind+'" '+biAttr('aria-label','Remove '+lb.en,'移除'+lb.zh)+'>×</button></span>'
          :'<span class="pw-empty">'+bi('Drop here','拖到这里')+'</span>';
      });
      var count={},findings='';
      CHECKS.forEach(function(c){
        var r=c.fn(state),el=checkEls[c.key];
        el.classList.toggle('pw-on',!!r);
        el.querySelector('.pw-check-body').innerHTML=r?'<ul class="pw-dims">'+r.dims.map(dimTag).join('')+'</ul>':'<p class="pw-check-wait">'+biT(c.wait)+'</p>';
        if(r){r.dims.forEach(function(n){count[n]=(count[n]||0)+1;});}
        findings+='<li class="pw-finding'+(r?'':' pw-wait')+'"><p class="pw-finding-name">'+biT(c.name)+'</p><p>'
          +(r?biT(r.text):bi(c.wait.en+' This check appears once they are on the board.',c.wait.zh+'放好之后就会显示这项检查。'))+'</p>'
          +(r?'<ul class="chips">'+r.dims.map(dimChip).join('')+'</ul>':'')+'</li>';
      });
      var stake=Object.keys(count).map(Number).sort(function(a,b){return count[b]-count[a]||a-b;});
      read.innerHTML='<p class="label">'+bi('Your pathway','你的路径')+'</p><p class="pw-sentence">'+bi(sentenceEn(),sentenceZh())+'</p>'
        +(state.setting?'<p class="pw-next"><a href="#context">'+bi('See what a flag means '+SETTINGS[state.setting].phrase.en+' ↓','看看在'+SETTINGS[state.setting].phrase.zh+'里警报意味着什么 ↓')+'</a></p>':'')
        +'<ol class="pw-findings">'+findings+'</ol>'
        +(stake.length?'<div class="pw-stake"><p class="label">'+bi('Dimensions at stake, most often first','涉及的维度（按出现次数排序）')+'</p><ul class="chips">'+stake.map(dimChip).join('')+'</ul></div>':'');
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
      say(L('Example loaded. '+sentenceEn(),'已载入示例。'+sentenceZh()));
    });
    document.getElementById('pw-clear').addEventListener('click',function(){
      Object.keys(state).forEach(function(k){state[k]=null;});
      render();
      say(L('Board cleared.','面板已清空。'));
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
        var lb=LABELS[d.kind][d.id];
        say(L('That box takes a different kind of piece. '+lb.en+' goes in '+BOX[d.kind].en+'.','这个框放的是另一类部件。'+lb.zh+' 应放入'+BOX[d.kind].zh+'。'));
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
      var p=scale.read(),c=split(p),flagged=c.tp+c.fp;
      var ppv=SENS*p/(SENS*p+(1-SPEC)*(1-p)),oneIn=Math.round(1/ppv),falseIn=Math.round(1/(1-ppv));
      syncRange(input,fmtPct(p));
      // Flagged patients first (true alerts, then false alarms), then missed cases, then everyone else.
      var k=0;
      [['ctx-tp',c.tp],['ctx-fp',c.fp],['ctx-fn',c.fn],['ctx-tn',c.tn]].forEach(function(g){
        for(var j=0;j<g[1];j++,k++){
          if(cellClass[k]!==g[0]){cellClass[k]=g[0];cells[k].setAttribute('class',g[0]);}
        }
      });
      flaggedEl.textContent=flagged;
      tpEl.textContent=c.tp;
      fnEl.textContent=c.fn;
      plainEl.textContent=L(
        'At a base rate of '+fmtPct(p)+', the tool flags about '+flagged+' of 1,000 patients, and about '+c.tp+' of them go on to develop delirium. A flag means '
          +(ppv<0.5?'roughly a 1 in '+oneIn+' chance ('+fmtPct(ppv)+')':'roughly a '+fmtPct(ppv)+' chance')+' that this patient develops delirium. '
          +(ppv<0.1?'Almost every flag is a false alarm.':ppv<0.5?'Most flags are still false alarms.':'Most flags are correct, yet about 1 in '+falseIn+' is a false alarm.'),
        '在 '+fmtPct(p)+' 的基础发生率下，工具会标记 1,000 位患者中的约 '+flagged+' 位，其中约 '+c.tp+' 位会发生谵妄。一个标记意味着这位患者发生谵妄的可能性'
          +(ppv<0.5?'约为 1/'+oneIn+'（'+fmtPct(ppv)+'）':'约为 '+fmtPct(ppv))+'。'
          +(ppv<0.1?'几乎每个标记都是误报。':ppv<0.5?'多数标记仍然是误报。':'多数标记是正确的，但仍有约 1/'+falseIn+' 是误报。'));
      presets.forEach(function(b){b.setAttribute('aria-pressed',scale.step(rateOf(b))===+input.value?'true':'false');});
    }
    function setRate(rate){input.value=scale.step(rate);update();}

    // "Set from your pathway" note: remembers the setting so it can be rewritten in the other language.
    var from=document.getElementById('ctx-from'),fromSetting=null;
    function showFrom(){
      if(!fromSetting){from.hidden=true;from.textContent='';return;}
      var lb=fromSetting.label,rate=fmtPct(SETTINGS[fromSetting.id].rate);
      from.textContent=L('Set from your pathway: '+lb.en+', at an illustrative base rate of '+rate+'.','来自你的路径：'+lb.zh+'，示例基础发生率为 '+rate+'。');
      from.hidden=false;
    }
    function clearFrom(){fromSetting=null;showFrom();}

    input.addEventListener('input',function(){update();clearFrom();});
    presets.forEach(function(b){b.addEventListener('click',function(){setRate(rateOf(b));clearFrom();});});
    // A setting placed in the pathway builder (section 1) moves the base rate to that setting's illustrative value.
    document.addEventListener('lab:setting',function(e){
      setRate(SETTINGS[e.detail.id].rate);
      fromSetting=e.detail;
      showFrom();
    });
    onLang(function(){update();showFrom();});
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
    function num(n){return n.toLocaleString('en-US');}

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
      syncRange(nIn,num(n1),L(n1+' patients with delirium',n1+' 位谵妄患者'));
      subA.textContent=L('and '+num(9*n1)+' who did not, '+num(10*n1)+' evaluated in all','另有 '+num(9*n1)+' 位未发生，共评估 '+num(10*n1)+' 位');
      setAttrs(band,{x:cx(iv[0]),width:Math.max(2,cx(iv[1])-cx(iv[0]))});
      var other=n1<300?Math.min(1000,n1*10):Math.round(n1/10),ov=interval(other),o0=f2(ov[0]),o1=f2(ov[1]);
      textA.textContent=L(
        'With '+num(n1)+' patients who developed delirium, the 95% interval runs from '+f2(iv[0])+' to '+f2(iv[1])+'. '
          +(other>n1?'With ten times as many, it would narrow to '+o0+' to '+o1+'.':'With a tenth as many, it would widen to '+o0+' to '+o1+'.')
          +' The headline 0.855 looks the same either way; only the interval shows how much evidence stands behind it.',
        '如果有 '+num(n1)+' 位患者发生谵妄，95% 区间为 '+f2(iv[0])+' 到 '+f2(iv[1])+'。'
          +(other>n1?'如果病例数多十倍，区间会缩小到 '+o0+' 到 '+o1+'。':'如果病例数只有十分之一，区间会扩大到 '+o0+' 到 '+o1+'。')
          +'两种情况下，0.855 这个数字看起来一模一样；只有区间能说明它背后有多少证据。');
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
    var axisX=svgAdd(cal,'text',{'class':'t',x:px(1),y:Y0+30,'text-anchor':'end'});
    var axisY=svgAdd(cal,'text',{'class':'t',x:9,y:py(0.5),'text-anchor':'middle',transform:'rotate(-90 9 '+py(0.5)+')'});
    var diagLabel=svgAdd(cal,'text',{'class':'t',x:px(0.6),y:py(0.6)-7,transform:'rotate('+TILT.toFixed(1)+' '+px(0.6)+' '+(py(0.6)-7)+')'});
    function labelAxes(){
      axisX.textContent=L('Predicted risk →','预测风险 →');
      axisY.textContent=L('Observed rate →','实际发生率 →');
      diagLabel.textContent=L('perfect calibration','完美校准');
    }

    function drawB(){
      var d=dIn.value/100,odds=Math.exp(d).toFixed(1),k;
      syncRange(dIn,d===0?L('None','无'):L('×'+odds+' odds','几率 ×'+odds),
        d===0?L('No overstatement','没有高估'):L('Predicted odds '+odds+' times the observed odds','预测几率是实际几率的 '+odds+' 倍'));
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
        ?L('Predicted and observed risk agree. The ward list shows a red icon for the top 5% of patients and a yellow icon for the next 10%.',
           '预测风险与实际风险一致。病房列表给前 5% 的患者显示红色图标，给接下来 10% 的患者显示黄色图标。')
        :L('Patients with a red icon are now predicted to have a '+pct(red.pred)+' risk, but '+pct(red.obs)+' go on to develop delirium. The patient list looks exactly as before, because icons are assigned by rank. Jauk et al. measured this kind of drift in the manuscript; the display could not show it.',
           '带红色图标的患者现在被预测有 '+pct(red.pred)+' 的风险，但实际只有 '+pct(red.obs)+' 发生谵妄。患者列表看起来和以前完全一样，因为图标是按排名分配的。Jauk 等在论文中测量到了这种漂移，但显示无法呈现它。');
    }

    nIn.addEventListener('input',drawA);
    dIn.addEventListener('input',drawB);
    onLang(function(){drawA();drawB();labelAxes();});
    labelAxes();
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
      time:{dim:1,base:11,slope:4,on:true,name:{en:'Timeframe and absolute risk',zh:'时间范围与绝对风险'},
        fix:{en:'State the timeframe, denominator, and baseline population, and show absolute risk rather than a bare score.',zh:'写明时间范围、分母和基线人群，显示绝对风险，而不是只给一个分数。'}},
      uncertainty:{dim:2,base:10,slope:2,name:{en:'Uncertainty range',zh:'不确定性范围'},
        fix:{en:'Show an uncertainty range or a qualitative uncertainty cue, and name the main sources of uncertainty in plain language.',zh:'显示不确定性范围或定性的不确定性提示，并用通俗的语言说明主要来源。'}},
      format:{dim:3,base:6,slope:9,on:true,name:{en:'Plain-language label and clear visual',zh:'通俗的标签与清晰的图示'},
        fix:{en:'Use a plain-language label, natural frequencies, and an accessible visual, so the output reads at a glance.',zh:'使用通俗的标签、自然频数和无障碍的图示，让输出一眼就能看懂。'}},
      review:{dim:4,base:5,slope:6,name:{en:'Prompt to review, not just accept',zh:'提示审慎检查，而不是照单全收'},
        fix:{en:'Add interpretation guidance and a prompt that invites critical review rather than passive acceptance.',zh:'附上解读指引，并提示使用者审慎检查，而不是被动接受。'}},
      action:{dim:5,base:7,slope:12,name:{en:'Linked next step',zh:'关联下一步'},
        fix:{en:'Link the output to a concrete next step, and cut alert fatigue through prioritization and contextual triggering.',zh:'把输出与具体的下一步联系起来，并通过优先级排序和情境触发减少警报疲劳。'}},
      reliability:{dim:6,base:10,slope:3,name:{en:'Calibration and reliability status',zh:'校准与可靠性状态'},
        fix:{en:'Show calibration and reliability status, including expected false positives and false negatives and when the output should not be relied on.',zh:'显示校准与可靠性状态，包括预计的假阳性和假阴性，以及何时不应依赖这个输出。'}},
      subgroup:{dim:7,base:6,slope:2,name:{en:'Caution for groups the model rarely saw',zh:'提醒模型很少见过的人群'},
        fix:{en:'Flag data limitations and say when the output should be read with caution for underrepresented groups.',zh:'标出数据局限，并说明对代表性不足的人群何时需要谨慎解读输出。'}}
    };
    var KEYS=Object.keys(EL),SUM_BASE=0,SUM_SLOPE=0;
    KEYS.forEach(function(k){SUM_BASE+=EL[k].base;SUM_SLOPE+=EL[k].slope;});
    // One checkbox per element, built from EL; "on" marks what the display shows at the start.
    var toggles=document.getElementById('att-toggles');
    toggles.innerHTML=KEYS.map(function(k){
      return '<li><label><input type="checkbox" data-el="'+k+'"'+(EL[k].on?' checked':'')+'>'+dimBadge(EL[k].dim)+'<span class="att-tx">'+biT(EL[k].name)+'</span></label></li>';
    }).join('');
    var boxes=[].slice.call(toggles.querySelectorAll('input'));
    var PROFILES={
      wellSupported:{tone:'ok',name:{en:'Well supported',zh:'支持充分'},
        text:{en:'There is time to read the output, and the display answers the questions a careful reader would ask.',zh:'有时间读懂输出，显示也回答了一位细心的读者会问的问题。'}},
      stretched:{tone:'warn',name:{en:'Stretched but supported',zh:'吃紧但有支持'},
        text:{en:'Attention is short, but the display carries enough on its own: what the risk means and what to do next are visible at a glance.',zh:'注意力不足，但显示本身已经足够清楚：风险意味着什么、下一步做什么，一眼就能看到。'}},
      reader:{tone:'warn',name:{en:'Relies on the reader',zh:'依赖读者'},
        text:{en:'An attentive clinician may fill some gaps from experience, but the display leaves important questions unanswered.',zh:'细心的临床医生也许能凭经验补上一些缺口，但显示留下了重要的问题没有回答。'}},
      needs:{tone:'bad',name:{en:'Needs support',zh:'需要支持'},
        text:{en:'Attention is short and the display leaves gaps. Misreading, overtrust, and inaction become likely, so support has to be built into the display and the workflow.',zh:'注意力不足，显示又有缺口。误读、过度信任和不作为都变得更可能，所以支持必须内置在显示和工作流程中。'}}
    };
    // The index is floorAt(rush) + gap × spanAt(rush), where gap is the share (0 to 1) of the possible gap cost that is missing.
    function cost(k,s){return EL[k].base+EL[k].slope*s;}
    function floorAt(s){return 8+22*s;}
    function spanAt(s){return SUM_BASE+SUM_SLOPE*s;}
    function indexAt(s,g){return Math.min(100,floorAt(s)+g*spanAt(s));}
    function attentionWord(v){return v<20?L('Full','充分'):v<45?L('Some distraction','有些分心'):v<70?L('Divided','注意力分散'):L('Rushed','匆忙');}

    var scoreEl=document.getElementById('att-score'),coverEl=document.getElementById('att-cover'),meterEl=document.getElementById('att-meter');
    var profileEl=document.getElementById('att-profile'),profileName=document.getElementById('att-profile-name'),profileText=document.getElementById('att-profile-text');
    var supportEl=document.getElementById('att-support'),lastSupport='';
    meterEl.querySelector('.att-line').style.left=LINE+'%';

    // The map: x is rush, y is the missing share of the gap cost at this rush level, so the shading and the dashed
    // support line are exact for the dot. Everything except the dot is drawn once (and again when the language changes).
    var map=document.getElementById('att-map'),VIEW_W=map.viewBox.baseVal.width;
    var MX0=30,MX1=312,MY0=176,MY1=8;
    function mx(s){return MX0+s*(MX1-MX0);}
    function my(g){return MY0-g*(MY0-MY1);}
    // Shading is nearly clear at low index values and deepens toward the top right.
    var heat='<g class="heat">',i,j,C=28,R=16;
    for(i=0;i<C;i++){for(j=0;j<R;j++){
      var t=Math.max(0,(indexAt((i+0.5)/C,(j+0.5)/R)-12)/88);
      heat+='<rect class="cell" x="'+mx(i/C).toFixed(2)+'" y="'+my((j+1)/R).toFixed(2)+'" width="'+((MX1-MX0)/C).toFixed(2)+'" height="'+((MY0-MY1)/R).toFixed(2)+'" opacity="'+(0.03+0.55*Math.pow(t,1.3)).toFixed(3)+'"/>';
    }}
    heat+='</g>';
    var line='';
    for(i=0;i<=40;i++){var s1=i/40,g1=(LINE-floorAt(s1))/spanAt(s1);line+=(i?'L':'M')+mx(s1).toFixed(1)+' '+my(Math.max(0,Math.min(1,g1))).toFixed(1);}
    heat+='<line class="mid" x1="'+mx(0.5)+'" x2="'+mx(0.5)+'" y1="'+MY1+'" y2="'+MY0+'"/>';
    heat+='<path class="line" d="'+line+'"/>';
    heat+='<rect class="frame-line" x="'+MX0+'" y="'+MY1+'" width="'+(MX1-MX0)+'" height="'+(MY0-MY1)+'"/>';
    var halo,dot;
    function drawMap(){
      map.innerHTML=heat
        +'<text class="q" x="'+(MX0+6)+'" y="'+(MY1+14)+'">'+L('Relies on the reader','依赖读者')+'</text>'
        +'<text class="q" x="'+(MX1-6)+'" y="'+(MY1+14)+'" text-anchor="end">'+L('Needs support','需要支持')+'</text>'
        +'<text class="q" x="'+(MX0+6)+'" y="'+(MY0-7)+'">'+L('Well supported','支持充分')+'</text>'
        +'<text class="q" x="'+(MX1-6)+'" y="'+(MY0-7)+'" text-anchor="end">'+L('Stretched','吃紧')+'</text>'
        +'<text class="ax" x="'+MX0+'" y="'+(MY0+14)+'">'+L('Full attention','注意力充分')+'</text><text class="ax" x="'+MX1+'" y="'+(MY0+14)+'" text-anchor="end">'+L('Rushed →','匆忙 →')+'</text>'
        +'<text class="ax" x="11" y="'+my(0.5)+'" text-anchor="middle" transform="rotate(-90 11 '+my(0.5)+')">'+L('Display gaps →','显示缺口 →')+'</text>';
      halo=svgAdd(map,'circle',{'class':'halo',r:13});
      dot=svgAdd(map,'circle',{'class':'dot',r:7});
    }
    drawMap();

    function update(){
      var v=+rush.value,s=v/100,missing=[],gap=0;
      boxes.forEach(function(b){if(!b.checked){var k=b.getAttribute('data-el');missing.push(k);gap+=cost(k,s);}});
      var g=gap/spanAt(s),idx=Math.round(indexAt(s,g));
      syncRange(rush,attentionWord(v),L(attentionWord(v)+', '+v+'% of the way to rushed',attentionWord(v)+'（匆忙程度 '+v+'%）'));
      scoreEl.textContent=idx;
      coverEl.style.setProperty('--v',idx+'%');
      meterEl.setAttribute('aria-valuenow',idx);
      var p=idx<LINE?(s<0.5?PROFILES.wellSupported:PROFILES.stretched):(s<0.5?PROFILES.reader:PROFILES.needs);
      profileEl.setAttribute('data-tone',p.tone);
      profileName.innerHTML=biT(p.name);
      profileText.innerHTML=biT(p.text);
      setAttrs(halo,{cx:mx(s),cy:my(g)});
      setAttrs(dot,{cx:mx(s),cy:my(g)});
      // What to add first: the missing elements that cost the most at the current level of attention.
      // The list is a live region, so it is rewritten only when its content actually changes.
      missing.sort(function(a,b){return cost(b,s)-cost(a,s);});
      var html=!missing.length
        ?'<p class="label">'+bi('Support to add','可以补充的支持')+'</p><p class="att-done">'+bi('Nothing is missing from the display. What remains is attention itself: protect time for the decision, and keep alerts few enough that each one is read.','显示中没有缺少任何要素。剩下的就是注意力本身：为决策留出时间，并让警报少到每一条都会被阅读。')+'</p>'
        :'<p class="label">'+(idx<LINE?bi('Worth adding next','值得接下来补充'):bi('Add these first','优先补充这些'))+'</p><ol class="att-list">'+missing.slice(0,3).map(function(k){
          var e=EL[k],pts=Math.round(cost(k,s));
          return '<li>'+dimBadge(e.dim)+'<div><b>'+biT(e.name)+'</b><p>'+biT(e.fix)+'</p><span class="att-gain">'+bi('Lowers the index by about '+pts+' points here','在这里可让指数降低约 '+pts+' 分')+'</span></div></li>';
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
    onLang(function(){drawMap();update();});
    update();
  })();
})();
