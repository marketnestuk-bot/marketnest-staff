import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const URL='https://epktcpwyuagemvevyobf.supabase.co';
const $=id=>document.getElementById(id);const message=t=>$('message').textContent=t;
const roles=[['moderate_listings','Moderate adverts'],['review_sellers','Review sellers'],['view_support','View support (planned)'],['manage_support','Manage support (planned)'],['view_finance','View finance reports (planned)']];
const defaults=['moderate_listings','review_sellers','view_support','manage_support'];
let client, recovering=false;
const recoveryPanel=make('section'); recoveryPanel.className='panel'; recoveryPanel.hidden=true; recoveryPanel.innerHTML='<h2>Choose a new password</h2><form><label>New password<input type="password" autocomplete="new-password" minlength="12" required></label><label>Confirm password<input type="password" autocomplete="new-password" minlength="12" required></label><button>Save password</button></form>'; $('login').after(recoveryPanel);
recoveryPanel.querySelector('form').onsubmit=async e=>{e.preventDefault();const [a,b]=e.target.querySelectorAll('input');if(!recovering)return;if(a.value!==b.value){message('Passwords do not match.');return;}try{const {error}=await client.auth.updateUser({password:a.value});if(error)throw error;a.value=b.value='';await client.auth.signOut();recovering=false;recoveryPanel.hidden=true;await refresh();message('Password updated. Please sign in.');}catch(err){message(err.message)}};
$('login').append(action('Forgot password?',async()=>{const email=$('email').value.trim();if(!email){message('Enter your email first.');return;}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;message('If the account exists, a recovery email will be sent.');}));
function make(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;}
function checks(values){const d=make('div');for(const [key,title] of roles){const label=make('label'),c=make('input');c.type='checkbox';c.value=key;c.checked=!!values[key];label.append(c,document.createTextNode(' '+title));d.append(label);}return d;}
function values(d){const result={};d.querySelectorAll('input:checked').forEach(x=>result[x.value]=true);return result;}
function action(title,fn){const b=make('button',title);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){message(e.message)}finally{b.disabled=false}};return b;}
async function rpc(name,args={}){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
function start(){const key=localStorage.getItem('marketnest_publishable_key');$('setup').hidden=!!key;if(!key)return;if(!/^sb_publishable_/.test(key)){localStorage.removeItem('marketnest_publishable_key');start();return;}client=createClient(URL,key);client.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){recovering=true;$('login').hidden=true;$('portal').hidden=true;recoveryPanel.hidden=false;message('Choose a new password.');}});refresh().catch(e=>message(e.message));}
async function refresh(){
  const {data}=await client.auth.getUser();
  $('owner').hidden=true;
  $('employee').hidden=true;
  const old=$('staff-dashboard');if(old)old.remove();
  if(recovering){$('login').hidden=true;$('portal').hidden=true;return;}
  const user=data?.user;
  $('login').hidden=!!user;$('portal').hidden=!user;
  if(!user)return;
  $('identity').textContent='Signed in as '+user.email;
  const owner=await rpc('owner_staff_overview');
  if(owner!==null){$('owner').hidden=false;render(owner);return;}
  const staff=await rpc('my_staff_status');
  if(staff===null){$('employee').hidden=false;return;}
  const panel=make('section');panel.id='staff-dashboard';panel.className='panel';
  $('employee').after(panel);
  if(staff.active!==true){panel.append(make('h2','Access suspended'));return;}
  panel.append(make('h2','Staff Dashboard'),make('p','Account status: Active'),make('h3','Your permissions'));
  for(const [key,title] of roles){if(staff.permissions?.[key]===true)panel.append(make('p','✓ '+title));}
  panel.append(make('p','Moderation tools coming next.'));
}
function render(d){for(const id of ['staff','invitations','audit'])$(id).replaceChildren();for(const s of d.staff||[]){const card=make('div');card.className='card';card.append(make('strong',s.email),make('p',s.suspended?'Suspended':'Active'));const c=checks(s.permissions||{});card.append(c,action('Save permissions',async()=>{await rpc('owner_update_staff',{p_user_id:s.user_id,p_permissions:values(c),p_suspended:s.suspended});message('Permissions saved');await refresh()}),action(s.suspended?'Reactivate':'Suspend',async()=>{if(!confirm('Change access for '+s.email+'?'))return;await rpc('owner_update_staff',{p_user_id:s.user_id,p_permissions:s.permissions,p_suspended:!s.suspended});await refresh()}));$('staff').append(card);}for(const i of d.invitations||[]){const card=make('div');card.className='card';card.append(make('strong',i.email),make('p',i.status));if(i.status==='pending')card.append(action('Revoke invitation',async()=>{await rpc('owner_revoke_staff_invitation',{p_invitation_id:i.id});await refresh()}));$('invitations').append(card);}for(const a of d.audit||[]){const card=make('div');card.className='card';const details=a.details||{};const actor=(d.staff||[]).find(s=>s.user_id===a.actor_id);const title=({product_listing_moderated:'Advert moderation',seller_application_reviewed:'Seller application review'})[a.action]||a.action;card.append(make('strong',title),make('p','Staff: '+(actor?.email||a.actor_id||'System')),make('p',new Date(a.created_at).toLocaleString('en-GB')));if(details.record_id)card.append(make('p','Record: '+details.record_id));if(details.new_status)card.append(make('p','Decision: '+(details.previous_status||'Unknown')+' → '+details.new_status));$('audit').append(card);}}
$('defaults').append(checks(Object.fromEntries(defaults.map(x=>[x,true]))));
$('savekey').onclick=()=>{const k=$('pubkey').value.trim();if(!/^sb_publishable_[a-zA-Z0-9_-]+$/.test(k)){message('Enter a valid publishable key, not a secret key.');return;}localStorage.setItem('marketnest_publishable_key',k);start();};
$('loginform').onsubmit=async e=>{e.preventDefault();try{const {error}=await client.auth.signInWithPassword({email:$('email').value,password:$('password').value});$('password').value='';if(error)throw error;await refresh();}catch(err){message(err.message)}};
$('inviteform').onsubmit=async e=>{e.preventDefault();try{await rpc('owner_invite_staff',{p_email:$('inviteemail').value.trim().toLowerCase(),p_permissions:values($('defaults'))});$('inviteemail').value='';message('Invitation saved. No email sent; share the site address separately.');await refresh();}catch(err){message(err.message)}};
$('accept').onclick=async()=>{try{const ok=await rpc('accept_staff_invitation');message(ok?'Invitation accepted':'No pending invitation found');await refresh()}catch(e){message(e.message)}};
$('logout').onclick=async()=>{await client.auth.signOut();await refresh();};start();
