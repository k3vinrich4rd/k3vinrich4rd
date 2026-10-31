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

<sub>🤖 Atualizado em ${diaBR(agora)} (horário de Brasília) pelo workflow <code>perfil-diario</code> · branch padrão e <code>develop</code> · 🔒 projeto privado: só a data</sub>`;
}

// ---------- 2. Metas (só desenha metas/progresso.json) ----------
function lerMetas() {
  const bruto = ler(path.join(RAIZ, 'metas', 'progresso.json'));
  if (!bruto) return null;
  const m = JSON.parse(bruto);
  for (const meta of m.metas ?? []) {
    meta.alvo = Number(meta.alvo) || 0;
    meta.feitos = Number(meta.feitos) || 0;
    meta.pct = meta.alvo ? Math.min(100, Math.round((meta.feitos / meta.alvo) * 100)) : 0;
  }
  return m;
}
const barra = (pct) => '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
function ultimoDaMeta(meta, privado) {
  const c = [...(meta.commits ?? [])].sort((a, b) => String(b.data).localeCompare(String(a.data)))[0];
  if (!c) return '—';
  const quando = c.data ? diaBR(c.data) : '';
  if (privado(c.repo)) return `🔒 projeto privado · ${quando}`;
  const nome = String(c.repo).split('/').pop();
  const url = `https://github.com/${String(c.repo).includes('/') ? c.repo : `${USUARIO}/${c.repo}`}`;
  return `[\`${nome}\`](${url}) [\`${String(c.sha).slice(0, 7)}\`](${url}/commit/${c.sha}) ${String(c.motivo ?? '').replace(/\|/g, '\\|').slice(0, 70)} · ${quando}`;
}
function blocoMetas(m, privado) {
  if (!m?.metas?.length) return '_Nenhuma meta em `metas/progresso.json` ainda._';
  const linhas = m.metas.map((meta) => {
    const cor = meta.pct >= 100 ? '3fb950' : 'EC7000';
    const selo = `<img src="https://img.shields.io/badge/${meta.pct}%25-${meta.feitos}%2F${meta.alvo}-${cor}?style=flat-square" alt="${meta.pct}%"/>`;
    const status = meta.confirmada === false ? ' <sub>⏳ a confirmar</sub>' : '';
    return `| **${meta.titulo}**${status} | \`${barra(meta.pct)}\` ${selo} | ${ultimoDaMeta(meta, privado)} |`;
  });
  return `| Meta | Progresso | Último commit que contou |
|---|---|---|
${linhas.join('\n')}

<sub>🎯 Só contam commits meus que a minha rotina de revisão classificou pelo conteúdo (mensagem, arquivos, diff e dependências). Nada sobe sozinho com o tempo · dados de ${m.atualizado ?? '—'}</sub>`;
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
const metasMd = blocoMetas(lerMetas(), privado);
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

## 🎯 Metas

${metasMd}

## 📓 Diário de hoje

${diario ? `[diario/${diario.dia}.md](https://github.com/${USUARIO}/${USUARIO}/blob/main/diario/${diario.dia}.md) · fonte: ${diario.fonte}` : '—'}
`);

console.log(mudancas.length ? `${SECO ? 'mudaria' : 'atualizado'}: ${mudancas.join(', ')}` : 'nada mudou');
if (process.env.GITHUB_OUTPUT && diario) fs.appendFileSync(process.env.GITHUB_OUTPUT, `fonte=${diario.fonte}\ndia=${diario.dia}\n`);
