import fetch from 'node-fetch';

async function run() {
  const url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop';
  console.log(`Checking Unsplash image: ${url}`);
  try {
    const res = await fetch(url, { method: 'GET' });
    const buffer = await res.buffer();
    console.log(`Unsplash image downloaded size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(2)} KB)`);
  } catch (err) {
    console.error('Failed to fetch Unsplash image:', err);
  }
}

run().catch(console.error);
