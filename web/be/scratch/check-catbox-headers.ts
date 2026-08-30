import fetch from 'node-fetch';

async function run() {
  const url = 'https://files.catbox.moe/egycau.jpg';
  console.log(`Fetching: ${url}`);
  const headRes = await fetch(url, { method: 'HEAD' });
  console.log('HEAD response ok:', headRes.ok, 'status:', headRes.status);
  console.log('HEAD headers:');
  headRes.headers.forEach((val, key) => console.log(`  ${key}: ${val}`));

  const getRes = await fetch(url, { method: 'GET' });
  console.log('GET response ok:', getRes.ok, 'status:', getRes.status);
  console.log('GET headers:');
  getRes.headers.forEach((val, key) => console.log(`  ${key}: ${val}`));
}

run().catch(console.error);
