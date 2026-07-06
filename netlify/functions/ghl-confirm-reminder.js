// Runs every day at 10am ET
// Sends reminder at 24hrs and 48hrs after publish if not yet confirmed
// Stops reminding once player/worker confirms in their portal
const SBU = 'https://vjnanbggseohhpdrcblq.supabase.co';
const SBK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbmFuYmdnc2VvaGhwZHJjYmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NTAzNzIsImV4cCI6MjA5NjAyNjM3Mn0.MfqBhb7hiuYZADLfTYMl6gRo59BClfFvij_6imafqcQ';
const PORTAL_URL = 'https://elevate-coach-portal.netlify.app';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

exports.handler = async function(event) {
  try {
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
    var sessions = data.sessions || [];

    var now = new Date();
    var toRemind = [];

    sessions.forEach(function(s) {
      if (s.status !== 'confirmed' && s.status !== 'published') return;
      if (!s.publishedAt) return;

      var publishedAt = new Date(s.publishedAt);
      var hoursSincePublish = (now - publishedAt) / (1000 * 60 * 60);

      // Only send at the 24hr and 48hr windows (within a 12hr window each)
      var is24hr = hoursSincePublish >= 24 && hoursSincePublish < 36;
      var is48hr = hoursSincePublish >= 48 && hoursSincePublish < 60;
      if (!is24hr && !is48hr) return;

      // Make sure session hasn't happened yet
      var base = new Date(2026, 5, 1);
      base.setDate(base.getDate() + (s.week || 0) * 7);
      var mon = new Date(base);
      mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
      var dayIdx = DAYS.indexOf(s.day);
      if (dayIdx < 0) return;
      var sessDate = new Date(mon);
      sessDate.setDate(mon.getDate() + dayIdx);
      if (sessDate < now) return;

      var sessionInfo = {
        day: s.day,
        time: s.start + '-' + s.end,
        portalLink: PORTAL_URL + '/player-view.html'
      };

      // Check player — skip if already confirmed
      if (s.player) {
        var p = players.find(function(x) { return x.name === s.player; });
        if (p && (p.contact || p.phone)) {
          var confs = s.confirmations || [];
          var alreadyConfirmed = confs.indexOf(p.id) >= 0;
          if (!alreadyConfirmed) {
            toRemind.push({
              name: p.name,
              phone: p.contact || p.phone,
              email: p.email,
              role: 'player',
              sessionInfo: Object.assign({}, sessionInfo, { portalLink: PORTAL_URL + '/player-view.html' })
            });
          }
        }
      }

      // Check workers — skip if already confirmed
      (s.workers || []).forEach(function(wid) {
        var w = workers.find(function(x) { return x.id === wid; });
        if (!w || (!w.contact && !w.phone)) return;
        var wConfs = s.workerConfirmations || [];
        var alreadyConfirmed = wConfs.indexOf(wid) >= 0;
        if (!alreadyConfirmed) {
          toRemind.push({
            name: w.name,
            phone: w.contact || w.phone,
            email: w.email,
            role: 'worker',
            sessionInfo: Object.assign({}, sessionInfo, { portalLink: PORTAL_URL + '/worker-view.html' })
          });
        }
      });
    });

    // Deduplicate by phone
    var seen = {};
    toRemind = toRemind.filter(function(c) {
      if (seen[c.phone]) return false;
      seen[c.phone] = true;
      return true;
    });

    if (toRemind.length > 0) {
      await fetch(PORTAL_URL + '/.netlify/functions/ghl-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'confirm_reminder', contacts: toRemind })
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ reminded: toRemind.length, names: toRemind.map(function(c) { return c.name; }) })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
