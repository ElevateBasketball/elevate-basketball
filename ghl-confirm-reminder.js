const SBU='https://vjnanbggseohhpdrcblq.supabase.co';
const SBK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbmFuYmdnc2VvaGhwZHJjYmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NTAzNzIsImV4cCI6MjA5NjAyNjM3Mn0.MfqBhb7hiuYZADLfTYMl6gRo59BClfFvij_6imafqcQ';
const PORTAL_URL='https://elevate-basketball-elevatebasketball123.vercel.app';
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default async function handler(req, res) {
  try {
    var r=await fetch(SBU+'/rest/v1/state?id=eq.main&select=data',{headers:{'apikey':SBK,'Authorization':'Bearer '+SBK,'Content-Type':'application/json'}});
    var rows=await r.json();
    if(!rows||!rows.length)return res.status(200).json({message:'No data'});
    var data=rows[0].data||{};
    var workers=data.workers||[];
    var players=data.players||[];
    var sessions=data.sessions||[];
    var now=new Date();
    var toRemind=[];
    sessions.forEach(function(s){
      if(s.status!=='confirmed'&&s.status!=='published')return;
      if(!s.publishedAt)return;
      var hrs=(now-new Date(s.publishedAt))/(1000*60*60);
      if(!(hrs>=24&&hrs<36)&&!(hrs>=48&&hrs<60))return;
      var base=new Date(2026,5,1);base.setDate(base.getDate()+(s.week||0)*7);
      var mon=new Date(base);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));
      var di=DAYS.indexOf(s.day);if(di<0)return;
      var sd=new Date(mon);sd.setDate(mon.getDate()+di);
      if(sd<now)return;
      var si={day:s.day,time:s.start+'-'+s.end};
      if(s.player){
        var p=players.find(function(x){return x.name===s.player;});
        if(p&&(p.contact||p.phone)&&(s.confirmations||[]).indexOf(p.id)<0)
          toRemind.push({name:p.name,phone:p.contact||p.phone,email:p.email,role:'player',sessionInfo:Object.assign({},si,{portalLink:PORTAL_URL+'/player-view.html'})});
      }
      (s.workers||[]).forEach(function(wid){
        var w=workers.find(function(x){return x.id===wid;});
        if(!w||(!w.contact&&!w.phone))return;
        if((s.workerConfirmations||[]).indexOf(wid)<0)
          toRemind.push({name:w.name,phone:w.contact||w.phone,email:w.email,role:'worker',sessionInfo:Object.assign({},si,{portalLink:PORTAL_URL+'/worker-view.html'})});
      });
    });
    var seen={};
    toRemind=toRemind.filter(function(c){if(seen[c.phone])return false;seen[c.phone]=true;return true;});
    if(toRemind.length>0){
      await fetch(PORTAL_URL+'/api/ghl-notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'confirm_reminder',contacts:toRemind})});
    }
    return res.status(200).json({reminded:toRemind.length});
  } catch(err){
    return res.status(500).json({error:err.message});
  }
}
