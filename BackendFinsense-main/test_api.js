const http = require('http');

async function main() {
  // 1. Register a user to get a token
  const registerData = JSON.stringify({
    email: `test_${Date.now()}@test.com`,
    password: 'password123',
    name: 'Test User',
    city: 'Tuxtla Gutiérrez'
  });

  const req1 = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': registerData.length }
  }, (res1) => {
    let body1 = '';
    res1.on('data', chunk => body1 += chunk);
    res1.on('end', () => {
      const data = JSON.parse(body1);
      const token = data.access_token;
      if (!token) return console.log('No token:', body1);

      // 2. Create group
      const groupData = JSON.stringify({ name: 'My Group', memberIds: [] });
      const req2 = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/groups',
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Content-Length': groupData.length,
          'Authorization': `Bearer ${token}`
        }
      }, (res2) => {
        let body2 = '';
        res2.on('data', chunk => body2 += chunk);
        res2.on('end', () => {
          console.log(`Status: ${res2.statusCode}`);
          console.log(`Response: ${body2}`);
        });
      });
      req2.write(groupData);
      req2.end();
    });
  });
  req1.write(registerData);
  req1.end();
}
main();
