import re
content = open('src/components/OnboardingWizard.jsx', encoding='utf-8').read()
content = re.sub(r"icon:'[^']*'", "icon:''", content)
open('src/components/OnboardingWizard.jsx', 'w', encoding='utf-8').write(content)
print('done:', content.count("icon:''"))
