// Chamado pelo hook post-commit de qualquer repositório do Kevin.
// 1. Anota o commit no diário do dia e na nota do projeto no Obsidian.
// 2. Recalcula o progresso (régua, checklist, testes) e regenera o README do perfil.
// 3. Faz commit no repositório do perfil (e push, se "autoPush" estiver ligado no config.json).
// Uso: node automacao/registrar-commit.mjs <pasta-do-repositorio>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { RAIZ, lerConfig, ler, escrever, frontmatter, hoje } from '../scripts/lib.mjs';

const cfg = lerConfig();
const repo = path.resolve(process.argv[2] ?? process.cwd());
const git = (args, cwd = repo, env = {}) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const log = (msg) => fs.appendFileSync(path.join(RAIZ, 'automacao', 'sync.log'), `${new Date().toISOString()} ${msg}\n`);

const normalizar = (url) => (url ?? '').toLowerCase().replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/').replace(/\/$/, '');

function dadosDoCommit() {
  const [hash, assunto, data] = git(['log', '-1', '--format=%H%x1f%s%x1f%cs']).split('\x1f');
  let remoto = '';
  try { remoto = normalizar(git(['remote', 'get-url', 'origin'])); } catch { /* repositório sem remoto */ }
  return {
    hash, curto: hash.slice(0, 7), assunto, data,
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    nome: remoto ? remoto.split('/').pop() : path.basename(repo),
    remoto,
  };
}

/** Repositório privado (lista "privados" do config.json) entra no Obsidian, mas o perfil público nem cita o nome. */
function ehPrivado(c) {
  return (cfg.privados ?? []).some((n) => n.toLowerCase() === c.nome.toLowerCase());
}

/** Procura no vault a nota cujo frontmatter "repo:" aponta para este repositório. */
function notaDoProjeto(remoto) {
  if (!remoto) return null;
  const pastas = [path.join(cfg.vault, '02 Projetos')];
  while (pastas.length) {
    const d = pastas.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) pastas.push(f);
      else if (e.name.endsWith('.md') && normalizar(frontmatter(ler(f)).repo) === remoto) return f;
    }
  }
  return null;
}

