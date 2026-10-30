// Lê o vault do Obsidian e o repositório do RKF Bank e grava progresso.json.
// Roda só na máquina do Kevin (o GitHub Actions não enxerga o vault); o README é gerado a partir desse arquivo.
// Uso: node scripts/coletar-progresso.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RAIZ, lerConfig, ler, escrever, frontmatter, secoes, tarefas, limparObsidian, hoje } from './lib.mjs';

const cfg = lerConfig();
const vault = (...p) => path.join(cfg.vault, ...p);
const anterior = JSON.parse(ler(path.join(RAIZ, 'progresso.json')) ?? '{}');

function regua() {
  const md = ler(vault('01 Carreira', 'Régua Junior para Pleno.md'));
  if (!md) return anterior.regua;
  const fm = frontmatter(md);
  const itens = [];
  for (const s of secoes(md)) {
    const status = s.titulo.includes('Praticad') ? 'praticada' : s.titulo.includes('andamento') ? 'andamento' : s.titulo.includes('Planejad') ? 'planejada' : null;
    if (!status) continue;
    for (const t of tarefas(s.corpo)) {
      const [nome, evidencia = ''] = limparObsidian(t.texto).split(' — ');
      itens.push({
        nome: nome.replace(/⏫|\*\*próximo\*\*/g, '').trim(),
        status,
        evidencia: evidencia.replace(/^\*|\*$/g, '').trim(),
        proximo: t.texto.includes('⏫'),
      });
    }
  }
  const conta = (st) => itens.filter((i) => i.status === st).length;
  return {
    praticadas: Number(fm.praticadas ?? conta('praticada')),
    total: Number(fm.total ?? itens.length),
    andamento: conta('andamento'),
    planejadas: conta('planejada'),
    itens,
  };
}

function checklist() {
  const md = ler(vault('02 Projetos', 'RKF Bank', 'Checklist RKF Bank.md'));
  if (!md) return anterior.rkf?.checklist;
  const s2 = secoes(md);
  const achar = (trecho) => s2.find((s) => s.titulo.includes(trecho))?.corpo ?? '';
  const grupos = (corpo) =>
    secoes(corpo, 3).map((g) => {
      const itens = tarefas(g.corpo).map((t) => ({ ...t, texto: limparObsidian(t.texto) }));
      return {
        nome: limparObsidian(g.titulo).replace(/^\d+\.\s*/, '').replace(/[⏫🔮]|futuro/g, '').trim(),
        futuro: g.titulo.includes('🔮'),
        proximo: g.titulo.includes('⏫'),
        feitos: itens.filter((i) => i.feito).length,
        total: itens.length,
        itens,
      };
    });
  const resumo = (lista) => ({ feitos: lista.filter((i) => i.feito).length, total: lista.length });
  const mvp = grupos(achar('MVP'));
  const pleno = grupos(achar('Rumo ao Pleno'));
  return {
    gantt: /```mermaid\ngantt\n[\s\S]*?```/.exec(md)?.[0] ?? anterior.rkf?.checklist?.gantt,
    agora: tarefas(achar('Agora')).map((t) => ({ ...t, texto: limparObsidian(t.texto) })),
    mvp: { ...resumo(mvp.flatMap((g) => g.itens)), grupos: mvp },
    pleno: { ...resumo(pleno.flatMap((g) => g.itens)), grupos: pleno },
    debitos: resumo(tarefas(achar('Débitos'))),
    // A lista do Obsidian nao fica em ordem (entregas novas entram no topo ou no fim): ordena pela data do fim
    // de cada item ('— 2026-10-29'), a mais nova primeiro; item sem data vai para o fim.
    recentes: tarefas(achar('Concluído recentemente')).map((t) => limparObsidian(t.texto))
      .map((texto, i) => ({ texto, i, data: /(\d{4}-\d{2}-\d{2})\s*$/.exec(texto)?.[1] ?? '' }))
      .sort((x, y) => y.data.localeCompare(x.data) || x.i - y.i)
      .map((r) => r.texto).slice(0, 6),
  };
}

