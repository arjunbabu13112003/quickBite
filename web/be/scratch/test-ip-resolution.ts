import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as os from 'os';
import fetch from 'node-fetch';

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function resolvePushImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  let resolved = url.trim();
  if (resolved === '') return undefined;

  if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
    const localIp = getLocalIpAddress();
    const port = process.env.PORT || 5000;
    const path = resolved.startsWith('/') ? resolved : `/${resolved}`;
    resolved = `http://${localIp}:${port}${path}`;
  } else if (resolved.includes('localhost') || resolved.includes('127.0.0.1')) {
    const localIp = getLocalIpAddress();
    resolved = resolved.replace(/localhost|127\.0\.0\.1/g, localIp);
  }
  return resolved;
}

async function run() {
  const localIp = getLocalIpAddress();
  const testUrl = 'http://localhost:5000/uploads/campaigns/campaign-1788113976272-828645.png';
  const resolved = resolvePushImageUrl(testUrl);
  
  console.log(`Local IP Address found: ${localIp}`);
  console.log(`Original URL: ${testUrl}`);
  console.log(`Resolved URL: ${resolved}`);
  
  if (resolved) {
    console.log(`Testing reachability of resolved URL...`);
    try {
      const res = await fetch(resolved, { method: 'HEAD' });
      console.log(`Status: ${res.status} (${res.statusText})`);
      console.log(`Content-Type: ${res.headers.get('content-type')}`);
    } catch (err) {
      console.error('Failed to reach resolved URL:', err.message);
    }
  }
}

run().catch(console.error);
