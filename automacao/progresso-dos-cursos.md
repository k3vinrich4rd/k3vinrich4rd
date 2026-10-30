# Tarefa agendada: progresso dos cursos

Roteiro da tarefa agendada do Claude (app desktop → Tarefas agendadas) que lê o progresso dos cursos no Chrome e
atualiza `cursos.json`, as notas do Obsidian e o README. Não é um script comum porque a plataforma exige login: só o
Chrome do Kevin tem a sessão, e nenhuma senha ou token fica guardado.

- **Nome:** Progresso dos cursos → Obsidian e perfil (`progresso-dos-cursos`)
- **Quando:** todo dia às 19h30 e às 22h30 (`30 19,22 * * *`) — antes do commit diário das 20h e depois dos estudos da noite
- **Pasta de trabalho:** `C:\Users\Estudo$\Documents\perfil-github`
- **Precisa:** app do Claude aberto, Chrome com a extensão Claude in Chrome e login feito na DevSuperior

## Prompt

Fale sempre em português brasileiro. Você atualiza o progresso dos cursos do Kevin (usuário GitHub k3vinrich4rd) no Obsidian e no README do perfil do GitHub. Trabalhe sozinho do começo ao fim; não peça confirmação para os passos abaixo (o Kevin já autorizou commit e push no repositório do perfil). Nunca digite e-mail, senha ou token em lugar nenhum.

PASTAS
- Perfil: C:\Users\Estudo$\Documents\perfil-github (README gerado por scripts; dados dos cursos em cursos.json; gerador do bloco em scripts/cursos.mjs).
- Obsidian: G:\Meu Drive\01 🧠 Segundo Cérebro\Obsidian Vault
- PDFs dos cursos: C:\Users\Estudo$\Documents\devsuperior\coteúdos-aulas (um curso novo ganha uma subpasta com o nome dele).

1. LER A PLATAFORMA (Claude in Chrome)
- Carregue de uma vez as ferramentas do Chrome com ToolSearch: "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_close_mcp". Abra uma aba nova sua e feche-a no fim.
- Abra https://devsuperior.club/courses/catalogue. Se cair na tela de login (as.devsuperior.com/login), PARE: não faça login, não mude nada e termine dizendo "Faça login na DevSuperior no Chrome para eu ler o progresso dos cursos".
- No catálogo, colete os links /courses/{id} dos cursos matriculados (javascript: os <a href*="/courses/"> com texto; ignore /courses/offers).
- Para cada curso, abra https://devsuperior.club/courses/{id}, espere ~3 s e leia no texto da página o trecho "Meu progresso no curso | X% | N de M aulas concluídas | a/b desafios finalizados" (o trecho de desafios pode não existir).
- Para cada curso com progresso > 0, abra https://devsuperior.club/courses/{id}/lessons, espere ~3 s e leia na <aside> o cabeçalho de cada capítulo: nome, "feitas/total |" e a duração (ex.: "6h 52m" → "6h52"; "45m" → "45min").

2. ATUALIZAR cursos.json (mantenha o formato do arquivo)
- "atualizado": data de hoje (AAAA-MM-DD, America/Sao_Paulo).
- Curso já em "cursos": atualize progresso, aulas, desafios e as contagens de cada capítulo (mesma ordem da plataforma). Mantenha o texto "entrega" de cada capítulo; só troque quando houver fato novo (ex.: um desafio passou a contar como finalizado e existe repositório novo no GitHub do Kevin — confira com `gh repo list k3vinrich4rd --limit 100 --json name,url,createdAt`; nunca invente link).
- Curso que saiu de 0% (estava em "naFila"): mova para "cursos" com id "devsuperior-{id}", nome, plataforma "DevSuperior", url, "nota": "🎓 Curso - {nome} (DevSuperior)", capítulos (entrega "" quando não houver) e crie a nota no Obsidian (passo 3).
- Curso matriculado novo com 0%: acrescente em "naFila" (nome, plataforma, url, aulas). Curso que sumiu do catálogo: tire de "naFila".

