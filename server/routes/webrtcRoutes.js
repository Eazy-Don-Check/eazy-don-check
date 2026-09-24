const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

/*
 * WebRTC ICE configuration.
 *
 * STUN servers are public and safe to expose to authenticated clients.
 * TURN credentials are also necessarily delivered to the browser because
 * the browser has to authenticate to the TURN server. Keep them out of the
 * frontend bundle and return them only to authenticated users.
 *
 * Environment variables:
 *   STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
 *   TURN_URLS=turn:your-turn-host:3478,turns:your-turn-host:5349
 *   TURN_USERNAME=...
 *   TURN_CREDENTIAL=...
 */
router.get('/ice-servers', protect, (req, res) => {
  const stunUrls = String(
    process.env.STUN_URLS ||
    'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302'
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const iceServers = stunUrls.map((urls) => ({ urls }));

  const turnUrls = String(process.env.TURN_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const turnUsername = String(process.env.TURN_USERNAME || '').trim();
  const turnCredential = String(process.env.TURN_CREDENTIAL || '').trim();

  if (turnUrls.length && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential
    });
  }

  return res.json({
    success: true,
    iceServers
  });
});

module.exports = router;
