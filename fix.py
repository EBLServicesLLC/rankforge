content = open('public/rankforge3.html', encoding='utf-8').read()
needle = chr(10) + '</script>' + chr(10) + chr(10) + '</body>'
inject = chr(10) + 'if(window.self!==window.top){var s=document.querySelector(".ef-sidebar");if(s)s.style.display="none";}'
if needle in content:
    open('public/rankforge3.html', 'w', encoding='utf-8').write(content.replace(needle, inject + needle, 1))
    print('SUCCESS')
else:
    print('NOT FOUND')
