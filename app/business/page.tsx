'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NexusWorkspace from '@/components/layout/NexusWorkspace';
import { useUser } from '@/context/UserContext';
import { getAccessToken } from '@/lib/supabase';

const SHOPIFY_URL = 'https://rcetiocftggebqzfuncd.supabase.co/functions/v1/madsi-shopify';
type Connection = { shop_domain: string; shop_name: string | null; granted_scopes: string[]; status: string; last_verified_at: string | null };
type Product = { id: string; title: string; status: string; vendor: string; totalInventory: number; variants?: { nodes: { title: string; price: string; inventoryQuantity: number }[] } };
type Order = { id: string; name: string; createdAt: string; displayFinancialStatus: string; displayFulfillmentStatus: string; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } } };
export default function BusinessPage() {
 const { user, loading } = useUser();
 const router = useRouter();
 const [connection,setConnection] = useState<Connection|null>(null);
 const [products,setProducts] = useState<Product[]>([]);
 const [orders,setOrders] = useState<Order[]>([]);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState('');
 const [notice,setNotice] = useState('');
 const [shopifySecret,setShopifySecret] = useState('');
 const [savingSecret,setSavingSecret] = useState(false);
 const [tab,setTab] = useState<'products'|'orders'>('products');
 const owner = user?.role === 'OWNER' || user?.role === 'ADMIN';
 const request = useCallback(async (path:string, method:'GET'|'POST'='GET') => {
  const token=await getAccessToken();
  if(!token) throw new Error('Your MADSI session expired. Sign in again.');
  const response=await fetch(SHOPIFY_URL+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({shop:'uunwqe-eu.myshopify.com'})}:{}),cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||'MADSI could not reach Shopify.');
  return data;
 },[]);
 const load=useCallback(async()=>{
  const status=await request('/status');
  setConnection(status.connection||null);
  if(status.connected){
   const [p,o]=await Promise.all([request('/products'),request('/orders')]);
   setProducts(Array.isArray(p.products)?p.products:[]);
   setOrders(Array.isArray(o.orders)?o.orders:[]);
  }
 },[request]);
 useEffect(()=>{if(!loading&&!user)router.replace('/login');},[loading,user,router]);
 useEffect(()=>{
  const status=new URLSearchParams(window.location.search).get('shopify');
  if(status==='connected')setNotice('MAD Warehouse is now connected to MADSI. Store data below is read-only.');
  else if(status==='setup_required')setError('The secure Shopify app credentials still need to be configured in Supabase. No store access token was created.');
  else if(status)setError('Shopify authorization did not finish ('+status.replaceAll('_',' ')+'). You can retry the connection.');
 },[]);
 useEffect(()=>{if(!loading&&user&&owner)void load().catch(e=>setError(e instanceof Error?e.message:'Could not load Shopify status.'));},[loading,user?.id,owner,load]);
 async function saveShopifySecret(){
  if(!shopifySecret.trim()){setError('Enter the Shopify app client secret to store it securely.');return;}
  setSavingSecret(true);setError('');setNotice('');
  try{
   const token=await getAccessToken();
   if(!token)throw new Error('Your MADSI session expired. Sign in again.');
   const response=await fetch(SHOPIFY_URL+'/credentials',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({shopify_api_secret:shopifySecret}),cache:'no-store'});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.error||'MADSI could not store the Shopify secret securely.');
   setShopifySecret('');
   setNotice('Shopify client secret stored securely in Supabase Vault. MADSI can now start the authorization flow when you choose.');
  }catch(e){setError(e instanceof Error?e.message:'Could not store Shopify credentials.');}
  finally{setSavingSecret(false);}
 }
 async function connect(){
  setBusy(true);setError('');setNotice('');
  try{const result=await request('/connect','POST');if(!result.authorization_url)throw new Error('Shopify did not return an authorization link.');window.location.assign(result.authorization_url);}
  catch(e){setError(e instanceof Error?e.message:'Could not start Shopify authorization.');setBusy(false);}
 }
 if(loading||!user)return <main className="p-8 text-cyan-100">Checking your MADSI account…</main>;
 if(!owner)return <NexusWorkspace><section className="mx-auto max-w-3xl rounded-2xl border border-cyan-900 bg-slate-950 p-6 text-cyan-100"><h1 className="text-2xl font-semibold">Owner access required</h1><p className="mt-2 text-slate-300">Store connections and order data are restricted to MADSI owners.</p></section></NexusWorkspace>;
 return <NexusWorkspace><section className="mx-auto max-w-6xl space-y-6 text-cyan-50">
  <header className="rounded-2xl border border-cyan-900/70 bg-gradient-to-br from-slate-950 to-teal-950/40 p-6 sm:p-8"><p className="text-xs font-semibold tracking-[.25em] text-teal-300">MADSI / BUSINESS CONTROL</p><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold sm:text-4xl">Business center</h1><p className="mt-2 max-w-2xl text-slate-300">Connect MAD Warehouse so MADSI can monitor your catalog, inventory, and orders from one workspace.</p></div><span className="rounded-full border border-cyan-700 px-3 py-1 text-xs">{connection?'SHOPIFY CONNECTED':'AWAITING CONNECTION'}</span></div></header>
  {notice&&<p role="status" className="rounded-xl border border-teal-800 bg-teal-950/40 p-4 text-teal-200">{notice}</p>}
  {error&&<p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/40 p-4 text-rose-200">{error}</p>}
  {!connection&&<section className="rounded-2xl border border-amber-900/70 bg-slate-950 p-5 sm:p-6"><p className="text-xs font-semibold tracking-widest text-amber-300">ONE-TIME SECURE SETUP</p><h2 className="mt-2 text-xl font-semibold">Complete MADSI’s Shopify credentials</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">MADSI’s production check confirms the Shopify app key is present, but the app client secret is not reaching its runtime. This field sends only that missing secret to MADSI’s owner-authenticated function and stores it in Supabase Vault. The value is never returned to the page or written to logs.</p><label htmlFor="madsi-shopify-secret" className="mt-4 block text-sm font-medium text-cyan-100">Shopify app client secret</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input id="madsi-shopify-secret" type="password" autoComplete="new-password" value={shopifySecret} onChange={e=>setShopifySecret(e.target.value)} placeholder="Enter the missing client secret" className="min-w-0 flex-1 rounded-lg border border-cyan-900 bg-slate-900 px-4 py-3 text-sm text-cyan-50 outline-none focus:border-teal-400"/><button onClick={()=>void saveShopifySecret()} disabled={savingSecret||!shopifySecret.trim()} className="rounded-lg bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{savingSecret?'Saving securely…':'Save securely'}</button></div><p className="mt-2 text-xs text-slate-500">You do not need to re-enter the API key. Saving this does not start Shopify authorization or change your store.</p></section>}
  <section className="rounded-2xl border border-cyan-900 bg-slate-950 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs tracking-widest text-slate-400">STORE CONNECTION</p><h2 className="mt-1 text-xl font-semibold">{connection?.shop_name||'MAD Warehouse'}</h2><p className="mt-1 text-sm text-slate-400">{connection?.shop_domain||'uunwqe-eu.myshopify.com'}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>void load().catch(e=>setError(e.message))} disabled={busy} className="rounded-lg border border-cyan-800 px-4 py-2 text-sm hover:bg-cyan-950">Refresh</button><button onClick={connect} disabled={busy} className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">{busy?'Opening Shopify…':connection?'Reconnect store':'Connect MAD Warehouse'}</button></div></div><p className="mt-4 text-sm text-slate-400">MADSI requests read-only access to products, inventory, locations, and orders. It cannot edit products, change prices, fulfill orders, or issue refunds through this connection.</p>{connection&&<p className="mt-3 text-xs text-slate-500">Last verified: {connection.last_verified_at?new Date(connection.last_verified_at).toLocaleString():'Not yet recorded'} · Permissions: {connection.granted_scopes.join(', ')}</p>}</section>
  {connection&&<><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-cyan-950 bg-slate-950 p-5"><p className="text-sm text-slate-400">Products returned</p><strong className="mt-1 block text-3xl">{products.length}</strong></div><div className="rounded-xl border border-cyan-950 bg-slate-950 p-5"><p className="text-sm text-slate-400">Orders returned</p><strong className="mt-1 block text-3xl">{orders.length}</strong></div><div className="rounded-xl border border-cyan-950 bg-slate-950 p-5"><p className="text-sm text-slate-400">Tracked inventory</p><strong className="mt-1 block text-3xl">{products.reduce((sum,p)=>sum+(p.totalInventory||0),0)}</strong></div></div>
  <section className="rounded-2xl border border-cyan-900 bg-slate-950 p-5"><div className="flex flex-wrap gap-3 border-b border-cyan-950 pb-4"><button onClick={()=>setTab('products')} className={tab==='products'?'rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950':'rounded-lg border border-cyan-900 px-4 py-2 text-sm'}>Products & inventory</button><button onClick={()=>setTab('orders')} className={tab==='orders'?'rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950':'rounded-lg border border-cyan-900 px-4 py-2 text-sm'}>Recent orders</button></div>
  {tab==='products'?<div className="mt-4 space-y-3">{products.length===0?<p className="text-sm text-slate-400">No products were returned by Shopify.</p>:products.map(p=><article key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-950 pb-3"><div><h3 className="font-medium">{p.title}</h3><p className="text-xs text-slate-500">{p.vendor||'No vendor'} · {p.status}</p></div><div className="text-right"><strong>{p.totalInventory} units</strong><p className="text-xs text-slate-500">{p.variants?.nodes?.length||0} variants returned</p></div></article>)}</div>:<div className="mt-4 space-y-3">{orders.length===0?<p className="text-sm text-slate-400">No orders were returned for the current query.</p>:orders.map(o=><article key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-950 pb-3"><div><h3 className="font-medium">{o.name}</h3><p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()} · {o.displayFinancialStatus} · {o.displayFulfillmentStatus}</p></div><strong>{o.totalPriceSet.shopMoney.amount} {o.totalPriceSet.shopMoney.currencyCode}</strong></article>)}</div>}
  </section></>}
 </section></NexusWorkspace>;
}
