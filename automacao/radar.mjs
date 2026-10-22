// Radar de notícias: busca as edições novas das newsletters do The Drops (TechDrops, AI Drop...) e grava no Obsidian.
// Cada dia vira uma nota "06 Radar/Notícias/Radar AAAA-MM-DD.md" com título, resumo, manchetes, link e as
// notas de estudo do vault que o assunto toca. O Kevin marca ⭐ no que importa e o /radar do Claude cura
// o que foi marcado para "06 Radar/Conhecimento de mercado.md" (a memória que qualquer IA pode ler).
// Só guarda título, resumo curto e link: o texto completo continua no site de quem escreveu.
// Uso: node automacao/radar.mjs            (busca o que saiu nos últimos dias)
//      node automacao/radar.mjs --se-nao-rodou-hoje   (usado pelo hook de commit: no máximo uma vez por dia)
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, lerConfig, ler, escrever, hoje } from '../scripts/lib.mjs';

const cfg = lerConfig();
const radar = {
  dias: 3,
  fontes: [
    { nome: 'TechDrops', site: 'https://www.techdrops.com.br' },
    { nome: 'AI Drop', site: 'https://www.aidrop.news' },
  ],
  ...cfg.radar,
};
const PASTA = path.join(cfg.vault, '06 Radar');
const NOTICIAS = path.join(PASTA, 'Notícias');
const ESTADO = path.join(RAIZ, 'automacao', '.radar-estado.json');
const log = (msg) => fs.appendFileSync(path.join(RAIZ, 'automacao', 'sync.log'), `${new Date().toISOString()} radar: ${msg}\n`);

/** Palavra-chave no título/resumo → nota de estudo do vault que o assunto toca (só entra se a nota existir). */
const CONEXOES = [
  [/\b(IA|AI|intelig[eê]ncia artificial|LLM|GPT|ChatGPT|OpenAI|Anthropic|Claude|Gemini|Llama|modelo de linguagem)\b/i, 'LLM'],
  [/\bagent(e|es|ic|s)\b|agêntic/i, 'Agentes de IA'],
  [/\bMCP\b|Model Context Protocol/i, 'MCP'],
  [/\bRAG\b|busca vetorial|embedding/i, 'RAG'],
  [/\b(AWS|Amazon Web Services|Azure|Google Cloud|nuvem|cloud|data ?center)\b/i, 'AWS'],
  [/\b(Java|JVM|Oracle|Spring)\b/i, 'Java - mapa do universo'],
  [/\b(Kubernetes|Docker|container)\b/i, 'Docker e Compose'],
  [/\b(ataque|hacker|vazamento|ransomware|vulnerabilidade|CVE|ciberseguran[cç]a|golpe)\b/i, 'Dependências e CVEs'],
  [/\b(LGPD|ANPD|privacidade|dados pessoais|GDPR)\b/i, 'LGPD'],
  [/\b(Pix|fintech|banco digital|Nubank|Ita[uú]|Bradesco|Banco Central|Open Finance|Drex|cart[aã]o|cr[eé]dito)\b/i, 'RKF Bank'],
  [/\b(mensageria|Kafka|RabbitMQ|fila|evento)\b/i, 'Mensageria e Outbox'],
  [/\b(GitHub|Copilot|desenvolvedor|programador|devs?)\b/i, 'Agentes e IA aplicada'],
];

const notasDoVault = (() => {
  const nomes = new Set();
  const pastas = [cfg.vault];
  while (pastas.length) {
    const d = pastas.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      if (e.isDirectory()) pastas.push(path.join(d, e.name));
      else if (e.name.endsWith('.md')) nomes.add(e.name.slice(0, -3));
    }
  }
  return nomes;
})();

const entidades = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const texto = (html) => html
  .replace(/<[^>]+>/g, '')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&(\w+);/g, (m, n) => entidades[n] ?? m)
  .replace(/\s+/g, ' ')
  .trim();
const meta = (html, nome) => {
  const m = new RegExp(`<meta (?:property|name)="${nome}" content="([^"]*)"`).exec(html);
  return m ? texto(m[1]) : '';
};

async function baixar(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (radar pessoal do Obsidian; 1 acesso por dia)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`${url} respondeu ${res.status}`);
  return { html: await res.text(), urlFinal: res.url };
}

const MESES = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

/**
 * Lista as edições mais recentes pelos cards da página /archive (o beehiiv publica ali, do mais novo para o mais antigo).
 * O card já traz título, subtítulo e, quase sempre, a data: é o que sobra quando a edição é só para assinantes.
 */
async function edicoesRecentes(fonte) {
  const { html } = await baixar(`${fonte.site}/archive`);
  const cards = new Map();
  for (const m of html.matchAll(/<a href="\/p\/([a-z0-9-]+)"[^>]*aria-label="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const titulo = texto(m[2]);
    const dentro = texto(m[3]);
    const d = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})/.exec(dentro);
    const subtitulo = dentro.replace(titulo, '').replace(d?.[0] ?? '', '').replace(/\b(por )?DROPS\b/g, '').trim();
    const anterior = cards.get(m[1]) ?? {};
    cards.set(m[1], {
      url: `${fonte.site}/p/${m[1]}`,
      titulo,
      subtitulo: anterior.subtitulo || subtitulo,
      data: anterior.data ?? (d ? `${d[3]}-${MESES[d[1]]}-${d[2].padStart(2, '0')}` : undefined),
    });
  }
  return [...cards.values()].slice(0, 8);
}

