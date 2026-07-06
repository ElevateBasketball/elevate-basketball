const GHL_API_KEY = 'pit-15e31881-4655-47dd-ab30-e6102b115cc2';
const GHL_LOCATION_ID = '0bODl7CBNOr68u7PKl2I';
const SBU = 'https://vjnanbggseohhpdrcblq.supabase.co';
const SBK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbmFuYmdnc2VvaGhwZHJjYmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NTAzNzIsImV4cCI6MjA5NjAyNjM3Mn0.MfqBhb7hiuYZADLfTYMl6gRo59BClfFvij_6imafqcQ';
const PORTAL_URL = 'https://elevate-coach-portal.netlify.app';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

exports.handler = async function(event) {
  try {
    // Load state from Supabase using plain fetch — no SDK needed
    var res = await fetch(SBU + '/rest/v1/state?id=eq.main&select=data', {
      headers: {
        'apikey': SBK,
        'Authorization': 'Bearer ' + SBK,
        'Content-Type': 'application/json'
      }
    });

    var rows = await res.json();
    if (!rows || !rows.length) return { statusCode: 200, body: 'No data' };

    var data = rows[0].data || {};
    var workers = data.workers || [];
    var players = data.players || [];
    var workerAvail = data.workerAvail || {};
    var playerAvail = data.playerAvail || {};

    // Figure out current week offset
    var base = new Date(2026, 5, 1);
    var now = new Date();
    var wkOff = Math.floor((now - base) / (7 * 24 * 60 * 60 * 1000));

    var toRemind = [];

    // Workers who haven't submitted availability
    workers.forEach(function(w) {
      var phone = w.contact || w.phone;
      if (!phone) return;
      var submitted = DAYS.some(function(d) {
        return workerAvail[w.id + '-' + d + '-' + wkOff];
      }) || !!workerAvail[w.id + '-unavail-' + wkOff];
      if (!submitted) {
        toRemind.push({ name: w.name, phone: phone, email: w.email, role: 'worker' });
      }
    });

    // Players who haven't submitted availability
    players.forEach(function(p) {
      var phone = p.contact || p.phone;
      if (!phone) return;
      var submitted = DAYS.some(function(d) {
        return playerAvail[p.id + '-' + d + '-' + wkOff];
      }) || !!playerAvail[p.id + '-unavail-' + wkOff];
      if (!submitted) {
        toRemind.push({ name: p.name, phone: phone, email: p.email, role: 'player' });
      }
    });

    // Send reminders via ghl-notify function
    if (toRemind.length > 0) {
      await fetch(PORTAL_URL + '/.netlify/functions/ghl-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'avail_reminder', contacts: toRemind })
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ reminded: toRemind.length, names: toRemind.map(function(c){ return c.name; }) })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
