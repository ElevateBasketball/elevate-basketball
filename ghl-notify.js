const GHL_KEY = 'pit-15e31881-4655-47dd-ab30-e6102b115cc2';
const GHL_LOC = '0bODl7CBNOr68u7PKl2I';
const GHL_BASE = 'https://services.leadconnectorhq.com';
const PORTAL = 'https://elevate-basketball-elevatebasketball123.vercel.app';

export default async function handler(req, res) {
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    var payload = req.body || {};
    if(typeof payload === 'string') payload = JSON.parse(payload);
    var type = payload.type;
    var contacts = payload.contacts || [];
    var H = {'Authorization':'Bearer '+GHL_KEY,'Content-Type':'application/json','Version':'2021-07-28'};

    if(type === 'ping' || !contacts.length){
      var lt = await fetch(GHL_BASE+'/locations/'+GHL_LOC,{headers:H});
      var ld = await lt.json();
      var ct = await fetch(GHL_BASE+'/contacts/?locationId='+GHL_LOC+'&limit=1',{headers:H});
      var cd = await ct.json();
      return res.status(200).json({locationStatus:lt.status,locationData:ld,contactsStatus:ct.status,contactsData:cd});
    }

    var results = [];
    for(var i=0;i<contacts.length;i++){
      var c=contacts[i];
      if(!c.phone){results.push({name:c.name,skipped:'no phone'});continue;}
      var msg=buildMsg(type,c);
      if(!msg){results.push({name:c.name,skipped:'unknown type'});continue;}
      var phone=c.phone.replace(/\D/g,'');
      if(phone.length===10)phone='1'+phone;
      var ph='+'+phone;

      var sr=await fetch(GHL_BASE+'/contacts/?locationId='+GHL_LOC+'&query='+encodeURIComponent(ph),{headers:H});
      var sd=await sr.json();
      var cid=sd.contacts&&sd.contacts[0]&&sd.contacts[0].id;

      if(!cid){
        var parts=(c.name||'Unknown').split(' ');
        var cr=await fetch(GHL_BASE+'/contacts/',{method:'POST',headers:H,body:JSON.stringify({locationId:GHL_LOC,firstName:parts[0]||'Unknown',lastName:parts.slice(1).join(' ')||'',phone:ph,tags:['elevate-basketball']})});
        var cd2=await cr.json();
        cid=(cd2.contact&&cd2.contact.id)||cd2.id;
        if(!cid){results.push({name:c.name,phone:ph,error:'contact create failed',createStatus:cr.status,createDetail:JSON.stringify(cd2),searchStatus:sr.status,searchDetail:JSON.stringify(sd)});continue;}
      }

      var H2=Object.assign({},H,{'Version':'2021-04-15'});
      var convId=null;
      var cs=await fetch(GHL_BASE+'/conversations/search?locationId='+GHL_LOC+'&contactId='+cid,{headers:H2});
      var cs2=await cs.json();
      if(cs2.conversations&&cs2.conversations.length)convId=cs2.conversations[0].id;
      if(!convId){
        var nc=await fetch(GHL_BASE+'/conversations/',{method:'POST',headers:H2,body:JSON.stringify({locationId:GHL_LOC,contactId:cid})});
        var nd=await nc.json();
        convId=nd.id||(nd.conversation&&nd.conversation.id);
        if(!convId){results.push({name:c.name,contactId:cid,error:'conv create failed',status:nc.status,detail:JSON.stringify(nd)});continue;}
      }

      var mr=await fetch(GHL_BASE+'/conversations/messages',{method:'POST',headers:H2,body:JSON.stringify({type:'SMS',conversationId:convId,message:msg})});
      var md=await mr.json();
      results.push({name:c.name,phone:ph,contactId:cid,convId:convId,msgStatus:mr.status,msgOk:mr.ok,detail:JSON.stringify(md).slice(0,300)});
    }
    return res.status(200).json({success:true,results:results});
  } catch(err){
    return res.status(500).json({error:err.message});
  }
}

function buildMsg(type,c){
  var name=(c.name||'there').split(' ')[0];
  var info=c.sessionInfo||{};
  var link=info.portalLink||(c.role==='worker'?PORTAL+'/worker-view.html':PORTAL+'/player-view.html');
  if(type==='publish')return 'Hey '+name+', your Elevate session is confirmed'+(info.day?' - '+info.day+(info.time?' at '+info.time:''):'')+'. View schedule: '+link;
  if(type==='publish_worker')return 'Hey '+name+', your Elevate shift is confirmed'+(info.day?' - '+info.day+(info.time?' at '+info.time:''):'')+'. View schedule: '+link;
  if(type==='cancel')return 'Hey '+name+', your Elevate session'+(info.day?' on '+info.day+(info.time?' at '+info.time:''):'')+' has been cancelled. We will be in touch.';
  if(type==='avail_reminder')return 'Hey '+name+', please submit your availability for next week by 9pm tonight: '+link;
  if(type==='confirm_reminder')return 'Hey '+name+', please confirm your Elevate session'+(info.day?' on '+info.day+(info.time?' at '+info.time:''):'')+'. Confirm here: '+link;
  return null;
}
