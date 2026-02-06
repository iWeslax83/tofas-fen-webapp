import re

with open('client/src/pages/Dashboard/dashboardButtonConfig.ts', 'r') as f:
    content = f.read()

# Remove color: 'xxx', lines
content = re.sub(r'\s*color:\s*[\'"][^\'"]+[\'"],?\n', '\n', content)
# Clean up multiple empty lines
content = re.sub(r'\n\n\n+', '\n\n', content)

with open('client/src/pages/Dashboard/dashboardButtonConfig.ts', 'w') as f:
    f.write(content)

print('Color properties removed successfully')
