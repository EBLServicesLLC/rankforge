$html = Get-Content "C:\Users\Darno\RankForgedAI\public\rankforge3.html" -Raw -Encoding UTF8

$old = '    }).catch(function(e){console.warn(''[RankForged] sync failed:'',e);});
});</script>'

$loader = '    }).catch(function(e){console.warn(''[RankForged] sync failed:'',e);});
});

// Business Profile Loader - reads client_data from Supabase and pre-fills form
document.addEventListener(''DOMContentLoaded'', function() {
  var sbUrl  = sessionStorage.getItem(''rf_sb_url'');
  var sbKey  = sessionStorage.getItem(''rf_sb_key'');
  var userId = sessionStorage.getItem(''rf_user_id'');
  var clientId = sessionStorage.getItem(''rf_client'') ||
                 new URLSearchParams(window.location.search).get(''client'');
  if (!sbUrl || !sbKey || !userId || !clientId) return;
  var authKey = sbKey;
  try {
    var ref = sbUrl.replace(''https://'','''' ).split(''.'')[0];
    var authData = localStorage.getItem(''sb-''+ref+''-auth-token'');
    if (authData) { var token = JSON.parse(authData).access_token; if (token) authKey = token; }
  } catch(e) {}
  fetch(sbUrl + ''/rest/v1/client_data?client_id=eq.'' + clientId + ''&user_id=eq.'' + userId + ''&limit=1'', {
    headers: { ''apikey'': sbKey, ''Authorization'': ''Bearer '' + authKey, ''Content-Type'': ''application/json'' }
  })
  .then(function(r) { return r.json(); })
  .then(function(rows) {
    var d = rows && rows[0];
    if (!d) return;
    function setVal(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; }
    setVal(''biz-name'',    d.biz_name);
    setVal(''biz-cat'',     d.biz_cat);
    setVal(''biz-addr'',    d.biz_addr);
    setVal(''biz-city'',    d.biz_city);
    setVal(''biz-state'',   d.biz_state);
    setVal(''biz-zip'',     d.biz_zip);
    setVal(''biz-phone'',   d.biz_phone);
    setVal(''biz-website'', d.biz_website);
    setVal(''biz-desc'',    d.biz_desc);
    if (d.biz_kw && window.S) {
      window.S.keywords = d.biz_kw;
      var kwEl = document.getElementById(''biz-keywords'') || document.getElementById(''biz-kw'');
      if (kwEl) kwEl.value = d.biz_kw;
    }
    console.log(''[RankForged] Business profile loaded:'', d.biz_name);
  })
  .catch(function(e) { console.warn(''[RankForged] Biz loader failed:'', e); });
});
</script>'

if ($html.Contains($old.Substring(0,50))) {
    Write-Host "Target found - replacing..."
    $html = $html.Replace($old, $loader)
    [System.IO.File]::WriteAllText("C:\Users\Darno\RankForgedAI\public\rankforge3.html", $html, [System.Text.Encoding]::UTF8)
    Write-Host "SUCCESS: Business profile loader appended"
} else {
    Write-Host "ERROR: Target string not found"
    Write-Host "Last 200 chars:"
    Write-Host $html.Substring($html.Length - 200)
}