function historico() {
  const md = ler(vault('02 Projetos', 'RKF Bank', 'Histórico RKF Bank.md'));
  if (!md) return anterior.historico ?? [];
  return md.split('\n')
    .filter((l) => /^\|\s*(\d{4}-\d{2}-\d{2}|—)\s*\|/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => limparObsidian(c.trim())))
    .map(([data, branch, mudou, aprendizado]) => ({ data, branch, mudou, aprendizado }))
    .filter((h) => h.aprendizado)
    .slice(0, 5);
}

function estudos() {
  const raiz = vault('03 Estudos');
  if (!fs.existsSync(raiz)) return anterior.estudos ?? [];
  const lista = [];
  for (const area of fs.readdirSync(raiz, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    for (const arq of fs.readdirSync(path.join(raiz, area.name)).filter((f) => f.endsWith('.md')).sort()) {
      const md = ler(path.join(raiz, area.name, arq));
      const fm = frontmatter(md);
      if (fm.tipo !== 'estudo') continue;
      const passos = tarefas(md); // todas as tarefas da nota, em qualquer seção
      lista.push({
        nome: arq.replace(/\.md$/, ''),
        area: fm.area ?? area.name,
        status: fm.status ?? 'andamento',
        passos: { feitos: passos.filter((p) => p.feito).length, total: passos.length },
      });
    }
  }
  return lista;
}

/** Conta os testes que estão na develop publicada: a pasta local pode estar numa branch ainda não entregue. */
function testesNaDevelop(repo) {
  // 1º: o badge do README da develop, que o gerar-svgs-readme.mjs do RKF Bank escreve com o "Tests run" do Maven
  // (um teste parametrizado conta cada execução). Assim o perfil mostra exatamente o número que o Maven mostra.
  try {
    const readme = execFileSync('git', ['-C', repo, 'show', 'origin/develop:README.md'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const badge = /badge\/testes-(\d+)_/.exec(readme);
    if (badge) return Number(badge[1]);
  } catch {
    // sem origin/develop: segue para a contagem pelas anotações
  }
  try {
    const saida = execFileSync('git', ['-C', repo, 'grep', '-c', '-E', '@(Test|ParameterizedTest|RepeatedTest)\\b',
      'origin/develop', '--', 'backend/src/test'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return saida.split('\n').filter(Boolean).reduce((soma, linha) => soma + Number(linha.split(':').pop()), 0);
  } catch {
    return 0; // sem git, sem origin/develop ou sem testes: cai na contagem pela pasta
  }
}

function rkf() {
  const repo = cfg.rkfbank;
  if (!repo || !fs.existsSync(repo)) return anterior.rkf ?? {};
  const daDevelop = testesNaDevelop(repo);
  if (daDevelop) return { testes: daDevelop };
  let testes = 0;
  const pasta = path.join(repo, 'backend', 'src', 'test');
  const varrer = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) varrer(f);
      else if (/\.(java|kt)$/.test(e.name)) testes += (fs.readFileSync(f, 'utf8').match(/@(Test|ParameterizedTest|RepeatedTest)\b/g) ?? []).length;
    }
  };
  if (fs.existsSync(pasta)) varrer(pasta);
  return { testes: testes || anterior.rkf?.testes || 0 };
}

/** Tamanho do segundo cérebro: notas de estudo, quantas têm o "com × sem" e as sessões guiadas. */
function biblioteca() {
  const raiz = vault('03 Estudos');
  if (!fs.existsSync(raiz)) return anterior.biblioteca;
  const notas = [];
  const varrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) varrer(f);
      else if (e.name.endsWith('.md')) notas.push({ nome: e.name.replace(/\.md$/, ''), md: ler(f) });
    }
  };
  varrer(raiz);
  return {
    notas: notas.length,
    comSem: notas.filter((n) => /^## 🆚 Com × sem/m.test(n.md)).length,
    sessoes: notas.filter((n) => n.nome.startsWith('Sessão de estudo - ')).map((n) => n.nome.replace('Sessão de estudo - ', '')).sort(),
  };
}

