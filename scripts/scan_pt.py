import os, re, json

tsx_files = []
for root, dirs, files in os.walk('client/src'):
    for f in files:
        if f.endswith('.tsx'):
            tsx_files.append(os.path.join(root, f))

# Look for typical Portuguese characters and keywords in JSX text and attributes
words = ['nível', 'caçada', 'ouro', 'você', 'não', 'banco', 'depósito', 'trein', 'mestre', 'fechar', 'cancelar', 'receber', 'trocar', 'entrar', 'comprar', 'vender', 'arma', 'escudo', 'elmo', 'vida', 'habilidade', 'apenas', 'todos', 'tudo', 'nenhum', 'abrir', 'equipar', 'desequipar']
pattern = re.compile(r'(' + '|'.join(words) + r')', re.IGNORECASE)

results = {}
for path in tsx_files:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    matches = []
    for idx, line in enumerate(lines):
        line_clean = line.strip()
        if line_clean.startswith('//') or line_clean.startswith('/*') or line_clean.startswith('*'):
            continue
        if "lang === 'pt'" in line or 'getLang()' in line or 't(' in line:
            # check if only partly translated
            pass
        if pattern.search(line):
            # check if it is inside a string or jsx text
            matches.append((idx + 1, line_clean))
    if matches:
        results[path] = matches

for path, matches in sorted(results.items()):
    print(f"=== {path} ({len(matches)} occurrences) ===")
    for lno, text in matches[:8]:
        print(f"  L{lno}: {text[:110]}")