/** Título, resumo, data e manchetes de uma edição (as manchetes são os subtítulos "Empresa: o assunto"). */
async function lerEdicao(card, fonte) {
  const { html, urlFinal } = await baixar(card.url);
  // Edição fechada: o beehiiv redireciona para a home (outro domínio ou título "Home | ...").
  const fechada = new URL(urlFinal).host !== new URL(card.url).host || /^Home\b/.test(meta(html, 'og:title'));
  // Sem data no card (destaques do carrossel), vale o dia em que o radar viu a edição.
  const base = { url: card.url, fonte: fonte.nome, titulo: card.titulo, data: card.data ?? hoje(), vistaEm: !card.data };
  if (fechada) return { ...base, resumo: card.subtitulo.replace(/^\+\s*/, ''), manchetes: [], fechada };
  const corpo = html.split(/O que achou da edição/i)[0];
  const manchetes = [...corpo.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/g)]
    .map((m) => texto(m[2]))
    .filter((t) => t.length >= 8 && t.length <= 140 && t !== t.toUpperCase() && !/^💧|^🤖|^Acompanhe|^Conheça|^\+?\d/.test(t));
  return {
    ...base,
    titulo: meta(html, 'og:title') || card.titulo,
    resumo: meta(html, 'og:description') || card.subtitulo,
    data: (meta(html, 'article:published_time') || base.data).slice(0, 10),
    manchetes: [...new Set(manchetes)].slice(0, 8),
  };
}

function conexoes(e) {
  const alvo = `${e.titulo} ${e.resumo} ${e.manchetes.join(' ')}`;
  return [...new Set(CONEXOES.filter(([re]) => re.test(alvo)).map(([, nota]) => nota))].filter((n) => notasDoVault.has(n));
}

const dataBr = (iso) => iso.split('-').reverse().join('/');

function blocoDaEdicao(e) {
  const links = conexoes(e);
  return [
    `### ${e.titulo}`,
    `**${e.fonte}** · ${e.vistaEm ? `vista em ${dataBr(e.data)}` : dataBr(e.data)} · [ler a edição](${e.url})${e.fechada ? ' · 🔒 só para assinantes: o conteúdo chega por e-mail' : ''}`,
    '',
    e.resumo ? `> ${e.resumo}` : null,
    e.resumo ? '' : null,
    ...e.manchetes.map((m) => `- ${m}`),
    links.length ? `- 🧠 Conecta com: ${links.map((n) => `[[${n}]]`).join(' · ')}` : null,
    `- [ ] ⭐ importante (marque e escreva embaixo o porquê: o \`/radar\` leva para o [[Conhecimento de mercado]])`,
    `%% url: ${e.url} %%`,
    '',
  ].filter((l) => l !== null).join('\n');
}

function notaDoDia(dia) {
  return path.join(NOTICIAS, `Radar ${dia}.md`);
}

function novaNota(dia) {
  return [
    '---',
    'tipo: radar',
    `data: ${dia}`,
    'curado: false',
    'tags: [radar, noticias]',
    '---',
    `# 📡 Radar ${dataBr(dia)}`,
    '',
    '← [[📡 Radar]] · gerado por `automacao/radar.mjs` · marque ⭐ no que importa e rode `/radar` no Claude Code',
    '',
    '## 📰 Edições',
    '',
    '## ✍️ Minhas anotações',
    '- ',
    '',
  ].join('\n');
}

/** Acrescenta a edição na nota do dia dela, antes de "Minhas anotações" (o que o Kevin escreveu nunca é tocado). */
function gravar(e) {
  const arquivo = notaDoDia(e.data);
  const md = ler(arquivo) ?? novaNota(e.data);
  if (md.includes(`%% url: ${e.url} %%`)) return false;
  const marca = '## ✍️ Minhas anotações';
  const i = md.indexOf(marca);
  const novo = i < 0 ? `${md.trimEnd()}\n\n${blocoDaEdicao(e)}` : `${md.slice(0, i)}${blocoDaEdicao(e)}\n${md.slice(i)}`;
  return escrever(arquivo, novo);
}

async function main() {
  const estado = JSON.parse(ler(ESTADO) ?? '{}');
  if (process.argv.includes('--se-nao-rodou-hoje') && estado.ultimaExecucao === hoje()) return;
  const limite = new Date(Date.now() - radar.dias * 86_400_000).toISOString().slice(0, 10);
  const vistas = new Set(estado.vistas ?? []);
  let novas = 0;
  for (const fonte of radar.fontes) {
    try {
      for (const card of await edicoesRecentes(fonte)) {
        if (vistas.has(card.url)) continue;
        if (card.data && card.data < limite) continue;
        const e = await lerEdicao(card, fonte);
        vistas.add(card.url);
        if (e.data < limite) continue;
        if (gravar(e)) novas++;
      }
    } catch (err) {
      log(`${fonte.nome} falhou (${err.message})`);
    }
  }
  escrever(ESTADO, JSON.stringify({ ultimaExecucao: hoje(), vistas: [...vistas].slice(-300) }, null, 2) + '\n');
  log(`${novas} edição(ões) nova(s) no Obsidian`);
  if (!process.argv.includes('--se-nao-rodou-hoje')) console.log(`📡 ${novas} edição(ões) nova(s) em ${NOTICIAS}`);
}

main().catch((err) => log(`erro: ${err.message}`));
