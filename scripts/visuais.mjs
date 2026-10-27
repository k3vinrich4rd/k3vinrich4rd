// Visuais animados das seções do README: painel do segundo cérebro, pilares do PDI, atuação profissional,
// formação e a conversa do "Pergunte ao Kevin". Os dados saem do próprio README (ou do progresso.json, no caso do
// cérebro): o texto continua lá, recolhido em "ver em tabela", e o SVG só desenha o mesmo conteúdo.
import { xml } from './lib.mjs';

const AZUL = '#003D74';
const AZUL_CLARO = '#58a6ff';
const LARANJA = '#EC7000';
const FUNDO = '#0d1117';
const CARTAO = '#161b22';
const BORDA = '#30363d';
const TEXTO = '#e6edf3';
const APAGADO = '#8b949e';
const VERDE = '#3fb950';
const AMARELO = '#d29922';
const SANS = "'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif";

const cabecalho = (w, h, rotulo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${xml(rotulo)}">
  <!-- Gerado por scripts/visuais.mjs a partir do README e do progresso.json. Não edite à mão. -->`;
const marca = `<linearGradient id="marca" x1="0" x2="1"><stop offset="0" stop-color="${AZUL}"/><stop offset="1" stop-color="${LARANJA}"/></linearGradient>`;
const animacoes = `
    .entra { opacity: 0; animation: entra .6s cubic-bezier(.2,.8,.2,1) forwards; }
    @keyframes entra { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    .barra { transform: scaleX(0); transform-box: fill-box; transform-origin: left; animation: cresce 1.6s cubic-bezier(.2,.8,.2,1) forwards; }
    @keyframes cresce { to { transform: scaleX(1); } }
    .pulsa { animation: pulsa 1.6s ease-in-out infinite; }
    @keyframes pulsa { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }`;

// Quebra o texto em até `max` linhas de no máximo `largura` caracteres.
function quebrar(texto, largura, max) {
  const linhas = [''];
  for (const palavra of String(texto).split(' ')) {
    const atual = linhas[linhas.length - 1];
    if ((atual + ' ' + palavra).trim().length <= largura) linhas[linhas.length - 1] = (atual + ' ' + palavra).trim();
    else if (linhas.length < max) linhas.push(palavra);
    else { linhas[linhas.length - 1] = `${atual.slice(0, largura - 1)}…`; break; }
  }
  return linhas;
}

const semMarkdown = (t) => String(t).replace(/\*\*|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
// "☕ Java + Spring" → ['☕', 'Java + Spring']
const separarIcone = (t) => {
  const m = /^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)\s*(.*)$/u.exec(t.trim());
  return m ? [m[1], m[2]] : ['•', t.trim()];
};

/** Linhas de uma tabela Markdown que começa pelo cabeçalho indicado (sem a linha |---|). */
export function tabela(md, cabecalhoTabela) {
  const linhas = md.split('\n');
  const i = linhas.findIndex((l) => l.startsWith(cabecalhoTabela));
  if (i < 0) return [];
  const out = [];
  for (let j = i + 2; j < linhas.length && linhas[j].startsWith('|'); j++) {
    out.push(linhas[j].split('|').slice(1, -1).map((c) => c.trim()));
  }
  return out;
}

// ---------- 🧠 painel do segundo cérebro ----------

export function cerebro({ cerebro: c, biblioteca: b = {}, estudos = [] }) {
  const praticados = estudos.filter((e) => e.status === 'praticado').length;
  const modulos = c.trilhas.reduce((s, t) => s + t.modulos.length, 0);
  const tiles = [
    ['🗓️', c.diasDiario30, 'dias com registro', 'nos últimos 30'],
    ['📚', b.notas ?? 0, 'notas de estudo', `${b.comSem ?? 0} com exemplo com × sem`],
    ['🧭', c.trilhas.length, 'trilhas', `${modulos} módulos`],
    ['✅', praticados, 'assuntos', 'praticados em projeto'],
  ];
  const conta = (notas, st) => notas.filter((n) => n.status === st).length;
  const capa = { 'Trilha 1 - Java e Spring': '☕🌱 Java & Spring', 'Trilha 2 - IA': '🤖 Inteligência Artificial' };
  const ALT_TRILHA = 140 + Math.max(...c.trilhas.map((t) => t.modulos.length)) * 30 + 6;
  const altura = 170 + ALT_TRILHA + 20;
  const blocoTiles = tiles.map(([icone, valor, rotulo, sub], i) => {
    const x = 20 + i * 295;
    return `  <g class="entra" style="animation-delay:${(0.1 + i * 0.12).toFixed(2)}s">
    <rect x="${x}" y="20" width="275" height="120" rx="14" fill="${CARTAO}" stroke="${BORDA}"/>
    <text x="${x + 22}" y="62" style="font: 26px ${SANS}">${icone}</text>
    <text x="${x + 66}" y="70" style="font: 800 38px ${SANS}" fill="${i === 3 ? VERDE : TEXTO}">${valor}</text>
    <text x="${x + 22}" y="104" style="font: 600 15px ${SANS}" fill="${TEXTO}">${xml(rotulo)}</text>
    <text x="${x + 22}" y="124" style="font: 400 12.5px ${SANS}" fill="${APAGADO}">${xml(sub)}</text>
  </g>`;
  }).join('\n');
  const blocoTrilhas = c.trilhas.map((t, ti) => {
    const x = 20 + ti * 590;
    const y = 160;
    const todas = t.modulos.flatMap((m) => m.notas);
    const feitos = conta(todas, 'praticado');
    const pct = feitos / (todas.length || 1);
    const R = 42;
    const volta = 2 * Math.PI * R;
    const linhas = t.modulos.map((m, mi) => {
      const f = conta(m.notas, 'praticado');
      const larg = Math.round((210 * f) / (m.notas.length || 1));
      const ym = y + 146 + mi * 30;
      const cor = f / (m.notas.length || 1) >= 0.6 ? VERDE : f || conta(m.notas, 'andamento') ? AMARELO : APAGADO;
      return `    <text x="${x + 24}" y="${ym}" style="font: 500 13px ${SANS}" fill="${TEXTO}">${xml(quebrar(m.nome, 34, 1)[0])}</text>
    <rect x="${x + 300}" y="${ym - 10}" width="210" height="10" rx="5" fill="#21262d"/>
    ${larg ? `<rect x="${x + 300}" y="${ym - 10}" width="${larg}" height="10" rx="5" fill="${cor}" class="barra" style="animation-delay:${(0.8 + mi * 0.12).toFixed(2)}s"/>` : ''}
    <text x="${x + 556}" y="${ym}" text-anchor="end" style="font: 700 12px ${SANS}" fill="${APAGADO}">${f}/${m.notas.length}</text>`;
    }).join('\n');
    return `  <g class="entra" style="animation-delay:${(0.5 + ti * 0.2).toFixed(2)}s">
    <rect x="${x}" y="${y}" width="570" height="${ALT_TRILHA}" rx="14" fill="${CARTAO}" stroke="${BORDA}"/>
    <circle cx="${x + 70}" cy="${y + 66}" r="${R}" fill="none" stroke="#21262d" stroke-width="10"/>
    <circle cx="${x + 70}" cy="${y + 66}" r="${R}" fill="none" stroke="${ti ? AZUL_CLARO : VERDE}" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${volta.toFixed(1)}" stroke-dashoffset="${volta.toFixed(1)}" transform="rotate(-90 ${x + 70} ${y + 66})" class="anel" style="--alvo:${(volta * (1 - pct)).toFixed(1)}"/>
    <text x="${x + 70}" y="${y + 72}" text-anchor="middle" style="font: 800 18px ${SANS}" fill="${TEXTO}">${Math.round(pct * 100)}%</text>
    <text x="${x + 132}" y="${y + 52}" style="font: 800 19px ${SANS}" fill="${TEXTO}">${xml(capa[t.nome] ?? t.nome)}</text>
    <text x="${x + 132}" y="${y + 76}" style="font: 400 13px ${SANS}" fill="${APAGADO}">${feitos} de ${todas.length} assuntos praticados no RKF Bank</text>
    <text x="${x + 132}" y="${y + 100}" style="font: 600 13px ${SANS}" fill="${TEXTO}">✅ ${feitos}   🔄 ${conta(todas, 'andamento')}   📅 ${conta(todas, 'planejado')}   📘 ${conta(todas, 'referencia')}</text>
${linhas}
  </g>`;
  }).join('\n');
  const rotulo = `Segundo cérebro: ${tiles.map(([, v, r, s]) => `${v} ${r} (${s})`).join(', ')}. ` +
    c.trilhas.map((t) => `${capa[t.nome] ?? t.nome}: ${conta(t.modulos.flatMap((m) => m.notas), 'praticado')} de ${t.modulos.flatMap((m) => m.notas).length} praticados`).join('; ');
  return `${cabecalho(1200, altura, rotulo)}
  <defs>${marca}</defs>
  <style>${animacoes}
    .anel { animation: anel 2s cubic-bezier(.2,.8,.2,1) .6s forwards; }
    @keyframes anel { to { stroke-dashoffset: var(--alvo); } }
  </style>
  <rect width="1200" height="${altura}" rx="16" fill="${FUNDO}" stroke="${BORDA}"/>
${blocoTiles}
${blocoTrilhas}
</svg>
`;
}

// ---------- 🎯 pilares do PDI ----------

export function pilares(linhas) {
  const W = 220, GAP = 15;
  const cards = linhas.map(([pilar, status, foco], i) => {
    const [icone, nome] = separarIcone(pilar);
    const rotuloStatus = decodeURIComponent((/badge\/([^-]+(?:-[^-]+)*?)-([0-9A-Fa-f]{6})/.exec(status) ?? [])[1] ?? status).replace(/%20/g, ' ');
    const cor = `#${(/badge\/.*-([0-9A-Fa-f]{6})\?/.exec(status) ?? [])[1] ?? '8b949e'}`;
    const x = 20 + i * (W + GAP);
    const largPilula = rotuloStatus.length * 7.6 + 24;
    return `  <g class="entra" style="animation-delay:${(0.1 + i * 0.13).toFixed(2)}s">
    <rect x="${x}" y="70" width="${W}" height="190" rx="14" fill="${CARTAO}" stroke="${cor}" stroke-opacity=".6"/>
    <rect x="${x}" y="70" width="${W}" height="5" rx="2.5" fill="${cor}"/>
    <text x="${x + 20}" y="118" style="font: 30px ${SANS}">${icone}</text>
    <text x="${x + 20}" y="152" style="font: 700 17px ${SANS}" fill="${TEXTO}">${xml(nome)}</text>
    <rect x="${x + 20}" y="164" width="${largPilula.toFixed(0)}" height="24" rx="12" fill="${cor}" fill-opacity=".18" stroke="${cor}"/>
    <circle cx="${x + 33}" cy="176" r="4" fill="${cor}" class="pulsa"/>
    <text x="${x + 43}" y="181" style="font: 700 12px ${SANS}" fill="${TEXTO}">${xml(rotuloStatus)}</text>
    ${quebrar(semMarkdown(foco), 28, 3).map((l, k) => `<text x="${x + 20}" y="${212 + k * 17}" style="font: 400 12.5px ${SANS}" fill="${APAGADO}">${xml(l)}</text>`).join('\n    ')}
  </g>`;
  }).join('\n');
  return `${cabecalho(1200, 280, `PDI 2026, pilares: ${linhas.map(([p, s, f]) => `${p} (${semMarkdown(s.replace(/!\[\]\([^)]*badge\/([^-]+)-.*/, '$1')).replace(/%20/g, ' ')}): ${semMarkdown(f)}`).join('; ')}`)}
  <defs>${marca}</defs>
  <style>${animacoes}</style>
  <rect width="1200" height="280" rx="16" fill="${FUNDO}" stroke="${BORDA}"/>
  <text x="22" y="40" style="font: 800 21px ${SANS}" fill="${TEXTO}">🎯 Pilares do PDI 2026</text>
  <text x="1178" y="40" text-anchor="end" style="font: 400 13px ${SANS}" fill="${APAGADO}">da transição de Junior para Pleno</text>
  <rect x="22" y="52" width="1156" height="2" rx="1" fill="url(#marca)" class="barra"/>
${cards}
</svg>
`;
}

