const fs = require('fs');
let c = fs.readFileSync('src/components/DashboardShell.jsx', 'utf8');

const OLD = `  const switchTab = useCallback((tabId) => {
    setActiveTab(tabId)
    // postMessage only  contentDocument is inaccessible (confirmed null)
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'SWITCH_TAB', payload: { tab: tabId } }, '*'
    )
  }, [])`;

const NEW = `  const JSX_TABS_SW = ['social-pub','locallinks','voice','schema-mon','pages','local','rank-tracker','meta','gbpqa','napaudit','kwgap','reputation'];

  const switchTab = useCallback((tabId) => {
    setActiveTab(tabId)
    if (JSX_TABS_SW.includes(tabId)) return
    // postMessage only  contentDocument is inaccessible (confirmed null)
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'SWITCH_TAB', payload: { tab: tabId } }, '*'
    )
  }, [])`;

if (c.includes(OLD)) {
  c = c.replace(OLD, NEW);
  fs.writeFileSync('src/components/DashboardShell.jsx', c);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND - trying CRLF version');
  const OLD_CRLF = OLD.replace(/\n/g, '\r\n');
  if (c.includes(OLD_CRLF)) {
    const NEW_CRLF = NEW.replace(/\n/g, '\r\n');
    c = c.replace(OLD_CRLF, NEW_CRLF);
    fs.writeFileSync('src/components/DashboardShell.jsx', c);
    console.log('SUCCESS with CRLF');
  } else {
    console.log('STILL NOT FOUND');
  }
}
