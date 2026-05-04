import json

file_path = 'C:/Users/ASUS/Documents/1/subradar-expo/locales/zh.json'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('SubRadar Max', 'subradax')
content = content.replace('SubRadar', 'subradax')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("zh.json updated safely.")
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        json.load(f)
    print("JSON validation: PASSED")
except Exception as e:
    print(f"JSON validation: FAILED - {e}")
