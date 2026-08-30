import axios from 'axios';

async function run() {
  console.log('Logging in as super admin...');
  const loginRes = await axios.post('http://localhost:5000/users/login', {
    email: 'arjun@gmail.com',
    password: 'arjun123'
  });

  console.log('Login response:', loginRes.data);
  const token = loginRes.data.token || loginRes.data.accessToken || loginRes.data.access_token;
  console.log('Login success! Token acquired.');

  console.log('Creating push campaign with 9MB image...');
  try {
    const createRes = await axios.post(
      'http://localhost:5000/push-campaigns',
      {
        title: 'Large Image Campaign Test',
        body: 'This campaign is sent with a large 9.13 MB image to verify normalization/compression.',
        imageUrl: 'http://localhost:5000/uploads/campaigns/campaign-1788115141010-17976.jpg',
        targetAudience: 'ALL_CUSTOMERS',
        tapAction: 'HOME',
        scheduleType: 'NOW'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('Campaign creation success!');
    console.log('Response status:', createRes.status);
    console.log('Created Campaign Data:', JSON.stringify(createRes.data, null, 2));
  } catch (err: any) {
    console.error('Campaign creation failed!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Error Response Body:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
  }
}

run().catch(console.error);