/** As trilhas do Obsidian (00 Consulta/🧭 Trilha *.md): módulos (## ① ...) e o status de cada nota nas tabelas. */
function cerebro() {
  const pasta = vault('03 Estudos', '00 Consulta');
  if (!fs.existsSync(pasta)) return anterior.cerebro;
  const status = { '✅': 'praticado', '🔄': 'andamento', '📅': 'planejado', '📘': 'referencia' };
  const trilhas = fs.readdirSync(pasta).filter((f) => f.startsWith('🧭 Trilha')).sort().map((arq) => {
    const md = ler(path.join(pasta, arq));
    const modulos = secoes(md).filter((s) => /^[①-⑨]/.test(s.titulo)).map((s) => {
      const notas = [];
      for (const linha of s.linhas.filter((l) => l.startsWith('| [['))) {
        const [links, st] = linha.split('|').slice(1, 3);
        if (st.includes('🗺️')) continue; // mapas de navegação não são assunto de estudo
        const nomes = [...links.matchAll(/\[\[([^\]|]+)/g)].map((m) => m[1]);
        const marcas = [...st.matchAll(/✅|🔄|📅|📘/g)].map((m) => status[m[0]]);
        // "[[A]] · [[B]] | 📘 · 🔄": um status por nota; um status só vale para todas
        nomes.forEach((nome, i) => notas.push({ nome, status: marcas[Math.min(i, marcas.length - 1)] ?? 'referencia' }));
      }
      return { nome: limparObsidian(s.titulo.replace(/→.*$/, '')).replace(/^([①-⑨])\s*/, '$1 '), notas };
    });
    return { nome: arq.replace(/^🧭 /, '').replace(/\.md$/, ''), modulos };
  });
  // "Na ativa": dias com nota no diário nos últimos 30 dias e as notas de estudo criadas por último.
  const limite = new Date(Date.now() - 30 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  // O diário fica em subpastas por mês (05 Diário/AAAA-MM/AAAA-MM-DD.md); notas antigas na raiz também contam.
  const diario = fs.existsSync(vault('05 Diário'))
    ? fs.readdirSync(vault('05 Diário'), { recursive: true }).map((f) => path.basename(f)).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    : [];
  const recentes = [];
  const raiz = vault('03 Estudos');
  for (const area of fs.readdirSync(raiz, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('00'))) {
    for (const arq of fs.readdirSync(path.join(raiz, area.name)).filter((f) => f.endsWith('.md'))) {
      const fm = frontmatter(ler(path.join(raiz, area.name, arq)));
      if (fm.criado && fm.tipo !== 'hub') recentes.push({ nome: arq.replace(/\.md$/, ''), area: area.name, criado: fm.criado });
    }
  }
  recentes.sort((a, b) => b.criado.localeCompare(a.criado) || a.nome.localeCompare(b.nome));
  return { trilhas, diasDiario30: diario.filter((f) => f.slice(0, 10) >= limite).length, recentes: recentes.slice(0, 8) };
}

const reguaAtual = regua();
const lista = checklist();
const proximo = reguaAtual?.itens.find((i) => i.proximo) ?? reguaAtual?.itens.find((i) => i.status === 'andamento');
const progresso = {
  atualizado: anterior.atualizado,
  regua: reguaAtual,
  foco: proximo?.nome ?? anterior.foco,
  trilha: (reguaAtual?.itens ?? []).filter((i) => i.status !== 'praticada').map((i) => i.nome),
  rkf: { ...rkf(), checklist: lista },
  historico: historico(),
  estudos: estudos(),
  biblioteca: biblioteca(),
  cerebro: cerebro(),
};

// A data só muda quando algum dado mudou, para não gerar commit vazio todo dia.
const json = (o) => JSON.stringify(o, null, 2) + '\n';
if (json({ ...progresso, atualizado: undefined }) !== json({ ...anterior, atualizado: undefined })) progresso.atualizado = hoje();
const mudou = escrever(path.join(RAIZ, 'progresso.json'), json(progresso));
console.log(mudou ? `progresso.json atualizado (${progresso.regua?.praticadas}/${progresso.regua?.total}, ${progresso.rkf.testes} testes)` : 'progresso.json sem mudanças');
