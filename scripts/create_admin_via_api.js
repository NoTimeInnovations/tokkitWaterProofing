/*
 * scripts/create_admin_via_api.js
 * Create a Supabase user via the Admin REST API (service-role key).
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL='https://xyz.supabase.co'; $env:SUPABASE_SERVICE_ROLE_KEY='service_role_key'; node .\scripts\create_admin_via_api.js
 *
 * The script reads these env vars:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * It will create an admin user with email/password provided below. Edit the payload as needed.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  console.error('Set them and re-run. Example (PowerShell):');
  console.error("$env:SUPABASE_URL='https://xyz.supabase.co'; $env:SUPABASE_SERVICE_ROLE_KEY='your_service_role_key'; node .\\scripts\\create_admin_via_api.js");
  process.exit(1);
}

// Change the admin credentials here if you want different defaults
const payload = {
  email: process.env.NEW_ADMIN_EMAIL || 'admin@tokkit.app',
  password: process.env.NEW_ADMIN_PASSWORD || '123456',
  email_confirm: true,
  user_metadata: { role: 'admin' }
};

async function createAdmin() {
  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Failed to create admin user:', res.status, data);
      process.exit(2);
    }

    console.log('Admin user created successfully:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(3);
  }
}

createAdmin();
