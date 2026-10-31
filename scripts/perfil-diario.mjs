// Rotina diária do perfil (workflow .github/workflows/perfil-diario.yml, também roda na máquina do Kevin).
//
// O que faz, sem nunca criar commit vazio (quem commita é o workflow, só se algum arquivo mudou):
//  1. README, entre <!-- ULTIMOS-COMMITS:START/END -->: o último commit de cada projeto recente do Kevin
//     (branch padrão e develop). Repositório privado aparece só como "projeto privado" + data: sem nome, mensagem nem link.
//  2. README, entre <!-- METAS:START/END -->: desenha o que estiver em metas/progresso.json. Este script NÃO calcula
//     meta nenhuma: quem decide quais commits contam é a rotina do Black, que reescreve aquele arquivo.
//  3. diario/AAAA-MM-DD.md (data de Brasília): o resumo do dia. Fonte, nesta ordem:
//     a) diario/inbox/AAAA-MM-DD.md (o resumo do diário do Obsidian, publicado pela rotina do Black);
//     b) a atividade pública do Kevin no GitHub nas últimas 24h (commits, PRs e issues; privado só entra como contagem);
//     c) um tópico de revisão do dia, em rodízio, tirado de revisao.yml.
//  4. progresso.md: os mesmos dados em Markdown puro, para espelhar no Obsidian.
//
// Dois modos:
//  - completo (padrão): 1 a 4. Roda na máquina de automação pelo scripts/rodar-diario.sh, com o `gh` logado como o
//    Kevin (enxerga os repositórios privados, que saem só como "projeto privado" + data).
//  - --so-metas: só 2 e 4, sem chamar a API (o workflow perfil-diario.yml usa este modo com o GITHUB_TOKEN padrão,
//    que não enxerga privados; a tabela de últimos commits fica como a máquina gerou).
// Token: GH_TOKEN se existir; sem ele, usa o `gh api` já logado.
// Uso: node scripts/perfil-diario.mjs [--so-metas] [--seco]   (--seco: só mostra o que mudaria, sem gravar)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USUARIO = process.env.PERFIL_USUARIO || 'k3vinrich4rd';
const SECO = process.argv.includes('--seco');
const SO_METAS = process.argv.includes('--so-metas');
const TZ = 'America/Sao_Paulo';
const MAX_PROJETOS = 8;
const agora = new Date();
const dia = agora.toLocaleDateString('sv-SE', { timeZone: TZ }); // AAAA-MM-DD
const diaBR = (iso) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ });
const ler = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : null);
const mudancas = [];
function escrever(rel, conteudo) {
  const f = path.join(RAIZ, rel);
  if (ler(f) === conteudo) return;
  mudancas.push(rel);
  if (SECO) return;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, conteudo);
}