3. OBSIDIAN (nota do curso em "03 Estudos/00 Consulta/🎓 Curso - {nome} (DevSuperior).md")
- Use como modelo a nota "03 Estudos/00 Consulta/🎓 Curso - Java Spring Professional (DevSuperior).md": frontmatter (tipo: hub, progresso, atualizado), 🎯 Em 30 segundos, 📊 Progresso por capítulo, diagrama Mermaid dos capítulos, 🧾 Cobertura dos materiais, uma seção ## por capítulo com 📄 PDFs, > [!note] 📖 Ficha, ❌ Sem / ✅ Com, 🧪 Desafio e > [!example]- 🎬 Aulas, ⚠️ Pendências e 🔗 Conexões. Não use o título "## 🆚 Com × sem" nesta nota (é só para notas de estudo).
- Sempre: atualize na nota o "progresso:" do frontmatter, "atualizado:", a frase "Onde estou", a tabela 📊 (aulas feitas/total e status ✅ concluído, 🔄 em andamento, 📅 não começado) e os emojis do diagrama.
- Quando um capítulo passar a 🔄 ou ✅ e a seção dele ainda não tiver Ficha com conteúdo dos PDFs: abra a aula "Material de apoio" desse capítulo na plataforma, pegue os links de PDF do Google Drive (drive.google.com/file/d/{ID}/view), baixe com `curl -sL "https://drive.usercontent.google.com/download?id={ID}&export=download&confirm=t" -o "<pasta dos PDFs>/<nome>.pdf"`, confira com `file` que é PDF, extraia o texto com `pdftotext -layout` e escreva a Ficha a partir do conteúdo real. Liste os PDFs na tabela 🧾 e em "04 Recursos/Materiais locais.md". Para exemplos de código prefira as classes reais do RKF Bank (C:\Users\Estudo$\Documents\rkfbank\backend), conferindo o nome antes.
- Curso novo: além da nota, acrescente o link dela em "01 Carreira/Certificações.md" na seção "🛤️ Em curso" e na linha de navegação do topo de "03 Estudos/00 Consulta/🧭 Trilha 1 - Java e Spring.md" quando for de Java/Spring.
- Curso que chegou a 100%: marque como concluído na nota e em Certificações (mova para a área certa como [x] "— DevSuperior").
- Atualize também a linha do curso em "01 Carreira/Certificações.md" com a porcentagem nova, quando ela existir.

4. README DO PERFIL
- Não edite o README à mão para números: o bloco <!-- AUTO:cursos --> é gerado de cursos.json. Rode na pasta do perfil: `node scripts/coletar-progresso.mjs` e depois `node scripts/atualizar-readme.mjs`.
- Exceção: quando um curso novo começar ou um capítulo novo ganhar conteúdo, acrescente em "#### 📖 O que aprendi no {curso}" (abaixo do bloco AUTO, antes de "## 🎓 Formação") um <details> curto por capítulo, no mesmo estilo dos que já existem, só com o que veio dos PDFs.
- Valide antes de publicar: todo SVG em assets/ precisa ser XML válido (PowerShell: [xml](Get-Content arquivo -Raw -Encoding UTF8)); os blocos ```mermaid da seção "## 📚 Cursos em andamento" precisam renderizar (`npx -y -p @mermaid-js/mermaid-cli@11.4.2 mmdc -q -i bloco.mmd -o saida.svg`, arquivos temporários fora do repositório).

5. PUBLICAR
- Na pasta do perfil, só se estiver na branch main e `git status --porcelain` não mostrar mudanças além de README.md, progresso.json, cursos.json e assets/: `git add README.md progresso.json cursos.json assets`. Se não houver nada em stage, não faça commit.
- Commit com a variável KEVIN_SYNC=1 (para o hook global não disparar): mensagem "docs(perfil): progresso dos cursos" e, no corpo, uma linha por curso que mudou (ex.: "Java Spring Professional: 40% -> 43%, capitulo 4 com 9/38"). Termine a mensagem com a linha: Co-Authored-By: Claude <noreply@anthropic.com>
- `git pull --rebase --autostash -X theirs -q origin main` e `git push -q origin main`. Se o pull deixar um stash "autostash" para trás, confira com `git diff HEAD stash@{0} --stat` que ele só tem versões antigas de arquivos gerados antes de apagá-lo.
- Não faça commit nem push em nenhum outro repositório.

6. RESUMO FINAL (curto, em português): progresso de cada curso antes → depois, capítulos que mudaram, PDFs baixados, notas criadas ou alteradas, hash do commit (ou "nada mudou, sem commit") e qualquer problema.
