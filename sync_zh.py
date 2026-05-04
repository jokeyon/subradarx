import json

with open('locales/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)

with open('locales/zh.json', 'r', encoding='utf-8') as f:
    zh = json.load(f)

for k in en:
    if k not in zh:
        zh[k] = k

with open('locales/zh.json', 'w', encoding='utf-8', newline='\n') as f:
    json.dump(zh, f, indent=2, ensure_ascii=False)

print('zh.json synced successfully')