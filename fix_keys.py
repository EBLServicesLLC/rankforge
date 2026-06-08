f = open('public/rankforge3.html', 'rb')
content = f.read()
f.close()
marker = b'</script>\r\n\r\n</body>\r\n</html><!-- deploy -->\r\n'
inject = b'<script>\r\ndocument.addEventListener("DOMContentLoaded",function(){\r\n  var sbUrl=sessionStorage.getItem("rf_sb_url");\r\n  var sbKey=sessionStorage.getItem("rf_sb_key");\r\n  var userId=sessionStorage.getItem("rf_user_id");\r\n  if(!sbUrl||!sbKey||!userId)return;\r\n  var _authKey=sbKey;\r\n  try{var _ref=sbUrl.replace("https://","").split(".")[0];var _authData=localStorage.getItem("sb-"+_ref+"-auth-token");if(_authData){var _token=JSON.parse(_authData).access_token;if(_token)_authKey=_token;}}catch(e){}\r\n  var h={"apikey":sbKey,"Authorization":"Bearer "+_authKey,"Content-Type":"application/json"};\r\n  fetch(sbUrl+"/rest/v1/settings?user_id=eq."+userId+"&limit=1",{headers:h}).then(function(r){return r.json();}).then(function(rows){\r\n    if(!rows||!rows.length)return;\r\n    var s=rows[0];\r\n    var keyToS={anthropic_key:"anthropic",openai_key:"openai",gemini_key:"gemini",google_key:"google",indexnow_key:"indexnow",yext_key:"yext",yext_account:"yextAccount",moz_id:"mozId",moz_secret:"mozSecret",brightlocal_key:"brightlocal",brightlocal_cid:"brightlocalCid",gmail_token:"gmail",fb_token:"fb",fb_page_id:"fbPage",linkedin_token:"linkedin"};\r\n    var waited=0;\r\n    function syncKeys(){\r\n      if(typeof S!=="undefined"&&S.keys){\r\n        Object.keys(keyToS).forEach(function(col){if(s[col])S.keys[keyToS[col]]=s[col];});\r\n        if(typeof updateKeyIndicators==="function")updateKeyIndicators();\r\n        if(typeof updateAIStatus==="function")updateAIStatus();\r\n        if(typeof persist==="function")persist();\r\n      } else if(waited++<20){setTimeout(syncKeys,150);}\r\n    }\r\n    syncKeys();\r\n  }).catch(function(e){console.warn("[RF] sync failed:",e);});\r\n});\r\n</script>\r\n'
if marker in content:
    new_content = content.replace(marker, inject + marker, 1)
    open('public/rankforge3.html', 'wb').write(new_content)
    print('OK size:', len(new_content))
else:
    print('MARKER NOT FOUND')
