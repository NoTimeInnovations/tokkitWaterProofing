/*
 * scripts/test_signin.js
 * Test signing in via Supabase Auth REST endpoint using email/password and anon key.
 *
 * Usage (PowerShell):
 *  $env:SUPABASE_URL='https://xyz.supabase.co'; $env:SUPABASE_ANON_KEY='anon_key'; node .\scripts\test_signin.js
 *
 * You can also set TEST_EMAIL and TEST_PASSWORD as env vars. Defaults match the project:
 * - admin@tokkit.app / 123456
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const email = process.env.TEST_EMAIL || 'admin@tokkit.app';
const password = process.env.TEST_PASSWORD || '123456';

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  console.error('Example (PowerShell):');
  console.error("$env:SUPABASE_URL='https://xyz.supabase.co'; $env:SUPABASE_ANON_KEY='your_anon_key'; node .\\scripts\\test_signin.js");
  process.exit(1);
}

async function testSignin() {
  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/token`;

  const body = new URLSearchParams();
  body.append('grant_type', 'password');
  body.append('email', email);
  body.append('password', password);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`
      },
      body: body.toString()
    });

    const data = await res.json();
    console.log('HTTP', res.status);
    console.log(JSON.stringify(data, null, 2));

    if (!res.ok) process.exit(2);
  } catch (err) {
    console.error('Error during sign-in test:', err);
    process.exit(3);
  }
}

testSignin();