// ---------- API do GitHub ----------
async function api(rota) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return JSON.parse(execFileSync('gh', ['api', rota], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }));
  const r = await fetch(`https://api.github.com${rota}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!r.ok) throw new Error(`${r.status} em ${rota}`);
  return r.json();
}
const tentar = (p) => p.catch(() => null);

async function repositorios() {
  // /user/repos (token do Kevin) enxerga os privados; o GITHUB_TOKEN do Actions cai no público.
  for (const base of ['/user/repos?affiliation=owner&sort=pushed', `/users/${USUARIO}/repos?type=owner&sort=pushed`]) {
    try {
      const todos = [];
      for (let pag = 1; ; pag++) {
        const lote = await api(`${base}&per_page=100&page=${pag}`);
        todos.push(...lote);
        if (lote.length < 100) break;
      }
      return todos.filter((r) => r.owner?.login?.toLowerCase() === USUARIO.toLowerCase());
    } catch (e) { console.warn(`aviso: ${e.message}`); }
  }
  throw new Error('não consegui listar os repositórios');
}

/** Commits de um repositório na branch padrão e na develop (o Git Flow do Kevin trabalha na develop), sem merges. */
async function commitsDe(repo, filtro = '') {
  const ramos = [...new Set([repo.default_branch, 'develop'])];
  const vistos = new Map();
  for (const ramo of ramos) {
    const lote = await tentar(api(`/repos/${repo.full_name}/commits?sha=${encodeURIComponent(ramo)}&per_page=10${filtro}`));
    for (const c of lote ?? []) if (c.parents?.length < 2 && !vistos.has(c.sha)) vistos.set(c.sha, c);
  }
  return [...vistos.values()].sort((a, b) => dataDe(b).localeCompare(dataDe(a)));
}
const dataDe = (c) => c.commit.committer?.date ?? c.commit.author.date;
const titulo = (c) => c.commit.message.split('\n')[0].replace(/\|/g, '\\|').slice(0, 80);

// ---------- 1. Últimos commits ----------
async function blocoUltimosCommits(repos) {
  const recentes = repos
    .filter((r) => !r.fork && !r.archived && r.name.toLowerCase() !== USUARIO.toLowerCase() && r.pushed_at)
    .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, MAX_PROJETOS);
  const linhas = [];
  for (const r of recentes) {
    const [c] = await commitsDe(r);
    if (!c) continue;
    linhas.push(r.private
      ? { data: dataDe(c), md: `| 🔒 | projeto privado | — | ${diaBR(dataDe(c))} |` }
      : { data: dataDe(c), md: `| 📦 | [\`${r.name}\`](${r.html_url}) | [\`${c.sha.slice(0, 7)}\`](${c.html_url}) ${titulo(c)} | ${diaBR(dataDe(c))} |` });
  }
  linhas.sort((a, b) => b.data.localeCompare(a.data));
  return `| | Projeto | Último commit | Data |
|:-:|---|---|---|
${linhas.map((l) => l.md).join('\n')}

<sub>🤖 Atualizado em ${diaBR(agora)} (horário de Brasília) pela rotina diária (<code>scripts/rodar-diario.sh</code>) · branch padrão e <code>develop</code> · 🔒 projeto privado: só a data</sub>`;
}

// ---------- 2. Metas (só desenha metas/progresso.json) ----------
// Cada meta (Java, AWS, IA, estudadas em conjunto) é medida pela porcentagem dos cursos dela: percentual da meta = média
// dos cursos com percentual conhecido. Curso com "percentual": null aparece como "a atualizar" e fica fora da média.
// Nada sobe sozinho: quem atualiza os percentuais é a rotina diária, com o que o Kevin registra. Formato em metas/README.md.
const ICONES = { java: '☕', aws: '☁️', ia: '🤖' };
const xml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pctValido = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Math.max(0, Math.min(100, Math.round(Number(v)))));
function lerMetas() {
  const bruto = ler(path.join(RAIZ, 'metas', 'progresso.json'));
  if (!bruto) return null;
  const m = JSON.parse(bruto);
  for (const meta of m.metas ?? []) {
    meta.cursos = (meta.cursos ?? []).map((c) => ({ ...c, percentual: pctValido(c.percentual) }));
    const conhecidos = meta.cursos.filter((c) => c.percentual !== null);
    meta.pct = conhecidos.length ? Math.round(conhecidos.reduce((s, c) => s + c.percentual, 0) / conhecidos.length) : null;
    meta.icone = meta.icone ?? ICONES[meta.id] ?? '🎯';
  }
  return m;
}
const corPct = (pct) => (pct === null ? '8b949e' : pct >= 100 ? '3fb950' : pct > 0 ? 'EC7000' : '8b949e');
const esc = (t) => encodeURIComponent(String(t)).replace(/-/g, '--').replace(/_/g, '__');
const selo = (rotulo, pct, estilo = 'flat-square') =>
  `https://img.shields.io/badge/${rotulo ? `${esc(rotulo)}-` : ''}${esc(pct === null ? 'a atualizar' : `${pct}%`)}-${corPct(pct)}?style=${estilo}`;