// ---------- 💼 atuação profissional ----------

export function atuacao(linhas) {
  const cores = [AZUL_CLARO, VERDE, LARANJA, '#a371f7', AMARELO];
  const altura = 70 + linhas.length * 58 + 10;
  const itens = linhas.map(([area, competencia], i) => {
    const y = 64 + i * 58;
    const cor = cores[i % cores.length];
    let x = 210;
    const chips = semMarkdown(competencia).split(/,\s*|\s+—\s+/).map((chip) => {
      const w = Math.round(chip.length * 7.3 + 26);
      const g = `<rect x="${x}" y="${y + 8}" width="${w}" height="30" rx="15" fill="${cor}" fill-opacity=".12" stroke="${cor}" stroke-opacity=".5"/><text x="${x + w / 2}" y="${y + 28}" text-anchor="middle" style="font: 500 13px ${SANS}" fill="${TEXTO}">${xml(chip)}</text>`;
      x += w + 10;
      return g;
    }).join('');
    return `  <g class="entra" style="animation-delay:${(0.1 + i * 0.14).toFixed(2)}s">
    <rect x="20" y="${y}" width="1160" height="46" rx="12" fill="${CARTAO}" stroke="${BORDA}"/>
    <rect x="20" y="${y}" width="5" height="46" rx="2.5" fill="${cor}"/>
    <text x="42" y="${y + 29}" style="font: 700 15px ${SANS}" fill="${cor}">${xml(area)}</text>
    ${chips}
  </g>`;
  }).join('\n');
  return `${cabecalho(1200, altura, `Atuação profissional: ${linhas.map(([a, c]) => `${a}: ${semMarkdown(c)}`).join('; ')}`)}
  <defs>${marca}</defs>
  <style>${animacoes}</style>
  <rect width="1200" height="${altura}" rx="16" fill="${FUNDO}" stroke="${BORDA}"/>
  <text x="22" y="40" style="font: 800 21px ${SANS}" fill="${TEXTO}">💼 O que eu levo para o time</text>
  <text x="1178" y="40" text-anchor="end" style="font: 400 13px ${SANS}" fill="${APAGADO}">Zup Innovation · serviço para o Itaú</text>
${itens}
</svg>
`;
}

