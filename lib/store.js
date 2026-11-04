/* 측정 기록 저장소
 * - 평소: localStorage('depth_records_v35')가 원본, IndexedDB에 사본
 * - localStorage가 가득 차면(대략 5천~1만 지점): IndexedDB가 원본이 되고 localStorage 사본은 지움
 *   ('depth_records_in_idb' = '1' 표시)
 * - 기록은 JSON 문자열로 들고 있다가 꺼낼 때마다 새로 풀어서 줌 (예전 동작과 같음)
 */
(function(){
  var KEY='depth_records_v35', FLAG='depth_records_in_idb', DB='simdo_store', ST='kv';
  var str=null, db=null, readyFlag=false, waiters=[];

  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function openDb(){
    return new Promise(function(res,rej){
      if(!window.indexedDB){ rej(new Error('no idb')); return; }
      var r=indexedDB.open(DB,1);
      r.onupgradeneeded=function(){ r.result.createObjectStore(ST); };
      r.onsuccess=function(){ res(r.result); };
      r.onerror=function(){ rej(r.error); };
    });
  }
  function idbGet(k){
    return new Promise(function(res){
      try{ var q=db.transaction(ST,'readonly').objectStore(ST).get(k); q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ res(undefined); }; }
      catch(e){ res(undefined); }
    });
  }
  function idbPutSoon(){
    if(!db) return;
    try{ db.transaction(ST,'readwrite').objectStore(ST).put(str,KEY); }catch(e){}
  }

  function inIdb(){ return lsGet(FLAG)==='1'; }

  // localStorage에 먼저 써 보고, 가득 차면 IndexedDB 전용으로 전환
  function persist(){
    if(!inIdb()){
      try{ localStorage.setItem(KEY,str); }
      catch(e){
        if(db){
          try{ localStorage.removeItem(KEY); localStorage.setItem(FLAG,'1'); }catch(e2){}
        }else{
          throw e; // IndexedDB도 못 쓰면 저장 실패를 알림
        }
      }
    }
    idbPutSoon();
  }

  var ready=openDb().then(function(d){ db=d; return idbGet(KEY); }).then(function(v){
    if(inIdb()) str=(typeof v==='string')?v:(lsGet(KEY)||'[]');
    else{
      str=lsGet(KEY)||'[]';
      if(str!==v) idbPutSoon(); // 사본 맞춰 둠
    }
  }).catch(function(){
    db=null; str=lsGet(KEY)||'[]';
  }).then(function(){
    readyFlag=true;
    waiters.splice(0).forEach(function(f){ try{ f(); }catch(e){} });
  });

  window.RecStore={
    ready:ready,
    isReady:function(){ return readyFlag; },
    onReady:function(f){ if(readyFlag) f(); else waiters.push(f); },
    getStr:function(){ return str!=null?str:(inIdb()?'[]':(lsGet(KEY)||'[]')); },
    get:function(){ try{ return JSON.parse(this.getStr()); }catch(e){ return []; } },
    set:function(arr){ str=JSON.stringify(arr); persist(); },
    mode:function(){ return inIdb()?'idb':'local'; },
    sizeKB:function(){ return Math.round((this.getStr().length*2)/1024); }
  };
})();