/** Barra de progresso em SVG (assets/metas/<id>.svg), gerada sem API, no laranja do perfil. */
function svgBarra(meta) {
  const largura = 240, w = meta.pct ? Math.round((largura - 4) * meta.pct / 100) : 0;
  const cor = meta.pct >= 100 ? '#3fb950' : '#EC7000';
  const texto = meta.pct === null ? 'a atualizar' : `${meta.pct}%`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="18" viewBox="0 0 ${largura} 18" role="img" aria-label="${xml(meta.titulo)}: ${texto}">
<rect x="0.5" y="0.5" width="${largura - 1}" height="17" rx="8.5" fill="#161b22" stroke="#30363d"/>
${w > 0 ? `<rect x="2" y="2" width="${Math.max(w, 14)}" height="14" rx="7" fill="${cor}"/>` : ''}
<text x="${largura / 2}" y="13" text-anchor="middle" font-family="Segoe UI,Ubuntu,sans-serif" font-size="11" font-weight="600" fill="#ffffff">${texto}</text>
</svg>
`;
}
const barra = (pct) => (pct === null ? '░'.repeat(10) : '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10)));
const nomeCurso = (c, html) => {
  const nome = html ? xml(c.nome) : c.nome;
  const link = c.url ? (html ? `<a href="${xml(c.url)}">${nome}</a>` : `[${nome}](${c.url})`) : nome;
  return `${link}${c.plataforma ? ` · ${html ? xml(c.plataforma) : c.plataforma}` : ''}`;
};
function blocoMetas(m) {
  if (!m?.metas?.length) return '_Nenhuma meta em `metas/progresso.json` ainda._';
  const coluna = (meta) => `<td valign="top" width="${Math.floor(100 / m.metas.length)}%">

<h3 align="center">${meta.icone} ${xml(meta.titulo)}</h3>
<p align="center"><img src="${selo('', meta.pct, 'for-the-badge')}" alt="${meta.pct === null ? 'a atualizar' : `${meta.pct}%`}"/><br/><img src="assets/metas/${meta.id}.svg" width="100%" alt="Barra de progresso de ${xml(meta.titulo)}"/></p>

${meta.cursos.length
    ? meta.cursos.map((c) => `<img src="${selo('', c.percentual)}" alt="${c.percentual === null ? 'a atualizar' : `${c.percentual}%`}"/> ${nomeCurso(c, true)}${c.atualizado ? `<br/><sub>atualizado em ${diaBR(`${c.atualizado}T12:00:00Z`)}</sub>` : ''}`).join('<br/><br/>\n')
    : '<p align="center"><sub>📅 curso a definir</sub></p>'}

</td>`;
  return `<p align="center"><img src="https://img.shields.io/badge/${esc('Java + AWS + IA')}-${esc('em conjunto')}-EC7000?style=for-the-badge" alt="Java + AWS + IA em conjunto"/></p>

<table>
<tr>
${m.metas.map(coluna).join('\n')}
</tr>
</table>

<sub>🎯 Cada meta é medida pelo progresso real dos cursos dela (média dos cursos com porcentagem registrada); "a atualizar" = curso sem porcentagem registrada ainda. Nada sobe sozinho · dados de ${m.atualizado ?? '—'}</sub>`;
}
function metasMarkdown(m) {
  if (!m?.metas?.length) return '_Nenhuma meta ainda._';
  return m.metas.map((meta) => `### ${meta.icone} ${meta.titulo} · ${meta.pct === null ? 'a atualizar' : `${meta.pct}%`}

\`${barra(meta.pct)}\` ${meta.pct === null ? 'a atualizar' : `${meta.pct}%`}

${meta.cursos.length ? meta.cursos.map((c) => `- **${c.percentual === null ? 'a atualizar' : `${c.percentual}%`}** · ${nomeCurso(c, false)}${c.atualizado ? ` (atualizado em ${c.atualizado})` : ''}`).join('\n') : '- 📅 curso a definir'}`).join('\n\n') + `\n\n<sub>Dados de ${m.atualizado ?? '—'}</sub>`;
}

