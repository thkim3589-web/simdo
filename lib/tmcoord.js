/* 위도·경도(WGS84) → 국내 평면직각좌표(TM) 변환 (GRS80 타원체, 횡메르카토르)
 * EPSG:5186 중부원점(127°)  EPSG:5187 동부원점(129°)  EPSG:5179 UTM-K  EPSG:5181 중부원점(구 카카오)
 * 반환: {x: 동쪽 방향(m, Easting), y: 북쪽 방향(m, Northing)}
 * (측량에서는 X=북, Y=동으로 부르기도 하므로 엑셀 열 이름에 '동(E)/북(N)'을 함께 표기)
 */
(function(){
  var CRS={
    5186:{name:'중부원점(GRS80)',lat0:38,lon0:127,k0:1,FE:200000,FN:600000},
    5187:{name:'동부원점(GRS80)',lat0:38,lon0:129,k0:1,FE:200000,FN:600000},
    5179:{name:'UTM-K(GRS80)',lat0:38,lon0:127.5,k0:0.9996,FE:1000000,FN:2000000},
    5181:{name:'중부원점(GRS80, 50만)',lat0:38,lon0:127,k0:1,FE:200000,FN:500000}
  };
  var a=6378137, f=1/298.257222101, e2=f*(2-f), ep2=e2/(1-e2);
  var e4=e2*e2, e6=e4*e2, D=Math.PI/180;
  function M(p){ return a*((1-e2/4-3*e4/64-5*e6/256)*p-(3*e2/8+3*e4/32+45*e6/1024)*Math.sin(2*p)+(15*e4/256+45*e6/1024)*Math.sin(4*p)-(35*e6/3072)*Math.sin(6*p)); }
  function toTM(lat,lng,code){
    var c=CRS[code]; if(!c||isNaN(lat)||isNaN(lng)) return null;
    var p=lat*D, l=lng*D, s=Math.sin(p), co=Math.cos(p), t=Math.tan(p);
    var N=a/Math.sqrt(1-e2*s*s), T=t*t, C=ep2*co*co, A=(l-c.lon0*D)*co;
    var x=c.FE+c.k0*N*(A+(1-T+C)*Math.pow(A,3)/6+(5-18*T+T*T+72*C-58*ep2)*Math.pow(A,5)/120);
    var y=c.FN+c.k0*(M(p)-M(c.lat0*D)+N*t*(A*A/2+(5-T+9*C+4*C*C)*Math.pow(A,4)/24+(61-58*T+T*T+600*C-330*ep2)*Math.pow(A,6)/720));
    return {x:Math.round(x*1000)/1000, y:Math.round(y*1000)/1000};
  }
  window.TMC={CRS:CRS, toTM:toTM};
})();
