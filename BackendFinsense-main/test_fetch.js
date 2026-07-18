async function run() {
  try {
    // 1. Register a user
    const regRes = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test_${Date.now()}@test.com`,
        password: 'password123',
        name: 'Test Fetch User',
        city: 'City'
      })
    });
    const regData = await regRes.json();
    console.log('Register status:', regRes.status);
    if (!regRes.ok) return console.log('Register error:', regData);
    
    const token = regData.access_token;

    // 2. Create Group
    const groupRes = await fetch('http://localhost:3001/api/groups', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'My Fetch Group', memberIds: [] })
    });
    const groupData = await groupRes.json();
    console.log('Group status:', groupRes.status);
    console.log('Group response:', groupData);

  } catch (err) {
    console.error('Fetch error:', err);
  }
}
run();
