import json

file_path = 'C:/Users/ASUS/Documents/1/subradar-expo/locales/en.json'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Safe string replacement
content = content.replace('SubRadar Max', 'subradax')
content = content.replace('SubRadar', 'subradax') # In case there are any without Max

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement done safely.")

# Validate JSON
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        json.load(f)
    print("JSON validation: PASSED")
except json.JSONDecodeError as e:
    print(f"JSON validation: FAILED - {e}")
