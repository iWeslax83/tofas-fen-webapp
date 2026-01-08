const Redis = require('ioredis');
const url = process.env.REDIS_URL;
const c = new Redis(url, { tls: { servername: 'capable-treefrog-9602.upstash.io' } });

c.ping().then(r => { console.log('PING->', r); c.disconnect(); process.exit(0); })
.catch(e => { console.error('PING ERR:', e && e.message ? e.message : e); c.disconnect(); process.exit(2); });