// ---------- 🎓 formação ----------

/** Categorias da seção de formação: [{ titulo, cursos: [[nome, instituição]] }]. */
export function formacao(categorias) {
  const W = 280, GAP = 13.3;
  const total = categorias.reduce((s, c) => s + c.cursos.length, 0);
  const cards = categorias.map((cat, i) => {
    const [icone, nome] = separarIcone(cat.titulo);
    const porInstituicao = Object.entries(cat.cursos.reduce((m, [, inst]) => ({ ...m, [inst]: (m[inst] ?? 0) + 1 }), {}))
      .sort((a, b) => b[1] - a[1]).map(([inst, n]) => `${inst} ${n}`).join(' · ');
    const x = 20 + i * (W + GAP);
    return `  <g class="entra" style="animation-delay:${(0.1 + i * 0.14).toFixed(2)}s">
    <rect x="${x}" y="66" width="${W}" height="150" rx="14" fill="${CARTAO}" stroke="${BORDA}"/>
    <text x="${x + 20}" y="108" style="font: 28px ${SANS}">${icone}</text>
    <text x="${x + W - 20}" y="112" text-anchor="end" style="font: 800 40px ${SANS}" fill="${LARANJA}">${cat.cursos.length}</text>
    ${quebrar(nome, 30, 2).map((l, k) => `<text x="${x + 20}" y="${146 + k * 19}" style="font: 700 15px ${SANS}" fill="${TEXTO}">${xml(l)}</text>`).join('\n    ')}
    <text x="${x + 20}" y="200" style="font: 400 12.5px ${SANS}" fill="${APAGADO}">${xml(quebrar(porInstituicao, 36, 1)[0])}</text>
  </g>`;
  }).join('\n');
  return `${cabecalho(1200, 236, `Formação e certificações: ${total} cursos. ${categorias.map((c) => `${c.titulo}: ${c.cursos.map(([n, i]) => `${n} (${i})`).join(', ')}`).join('; ')}`)}
  <defs>${marca}</defs>
  <style>${animacoes}</style>
  <rect width="1200" height="236" rx="16" fill="${FUNDO}" stroke="${BORDA}"/>
  <text x="22" y="40" style="font: 800 21px ${SANS}" fill="${TEXTO}">🎓 ${total} cursos e certificações</text>
  <text x="1178" y="40" text-anchor="end" style="font: 400 13px ${SANS}" fill="${APAGADO}">abra cada área abaixo para ver a lista completa</text>
${cards}
</svg>
`;
}

