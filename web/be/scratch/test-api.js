const API_BASE_URL = 'http://localhost:5000';

async function run() {
  // 1. Login
  const loginRes = await fetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'hoteladmin_1@gmail.com',
      password: 'admin123'
    })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed with status:', loginRes.status);
    const errText = await loginRes.text();
    console.error('Response:', errText);
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Logged in successfully!');
  
  const headers = {
    'Authorization': `Bearer ${token}`
  };
  
  // 2. Test getMyHotels
  const hotelsRes = await fetch(`${API_BASE_URL}/hotel-admins/my-hotels`, { headers });
  console.log('GET /hotel-admins/my-hotels status:', hotelsRes.status);
  console.log('GET /hotel-admins/my-hotels data:', await hotelsRes.json());
  
  // 3. Test getNotifications
  const notifRes = await fetch(`${API_BASE_URL}/notifications/hotel/me`, { headers });
  console.log('GET /notifications/hotel/me status:', notifRes.status);
  console.log('GET /notifications/hotel/me text/data:', await notifRes.text());
}

run().catch(console.error);
