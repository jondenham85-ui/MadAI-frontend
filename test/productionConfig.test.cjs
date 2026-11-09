const{test}=require('node:test');const assert=require('node:assert/strict');const{readFileSync}=require('node:fs');
const text=readFileSync('.env.production','utf8');
const env=Object.fromEntries(text.split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)];}));
test('production default API route remains same-origin',()=>assert.equal(env.NEXT_PUBLIC_API_URL,'/api/backend'));
test('server and public defaults target the approved Supabase project',()=>{assert.equal(env.SUPABASE_URL,'https://rcetiocftggebqzfuncd.supabase.co');assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_URL);});
test('frontend defaults contain only the matching publishable client key',()=>{assert.match(env.SUPABASE_PUBLISHABLE_KEY,/^sb_publishable_/);assert.equal(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,env.SUPABASE_PUBLISHABLE_KEY);assert.doesNotMatch(text,/sb_secret_/);});
test('production defaults exclude privileged server secrets and legacy backend domains',()=>{for(const key of ['SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','DATABASE_URL','POSTGRES_PASSWORD'])assert.equal(Object.hasOwn(env,key),false);assert.doesNotMatch(text,/onrender[.]com/);});
