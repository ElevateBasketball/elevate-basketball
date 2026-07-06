exports.handler = async function(event) {
  if(event.httpMethod !== 'POST') {
    return {statusCode: 405, body: 'Method not allowed'};
  }

  try {
    var payload = JSON.parse(event.body);
    var RESEND_KEY = 're_i9673958_KxnSS1vbWDasnx19yUH3QKSi';

    var response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + RESEND_KEY
      },
      body: JSON.stringify({
        from: payload.from || 'Elevate Basketball <noreply@elevatebball.com>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html
      })
    });

    var data = await response.text();

    if(!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({error: data})
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({success: true})
    };

  } catch(err) {
    return {
      statusCode: 500,
      body: JSON.stringify({error: err.message})
    };
  }
};
