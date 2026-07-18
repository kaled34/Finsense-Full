const http = require('http');

const req = http.request({
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/groups',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test' // dummy token just to see if it hits 401 or 500
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    console.log(`Body: ${body}`);
  });
});
req.write(JSON.stringify({ name: 'Test', memberIds: [] }));
req.end();
