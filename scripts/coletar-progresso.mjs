// Lê o vault do Obsidian e o repositório do RKF Bank e grava progresso.json.
// Roda só na máquina do Kevin (o GitHub Actions não enxerga o vault); o README é gerado a partir desse arquivo.
// Uso: node scripts/coletar-progresso.mjs
import fs from 'node:fs';
import path from 'node:path';
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
    recentes: tarefas(achar('Concluído recentemente')).map((t) => limparObsidian(t.texto)).slice(-6).reverse(),
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

function rkf() {
  const repo = cfg.rkfbank;
  if (!repo || !fs.existsSync(repo)) return anterior.rkf ?? {};
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
};

// A data só muda quando algum dado mudou, para não gerar commit vazio todo dia.
const json = (o) => JSON.stringify(o, null, 2) + '\n';
if (json({ ...progresso, atualizado: undefined }) !== json({ ...anterior, atualizado: undefined })) progresso.atualizado = hoje();
const mudou = escrever(path.join(RAIZ, 'progresso.json'), json(progresso));
console.log(mudou ? `progresso.json atualizado (${progresso.regua?.praticadas}/${progresso.regua?.total}, ${progresso.rkf.testes} testes)` : 'progresso.json sem mudanças');
