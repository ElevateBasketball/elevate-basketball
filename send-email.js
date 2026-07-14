const RESEND_KEY = 're_i9673958_KxnSS1vbWDasnx19yUH3QKSi';

export default async function handler(req, res) {
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    var payload = req.body||{};
    if(typeof payload==='string') payload=JSON.parse(payload);
    var response = await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+RESEND_KEY},
      body:JSON.stringify({from:payload.from||'Elevate Basketball <noreply@elevatebball.com>',to:payload.to,subject:payload.subject,html:payload.html,attachments:payload.attachments||undefined})
    });
    var data = await response.text();
    if(!response.ok) return res.status(response.status).json({error:data});
    return res.status(200).json({success:true});
  } catch(err){
    return res.status(500).json({error:err.message});
  }
}