// ---------- 💬 conversa do "Pergunte ao Kevin" ----------

export function conversa(perguntas) {
  const altura = 70 + perguntas.length * 50 + 70;
  const bolhas = perguntas.map((p, i) => {
    const y = 60 + i * 50;
    const texto = quebrar(semMarkdown(p), 92, 1)[0];
    const w = Math.min(980, Math.round(texto.length * 7.4 + 40));
    return `  <g class="entra" style="animation-delay:${(0.3 + i * 0.45).toFixed(2)}s">
    <circle cx="44" cy="${y + 18}" r="16" fill="${AZUL}"/>
    <text x="44" y="${y + 24}" text-anchor="middle" style="font: 800 16px ${SANS}" fill="#fff">?</text>
    <rect x="72" y="${y}" width="${w}" height="36" rx="18" fill="${CARTAO}" stroke="${BORDA}"/>
    <text x="92" y="${y + 23}" style="font: 500 13.5px ${SANS}" fill="${TEXTO}">${xml(texto)}</text>
  </g>`;
  }).join('\n');
  const yk = 60 + perguntas.length * 50 + 6;
  const atraso = (0.3 + perguntas.length * 0.45).toFixed(2);
  return `${cabecalho(1200, altura, `Pergunte ao Kevin: ${perguntas.map(semMarkdown).join(' ')} As respostas estão logo abaixo.`)}
  <defs>${marca}</defs>
  <style>${animacoes}
    .digitando circle { animation: ponto 1.2s ease-in-out infinite; }
    .digitando circle:nth-child(2) { animation-delay: .2s; } .digitando circle:nth-child(3) { animation-delay: .4s; }
    @keyframes ponto { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
  </style>
  <rect width="1200" height="${altura}" rx="16" fill="${FUNDO}" stroke="${BORDA}"/>
  <text x="22" y="38" style="font: 800 19px ${SANS}" fill="${TEXTO}">💬 Perguntas de entrevista</text>
  <text x="1178" y="38" text-anchor="end" style="font: 400 13px ${SANS}" fill="${APAGADO}">respondidas com o que eu fiz de verdade</text>
${bolhas}
  <g class="entra" style="animation-delay:${atraso}s">
    <rect x="${1200 - 72 - 470}" y="${yk}" width="470" height="40" rx="20" fill="url(#marca)"/>
    <text x="${1200 - 72 - 235}" y="${yk + 26}" text-anchor="middle" style="font: 700 14px ${SANS}" fill="#fff">Respondo cada uma logo abaixo, é só clicar 👇</text>
    <circle cx="1156" cy="${yk + 20}" r="16" fill="${LARANJA}"/>
    <text x="1156" y="${yk + 26}" text-anchor="middle" style="font: 800 16px ${SANS}" fill="#fff">K</text>
  </g>
  <g class="digitando" transform="translate(${1200 - 72 - 470 - 50} ${yk + 20})"><circle cx="0" r="4" fill="${APAGADO}"/><circle cx="12" r="4" fill="${APAGADO}"/><circle cx="24" r="4" fill="${APAGADO}"/></g>
</svg>
`;
}

