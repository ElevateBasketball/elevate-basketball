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
    var workerAvail=data.workerAvail||{};
    var playerAvail=data.playerAvail||{};
    var base=new Date(2026,5,1);
    var now=new Date();
    var wkOff=Math.floor((now-base)/(7*24*60*60*1000));
    var toRemind=[];
    workers.forEach(function(w){
      var phone=w.contact||w.phone;if(!phone)return;
      var submitted=DAYS.some(function(d){return workerAvail[w.id+'-'+d+'-'+wkOff];})||!!workerAvail[w.id+'-unavail-'+wkOff];
      if(!submitted)toRemind.push({name:w.name,phone:phone,email:w.email,role:'worker'});
    });
    players.forEach(function(p){
      var phone=p.contact||p.phone;if(!phone)return;
      var submitted=DAYS.some(function(d){return playerAvail[p.id+'-'+d+'-'+wkOff];})||!!playerAvail[p.id+'-unavail-'+wkOff];
      if(!submitted)toRemind.push({name:p.name,phone:phone,email:p.email,role:'player'});
    });
    if(toRemind.length>0){
      await fetch(PORTAL_URL+'/api/ghl-notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'avail_reminder',contacts:toRemind})});
    }
    return res.status(200).json({reminded:toRemind.length});
  } catch(err){
    return res.status(500).json({error:err.message});
  }
}
