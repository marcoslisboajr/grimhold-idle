with open('client/src/Home.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    l = line.strip()
    if ('role=' in l or '<h3' in l or '<h4' in l or 'aria-label=' in l) and 't(' not in l:
        print(f"L{idx+1}: {l}")