// ---------- aplicação no README ----------

const secao = (md, titulo) => {
  const ini = md.indexOf(`\n## ${titulo}`);
  if (ini < 0) return '';
  const fim = md.indexOf('\n## ', ini + 4);
  return md.slice(ini, fim < 0 ? undefined : fim);
};

// Troca o <div align="center"> com a tabela por: imagem + tabela recolhida (uma vez só; depois só regera a imagem).
function envolverTabela(md, cabecalhoTabela, img, resumo) {
  if (md.includes(img)) return md;
  const linhas = md.split('\n');
  const t = linhas.findIndex((l) => l.startsWith(cabecalhoTabela));
  if (t < 0) return md;
  let ini = t - 1;
  while (ini >= 0 && linhas[ini].trim() === '') ini--;
  let fim = t;
  while (fim < linhas.length && linhas[fim].trim() !== '</div>') fim++;
  if (linhas[ini]?.trim() !== '<div align="center">' || fim >= linhas.length) return md;
  linhas.splice(fim + 1, 0, '', '</details>');
  linhas.splice(ini, 0, '<div align="center">', `  ${img}`, '</div>', '', '<details>', `<summary><b>${resumo}</b></summary>`, '');
  return linhas.join('\n');
}

/** Gera os SVGs a partir do README e devolve o README com as imagens no lugar. */
export function aplicar(readme, progresso) {
  const arquivos = {};
  let md = readme;

  const pdi = tabela(secao(md, '🎯 PDI'), '| Pilar | Status | Foco |');
  if (pdi.length) {
    arquivos['pdi.svg'] = pilares(pdi);
    md = envolverTabela(md, '| Pilar | Status | Foco |',
      '<img src="assets/pdi.svg" width="100%" alt="Pilares do PDI 2026 em cards: Java + Spring, AWS, Agent IA, Spec-Driven Dev e Skill em IA, com o status e o foco de cada um"/>',
      '📋 Os pilares em tabela');
  }

  const atu = tabela(secao(md, '💼 Atuação'), '| Área | Competência |');
  if (atu.length) {
    arquivos['atuacao.svg'] = atuacao(atu);
    md = envolverTabela(md, '| Área | Competência |',
      '<img src="assets/atuacao.svg" width="100%" alt="Atuação profissional em cards: técnico, colaboração, entregas, evolução e inglês"/>',
      '📋 As competências em tabela');
  }

  const form = secao(md, '🎓 Formação');
  const categorias = [...form.matchAll(/<summary><b>([^<]+)<\/b><\/summary>[\s\S]*?\| Certificação \| Instituição \|\n\|---\|---\|\n((?:\|.*\|\n?)+)/g)]
    .map(([, titulo, corpo]) => ({ titulo, cursos: corpo.trim().split('\n').map((l) => l.split('|').slice(1, -1).map((c) => c.trim())) }));
  if (categorias.length) {
    arquivos['formacao.svg'] = formacao(categorias);
    const img = '<img src="assets/formacao.svg" width="100%" alt="Formação e certificações em cards por área, com o número de cursos e as instituições"/>';
    if (!md.includes(img)) md = md.replace('## 🎓 Formação e certificações\n', `## 🎓 Formação e certificações\n\n<div align="center">\n  ${img}\n</div>\n`);
  }

  const perg = secao(md, '💬 Pergunte ao Kevin');
  const perguntas = [...perg.split('### ')[0].matchAll(/<summary><b>([^<]+)<\/b><\/summary>/g)].map((m) => m[1]);
  if (perguntas.length) {
    arquivos['perguntas.svg'] = conversa(perguntas);
    const img = '<img src="assets/perguntas.svg" width="100%" alt="Conversa animada com as perguntas de entrevista desta seção; as respostas estão logo abaixo"/>';
    if (!md.includes(img)) {
      const linhas = md.split('\n');
      const h = linhas.findIndex((l) => l.startsWith('## 💬 Pergunte ao Kevin'));
      let j = h + 1;
      while (j < linhas.length && (linhas[j].trim() === '' || linhas[j].startsWith('>'))) j++;
      linhas.splice(j, 0, '<div align="center">', `  ${img}`, '</div>', '');
      md = linhas.join('\n');
    }
  }

  if (progresso?.cerebro?.trilhas?.length) arquivos['cerebro.svg'] = cerebro(progresso);
  return { readme: md, arquivos };
}