function anotarNoDiario(c, nota) {
  // Diário por mês (05 Diário/AAAA-MM/), igual ao formato do plugin Daily notes; respeita uma nota de hoje já na raiz.
  const naRaiz = path.join(cfg.vault, '05 Diário', `${hoje()}.md`);
  const arquivo = fs.existsSync(naRaiz) ? naRaiz : path.join(cfg.vault, '05 Diário', hoje().slice(0, 7), `${hoje()}.md`);
  let md = ler(arquivo) ?? (ler(path.join(cfg.vault, 'Templates', 'Diário.md')) ?? '# 🗓️ {{date}}\n\n## ✅ Feito\n').replaceAll('{{date}}', hoje());
  if (md.includes(c.curto)) return;
  const link = nota ? `[[${path.basename(nota, '.md')}]]` : `\`${c.nome}\``;
  const url = c.remoto ? ` ([\`${c.curto}\`](${c.remoto}/commit/${c.hash}))` : ` \`${c.curto}\``;
  const linha = `- [x] 🤖 ${link} · \`${c.branch}\` · ${c.assunto}${url}`;
  const linhas = md.split('\n');
  let i = linhas.findIndex((l) => /^## .*Feito/.test(l));
  if (i < 0) { linhas.push('', '## ✅ Feito'); i = linhas.length - 1; }
  let fim = i + 1;
  while (fim < linhas.length && !/^#{1,2} /.test(linhas[fim])) fim++;
  // Remove o "- " vazio do template e insere depois do último item da seção.
  for (let j = fim - 1; j > i; j--) if (/^- \s*$/.test(linhas[j])) { linhas.splice(j, 1); fim--; }
  let pos = fim;
  while (pos > i + 1 && linhas[pos - 1].trim() === '') pos--;
  linhas.splice(pos, 0, linha);
  escrever(arquivo, linhas.join('\n'));
}

function anotarNoProjeto(c, nota) {
  if (!nota) return;
  const INICIO = '%% auto:commits:inicio %%';
  const FIM = '%% auto:commits:fim %%';
  let md = ler(nota);
  if (!md.includes(INICIO)) md = `${md.trimEnd()}\n\n## 🤖 Últimos commits (automático)\n${INICIO}\n${FIM}\n`;
  const [antes, resto] = md.split(INICIO);
  const [bloco, depois] = resto.split(FIM);
  const itens = bloco.split('\n').filter((l) => l.startsWith('- ') && !l.includes(c.curto));
  itens.unshift(`- ${c.data} · \`${c.branch}\` · ${c.assunto} · \`${c.curto}\``);
  escrever(nota, `${antes}${INICIO}\n${itens.slice(0, 12).join('\n')}\n${FIM}${depois}`);
}

/** Roda `fn` com uma trava em disco: commits seguidos (rebase, merge) não disputam o git do perfil. */
function comTrava(fn) {
  const trava = path.join(RAIZ, 'automacao', '.sync.lock');
  const espera = new Int32Array(new SharedArrayBuffer(4));
  for (let tentativa = 0; ; tentativa++) {
    try { fs.mkdirSync(trava); break; } catch {
      const idade = Date.now() - (fs.statSync(trava, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
      if (idade > 120_000) { fs.rmSync(trava, { recursive: true, force: true }); continue; } // trava esquecida
      if (tentativa > 240) throw new Error('trava do perfil ocupada há mais de 1 minuto');
      Atomics.wait(espera, 0, 0, 250);
    }
  }
  try { return fn(); } finally { fs.rmSync(trava, { recursive: true, force: true }); }
}

/** Rebase que ficou pela metade (conflito num SVG gerado) travava todas as sincronizações seguintes. */
function destravarRebase(env) {
  const gitDir = path.join(RAIZ, '.git');
  if (!['rebase-merge', 'rebase-apply'].some((d) => fs.existsSync(path.join(gitDir, d)))) return;
  git(['rebase', '--abort'], RAIZ, env);
  log('perfil: rebase pela metade abortado (o progresso é regenerado em seguida)');
}

/** README e SVGs são gerados aqui e no GitHub Actions: em conflito, vale a versão gerada agora (a mais nova). */
function sincronizarComRemoto(env) {
  try {
    git(['pull', '--rebase', '--autostash', '-X', 'theirs', '-q'], RAIZ, env);
  } catch (e) {
    destravarRebase(env);
    throw new Error(`pull do perfil falhou (${e.message.split('\n')[0]})`);
  }
}

function atualizarPerfil(c) {
  if (fs.existsSync(path.join(RAIZ, '.git'))) destravarRebase({ KEVIN_SYNC: '1' });
  // Mudanças feitas à mão no perfil (ainda sem commit) não podem ir junto num commit automático.
  if (fs.existsSync(path.join(RAIZ, '.git')) && git(['status', '--porcelain'], RAIZ)) {
    return log('perfil com mudanças manuais pendentes: nada regenerado, sem commit (o próximo commit sincroniza)');
  }
  // Progresso só entra na main: numa branch de trabalho ele se misturaria com a mudança em andamento.
  if (fs.existsSync(path.join(RAIZ, '.git')) && git(['rev-parse', '--abbrev-ref', 'HEAD'], RAIZ) !== 'main') {
    return log('perfil fora da main: nada regenerado, sem commit (o próximo commit na main sincroniza)');
  }
  const env = { KEVIN_SYNC: '1' };
  const temGit = fs.existsSync(path.join(RAIZ, '.git'));
  // Pega antes o que o Actions publicou: gerar em cima da versão nova evita o conflito nos SVGs.
  if (temGit && cfg.autoPush) sincronizarComRemoto(env);
  execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'coletar-progresso.mjs')], { cwd: RAIZ, stdio: 'ignore' });
  execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'atualizar-readme.mjs')], { cwd: RAIZ, stdio: 'ignore' });
  if (!temGit) return log('perfil sem git: README regenerado, sem commit');
  git(['add', 'README.md', 'progresso.json', 'assets'], RAIZ);
  if (!git(['diff', '--cached', '--name-only'], RAIZ)) return;
  const origem = ehPrivado(c) ? '' : ` (${c.nome} ${c.curto})`;
  git(['commit', '-m', `docs(perfil): atualiza progresso${origem}`], RAIZ, env);
  log(`perfil: commit criado a partir de ${c.nome} ${c.curto}`);
  if (cfg.autoPush) {
    try {
      git(['push', '-q'], RAIZ, env);
    } catch {
      sincronizarComRemoto(env); // o Actions publicou no meio do caminho: junta e tenta de novo
      git(['push', '-q'], RAIZ, env);
    }
    log('perfil: push feito');
  }
}

try {
  if (process.env.KEVIN_SYNC) process.exit(0);
  // Commits e pulls no próprio perfil não mudam o progresso: sincronizar aqui só geraria commits vazios de sentido.
  if (path.resolve(repo) === path.resolve(RAIZ)) process.exit(0);
  const c = dadosDoCommit();
  const nota = notaDoProjeto(c.remoto);
  if (path.resolve(repo) !== path.resolve(RAIZ)) {
    anotarNoDiario(c, nota);
    anotarNoProjeto(c, nota);
  }
  log(`${c.nome} ${c.curto} anotado${nota ? ` em ${path.basename(nota)}` : ''}`);
  // Primeiro commit do dia também puxa as newsletters para o Radar do Obsidian (no máximo uma vez por dia).
  spawn(process.execPath, [path.join(RAIZ, 'automacao', 'radar.mjs'), '--se-nao-rodou-hoje'], { detached: true, stdio: 'ignore' }).unref();
  comTrava(() => atualizarPerfil(c));
} catch (e) {
  log(`erro: ${e.message}`);
}
