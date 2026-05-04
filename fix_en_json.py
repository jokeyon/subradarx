import json
import sys

# Try to read and validate en.json
try:
    with open('C:/Users/ASUS/Documents/1/subradar-expo/locales/en.json', 'r', encoding='utf-8') as f:
        content = f.read()
    print("File read successfully.")
    print(f"File size: {len(content)} bytes")
    print(f"Last 100 chars: {repr(content[-100:])}")
    
    # Try to parse JSON
    json.loads(content)
    print("JSON is valid!")
except json.JSONDecodeError as e:
    print(f"JSON Invalid at line {e.lineno}, col {e.colno}: {e.msg}")
    # Show context
    lines = content.splitlines()
    if e.lineno <= len(lines):
        print(f"Line {e.lineno}: {lines[e.lineno-1]}")
except Exception as e:
    print(f"Error: {e}")
