import os, shutil, re, subprocess

path = os.path.join("public", "rankforge3.html")
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

print(f"Loaded: {len(html):,} bytes")
shutil.copy(path, path + ".clean")
fixes = 0

# FIX 1: Remove border-radius from ef-app (causes card look / bleed)
old1 = 'border-radius:var(--r-lg);overflow:visible;position:relative;z-index:1;box-shadow:var(--shadow-md);max-width:1400px;margin:0 auto;'
new1 = 'border-radius:0;overflow:hidden;position:relative;z-index:1;max-width:100%;margin:0;'
if old1 in html:
    html = html.replace(old1, new1, 1)
    print("Fix 1: ef-app - no card styling, full width")
    fixes += 1
else:
    print("Fix 1: pattern not found")
    pos = html.find('max-width:1400px')
    if pos > 0: print(f"  Context: {html[pos-60:pos+60]}")

# FIX 2: Remove border-radius from ef-main
old2 = 'border-radius:0 var(--r-lg) var(--r-lg) 0;overflow:hidden}'
new2 = 'border-radius:0;overflow:hidden}'
if old2 in html:
    html = html.replace(old2, new2, 1)
    print("Fix 2: ef-main - no border-radius")
    fixes += 1
else:
    print("Fix 2: pattern not found")

# FIX 3: Remove border-radius from ef-sidebar
old3 = 'border-radius:var(--r-lg) 0 0 var(--r-lg);overflow:hidden;position:relative}'
new3 = 'border-radius:0;overflow:hidden;position:relative}'
if old3 in html:
    html = html.replace(old3, new3, 1)
    print("Fix 3: ef-sidebar - no border-radius")
    fixes += 1
else:
    print("Fix 3: pattern not found")

# FIX 4: Add back button to sidebar
old4 = '<aside class="ef-sidebar"> <div class="ef-sidebar-logo">'
new4 = '''<aside class="ef-sidebar"> <div class="ef-sidebar-logo">
  <a href="javascript:void(0)" onclick="window.location.href=window.location.origin+\'/\';"
    style="display:block;text-align:center;padding:5px 8px;margin:4px 8px 2px;
    background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:7px;
    color:#60a5fa;font-size:11px;font-weight:700;text-decoration:none;">
    ← My Businesses</a>'''
if old4 in html:
    html = html.replace(old4, new4, 1)
    print("Fix 4: Back button added")
    fixes += 1
else:
    print("Fix 4: pattern not found")

# FIX 5: Add sessionStorage credential reader before main script
old5 = '<body> <div class="ef-'
new5 = '''<body>
<script>
(function(){
  try {
    var u=sessionStorage.getItem('rf_sb_url');
    var k=sessionStorage.getItem('rf_sb_key');
    var uid=sessionStorage.getItem('rf_user_id');
    var cid=sessionStorage.getItem('rf_client');
    if(u) window._SB_URL=u;
    if(k) window._SB_KEY=k;
    if(uid) window._SB_UID=uid;
    if(cid) window._SB_CLIENT=cid;
  } catch(e){}
})();
</script>
<div class="ef-'''
if old5 in html:
    html = html.replace(old5, new5, 1)
    print("Fix 5: sessionStorage reader added")
    fixes += 1
else:
    print("Fix 5: pattern not found")

# FIX 6: Add Supabase data loader at end of efAppInit
old6 = "renderServiceCities();\n}function persist("
new6 = """renderServiceCities();
  // Load API keys + business profile from Supabase
  try {
    if (window._SB_URL && window._SB_KEY) {
      var _h = {'apikey':window._SB_KEY,'Authorization':'Bearer '+window._SB_KEY,'Content-Type':'application/json'};
      var _uid = window._SB_UID || '';
      var _cid = window._SB_CLIENT || (new URLSearchParams(window.location.search)).get('client') || '';
      if (_uid) {
        fetch(window._SB_URL+'/rest/v1/settings?select=*&user_id=eq.'+_uid+'&limit=1',{headers:_h})
          .then(function(r){return r.json();}).then(function(rows){
            var s=rows[0]||{};
            var km={'anthropic_key':'anthropic','google_key':'google','indexnow_key':'indexnow',
                    'yext_key':'yext','yext_account':'yext-account','openai_key':'openai',
                    'gemini_key':'gemini','moz_id':'moz-id','moz_secret':'moz-secret',
                    'brightlocal_key':'brightlocal','brightlocal_cid':'brightlocal-cid'};
            Object.keys(km).forEach(function(col){
              if(!s[col]) return;
              var entry=KEY_MAP[km[col]]||Object.values(KEY_MAP).find(function(m){return m.sk===km[col];});
              if(entry){S.keys[entry.sk]=s[col];var el=document.getElementById(entry.inputId);if(el)el.value=s[col];}
            });
            if(typeof renderKeyStatus==='function') renderKeyStatus();
          }).catch(function(){});
      }
      if (_cid) {
        fetch(window._SB_URL+'/rest/v1/client_data?client_id=eq.'+_cid+'&select=*&limit=1',{headers:_h})
          .then(function(r){return r.json();}).then(function(rows){
            var c=rows[0]||{};
            var fm={'biz_name':'biz-name','biz_cat':'biz-cat','biz_addr':'biz-addr',
                    'biz_city':'biz-city','biz_state':'biz-state','biz_zip':'biz-zip',
                    'biz_phone':'biz-phone','biz_website':'biz-website','biz_desc':'biz-desc','biz_kw':'biz-kw'};
            Object.keys(fm).forEach(function(col){
              if(!c[col]) return;
              var el=document.getElementById(fm[col]);
              if(el) el.value=c[col];
            });
            persist();
            if(typeof renderDirs==='function') renderDirs();
            if(typeof renderBL==='function') renderBL();
            if(typeof renderW2==='function') renderW2();
            if(typeof renderDashboard==='function') renderDashboard();
            if(typeof renderServiceCities==='function') renderServiceCities();
          }).catch(function(){});
      }
    }
  } catch(e){}
}function persist("""
if old6 in html:
    html = html.replace(old6, new6, 1)
    print("Fix 6: Supabase data loader added")
    fixes += 1
else:
    print("Fix 6: pattern not found")
    pos = html.find('renderServiceCities()')
    print(f"  renderServiceCities at: {pos}")

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nTotal fixes: {fixes}/6")
print(f"Saved: {len(html):,} bytes")
if fixes >= 4:
    print("\nNow run:")
    print("  git add -f public/rankforge3.html")
    print("  git commit -m \"Clean restore + layout fix + Supabase data loading\"")
    print("  git push")
else:
    print("\nWARNING: Some fixes not applied - check patterns above")