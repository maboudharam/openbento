import { execSync } from 'node:child_process';

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const adminToken = process.env.OPENBENTO_ANALYTICS_ADMIN_TOKEN?.trim();

const required = [
  ['SUPABASE_PROJECT_REF', projectRef],
  ['SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey],
  ['OPENBENTO_ANALYTICS_ADMIN_TOKEN', adminToken],
];

const missing = required.filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  console.error('Example:');
  console.error(
    '  SUPABASE_PROJECT_REF=xxxx SUPABASE_SERVICE_ROLE_KEY=... OPENBENTO_ANALYTICS_ADMIN_TOKEN=... npm run analytics:supabase:init'
  );
  process.exit(1);
}

const hasSupabaseCli = () => {
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

if (!hasSupabaseCli()) {
  console.error('Supabase CLI not found. Install it first: https://supabase.com/docs/guides/cli');
  process.exit(1);
}

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
};

run(`supabase link --project-ref ${projectRef}`);
run('supabase db push');
run(
  `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey} OPENBENTO_ANALYTICS_ADMIN_TOKEN=${adminToken}`
);
run('supabase functions deploy openbento-analytics-track --use-api --no-verify-jwt');
run('supabase functions deploy openbento-analytics-admin --use-api --no-verify-jwt');

const supabaseUrl =
  process.env.SUPABASE_URL?.trim().replace(/\/+$/, '') || `https://${projectRef}.supabase.co`;
console.log('\nDone.');
console.log(`Track endpoint: ${supabaseUrl}/functions/v1/openbento-analytics-track`);
console.log(`Admin endpoint: ${supabaseUrl}/functions/v1/openbento-analytics-admin`);