// ---------- 3. Diário do dia ----------
function topicoDoDia() {
  const yml = ler(path.join(RAIZ, 'revisao.yml')) ?? '';
  const topicos = yml.split('\n').map((l) => /^\s*-\s+"?(.*?)"?\s*$/.exec(l)?.[1]).filter(Boolean);
  if (!topicos.length) return null;
  const n = Math.floor(Date.parse(`${dia}T12:00:00Z`) / 86_400_000);
  return topicos[n % topicos.length];
}
async function atividade24h(repos) {
  const horas = Number(process.env.PERFIL_JANELA_HORAS) || 24; // só para testar com uma janela maior
  const desde = new Date(agora.getTime() - horas * 3600 * 1000).toISOString();
  const commits = [];
  let privados = 0;
  for (const r of repos.filter((r) => !r.fork && r.name.toLowerCase() !== USUARIO.toLowerCase() && r.pushed_at >= desde)) {
    const lote = await commitsDe(r, `&author=${USUARIO}&since=${desde}`);
    if (r.private) privados += lote.length;
    else for (const c of lote) commits.push({ repo: r, c });
  }
  const publicos = new Set(repos.filter((r) => !r.private).map((r) => r.full_name.toLowerCase()));
  const busca = await tentar(api(`/search/issues?q=${encodeURIComponent(`involves:${USUARIO} updated:>=${desde.slice(0, 19)}Z`)}&per_page=50`));
  const itens = (busca?.items ?? []).filter((i) => {
    const nome = i.repository_url.split('/repos/')[1]?.toLowerCase();
    return publicos.has(nome) && nome !== `${USUARIO}/${USUARIO}`.toLowerCase();
  });
  return { commits, itens, privados };
}
function textoAtividade({ commits, itens, privados }) {
  const partes = [];
  if (commits.length) {
    partes.push('## Commits', ...commits.sort((a, b) => dataDe(a.c).localeCompare(dataDe(b.c)))
      .map(({ repo, c }) => `- [\`${repo.name}\`](${repo.html_url}) [\`${c.sha.slice(0, 7)}\`](${c.html_url}) ${c.commit.message.split('\n')[0]}`), '');
  }
  if (itens.length) {
    partes.push('## Pull requests e issues', ...itens.map((i) => {
      const tipo = i.pull_request ? (i.pull_request.merged_at ? 'PR mergeado' : `PR ${i.state === 'open' ? 'aberto' : 'fechado'}`) : `issue ${i.state === 'open' ? 'aberta' : 'fechada'}`;
      return `- [\`${i.repository_url.split('/').pop()}#${i.number}\`](${i.html_url}) ${i.title} (${tipo})`;
    }), '');
  }
  if (privados) partes.push(`> 🔒 Mais ${privados} commit(s) em projeto privado (sem detalhes).`, '');
  return partes.join('\n');
}
async function diarioDoDia(repos) {
  const cabecalho = (fonte) => `# Diário de ${diaBR(agora)}\n\n> Fonte: ${fonte}. Gerado por \`scripts/perfil-diario.mjs\`.\n\n`;
  const inbox = ler(path.join(RAIZ, 'diario', 'inbox', `${dia}.md`));
  if (inbox?.trim()) return { fonte: 'obsidian', md: cabecalho('resumo do diário do Obsidian (diario/inbox)') + inbox.trim() + '\n' };
  const atv = await atividade24h(repos);
  const texto = textoAtividade(atv);
  if (texto.trim()) return { fonte: 'github', md: cabecalho('minha atividade no GitHub nas últimas 24h') + texto.trim() + '\n' };
  const topico = topicoDoDia();
  if (!topico) return null;
  return { fonte: 'revisao', md: cabecalho('tópico de revisão do dia (revisao.yml), num dia sem commits públicos') + `## 📚 Tópico de revisão: ${topico}\n\n- [ ] Revisar a teoria\n- [ ] Escrever um exemplo curto\n- [ ] Anotar uma dúvida no Obsidian\n` };
}

