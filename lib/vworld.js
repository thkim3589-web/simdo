/* 배경지도: 브이월드(국토교통부) 항공사진·일반지도 + 자동 대체
 * - 위성: 브이월드 항공사진 + 지명/도로 이름 → 못 불러오면 Esri 위성사진
 * - 일반: 브이월드 일반지도 → 못 불러오면 OpenStreetMap
 * - 인증키는 설정에서 바꿀 수 있음 (localStorage 'vworld_key'), 만료일 'vworld_key_exp'
 */
(function(){
  var DEFAULT_KEY='7A3066E5-1C1C-45E3-A73E-07D16F4935E9';
  var DEFAULT_EXP='2027-04-30';
  function get(k,d){ try{ return localStorage.getItem(k)||d; }catch(e){ return d; } }

  var VW={
    key:function(){ return get('vworld_key',DEFAULT_KEY).trim(); },
    exp:function(){ return get('vworld_key_exp',DEFAULT_EXP); },
    setKey:function(key,exp){ try{ localStorage.setItem('vworld_key',key.trim()); if(exp) localStorage.setItem('vworld_key_exp',exp); localStorage.removeItem('vworld_failed'); }catch(e){} },
    daysLeft:function(){ var e=new Date(VW.exp()+'T23:59:59'); return Math.ceil((e-new Date())/86400000); },
    failed:function(){ return get('vworld_failed','')==='1'; },
    url:function(layer,ext){ return 'https://api.vworld.kr/req/wmts/1.0.0/'+VW.key()+'/'+layer+'/{z}/{y}/{x}.'+ext; },
    onFallback:null,

    /* 처음 몇 장이 계속 실패하면(키 만료·도메인 미등록 등) 대체 지도로 바꿈 */
    tile:function(primary,fallback,opt){
      var ok=0, bad=0, switched=false;
      var o={maxNativeZoom:19,maxZoom:21,attribution:opt.attribution};
      var t=L.tileLayer(primary,o);
      t.on('tileload',function(){ ok++; });
      t.on('tileerror',function(){
        bad++;
        if(!switched && ok===0 && bad>=4){
          switched=true;
          var m=t._map;
          if(m&&m.attributionControl){ m.attributionControl.removeAttribution(opt.attribution); m.attributionControl.addAttribution(opt.fallbackAttribution); }
          t.options.attribution=opt.fallbackAttribution;
          t.setUrl(fallback);
          try{ localStorage.setItem('vworld_failed','1'); }catch(e){}
          if(VW.onFallback) VW.onFallback(opt.name);
        }
      });
      t.on('tileload',function(){ if(!switched && ok===1){ try{ localStorage.removeItem('vworld_failed'); }catch(e){} } });
      return t;
    },

    layers:function(){
      var sat=VW.tile(VW.url('Satellite','jpeg'),
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {name:'항공사진',attribution:'© 국토교통부 브이월드',fallbackAttribution:'Esri (브이월드 연결 안 됨)'});
      var labels=L.tileLayer(VW.url('Hybrid','png'),{maxNativeZoom:19,maxZoom:21,opacity:.9});
      labels.on('tileerror',function(){ if(sat._map) sat._map.removeLayer(labels); });
      var base=VW.tile(VW.url('Base','png'),
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {name:'일반지도',attribution:'© 국토교통부 브이월드',fallbackAttribution:'© OpenStreetMap (브이월드 연결 안 됨)'});
      return {sat:L.layerGroup([sat,labels]), map:base};
    }
  };
  window.VW=VW;
})();