// ---------- README e progresso.md ----------
function substituir(md, nome, conteudo) {
  const re = new RegExp(`(<!-- ${nome}:START -->)[\\s\\S]*?(<!-- ${nome}:END -->)`);
  if (!re.test(md)) { console.warn(`aviso: marcador ${nome} não encontrado no README`); return md; }
  return md.replace(re, () => `<!-- ${nome}:START -->\n${conteudo.trim()}\n<!-- ${nome}:END -->`);
}

const repos = SO_METAS ? [] : await repositorios();
const porNome = new Map(repos.map((r) => [r.full_name.toLowerCase(), r]));
const publicosDaTabela = new Set(); // no modo --so-metas, sem API: só é público o que a tabela gerada na máquina já mostra
const privado = (repo) => {
  const nome = String(repo ?? '').toLowerCase();
  const cheio = nome.includes('/') ? nome : `${USUARIO.toLowerCase()}/${nome}`;
  if (SO_METAS) return !publicosDaTabela.has(cheio);
  const r = porNome.get(cheio);
  return !r || r.private; // desconhecido conta como privado: na dúvida, não expõe
};
const arquivoReadme = path.join(RAIZ, 'README.md');
let readme = ler(arquivoReadme);
const blocoAtual = (nome) => new RegExp(`<!-- ${nome}:START -->\\n?([\\s\\S]*?)\\n?<!-- ${nome}:END -->`).exec(readme)?.[1] ?? '';
let ultimos;
let diario = null;
if (SO_METAS) {
  ultimos = blocoAtual('ULTIMOS-COMMITS').trim() || '_Gerado pela rotina diária._';
  for (const m of ultimos.matchAll(/\(https:\/\/github\.com\/([^/\s)]+\/[^/\s)]+)\)/g)) publicosDaTabela.add(m[1].toLowerCase());
  const visto = /\[diario\/(\d{4}-\d{2}-\d{2})\.md\][^\n]*fonte: (\w+)/.exec(ler(path.join(RAIZ, 'progresso.md')) ?? '');
  if (visto) diario = { dia: visto[1], fonte: visto[2] };
} else {
  ultimos = await blocoUltimosCommits(repos);
  diario = await diarioDoDia(repos);
  if (diario) { diario.dia = dia; escrever(`diario/${dia}.md`, diario.md); }
}
const metas = lerMetas();
for (const meta of metas?.metas ?? []) escrever(`assets/metas/${meta.id}.svg`, svgBarra(meta));
const metasMd = blocoMetas(metas);
if (!SO_METAS) readme = substituir(readme, 'ULTIMOS-COMMITS', ultimos);
readme = substituir(readme, 'METAS', metasMd);
escrever('README.md', readme);

escrever('progresso.md', `---
atualizado: ${diario?.dia ?? dia}
fonte: https://github.com/${USUARIO}/${USUARIO}
---
# Progresso do Kevin

> Gerado por \`scripts/perfil-diario.mjs\` (workflow \`perfil-diario\`). Não edite aqui: as metas vêm de \`metas/progresso.json\`.

## ⏱️ Últimos commits por projeto

${ultimos}

## 🎯 Metas (Java + AWS + IA, em conjunto)

${metasMarkdown(metas)}

## 📓 Diário de hoje

${diario ? `[diario/${diario.dia}.md](https://github.com/${USUARIO}/${USUARIO}/blob/main/diario/${diario.dia}.md) · fonte: ${diario.fonte}` : '—'}
`);

console.log(mudancas.length ? `${SECO ? 'mudaria' : 'atualizado'}: ${mudancas.join(', ')}` : 'nada mudou');
if (process.env.GITHUB_OUTPUT && diario) fs.appendFileSync(process.env.GITHUB_OUTPUT, `fonte=${diario.fonte}\ndia=${diario.dia}\n`);
