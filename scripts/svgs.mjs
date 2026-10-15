// SVGs animados do README (história, números, botões, IDE, divisor e chamada final).
// Tudo é gerado a partir do progresso.json, para continuar se atualizando sozinho.
// O GitHub mostra SVG como imagem: animação CSS funciona, clique só no <a> ou <summary> em volta.
import { xml } from './lib.mjs';

const AZUL = '#003D74';
const LARANJA = '#EC7000';
const FUNDO = '#0d1117';
const BORDA = '#30363d';
const TEXTO = '#e6edf3';
const APAGADO = '#8b949e';
const VERDE = '#3fb950';
const SANS = "'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif";
const MONO = "Consolas, 'Fira Code', 'JetBrains Mono', Menlo, monospace";

const cabecalho = (w, h, rotulo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${xml(rotulo)}">
  <!-- Gerado por scripts/svgs.mjs. Não edite à mão. -->`;

const gradientes = `<linearGradient id="marca" x1="0" x2="1"><stop offset="0" stop-color="${AZUL}"/><stop offset="1" stop-color="${LARANJA}"/></linearGradient>`;

// ---------- 🧑🏿 avatar do Kevin ----------

const PELE = '#5a3520';
const PELE_SOMBRA = '#45281a';
const CABELO = '#121212';

/**
 * Avatar vetorial do Kevin: homem negro, cabelo curto e barba, moletom azul com detalhe laranja.
 * Desenhado numa caixa de 100x120; `escala` e a posição (canto superior esquerdo) vêm de fora.
 * Com `acenar`, o braço direito acena; com `andar`, o corpo balança como quem caminha.
 */
export function avatar(x, y, escala = 1, { acenar = false, andar = false } = {}) {
  const braco = acenar
    ? `<g class="aceno" style="transform-origin: 80px 92px">
        <path d="M78 92 Q92 74 94 56" stroke="${AZUL}" stroke-width="11" stroke-linecap="round" fill="none"/>
        <circle cx="94" cy="52" r="7" fill="${PELE}"/>
      </g>`
    : '';
  return `<g transform="translate(${x} ${y}) scale(${escala})">
    <g class="${andar ? 'anda-avatar' : ''}">
      <ellipse cx="50" cy="121" rx="30" ry="3" fill="#000" opacity=".35"/>
      <path d="M12 120 C12 90 29 78 50 78 C71 78 88 90 88 120 Z" fill="${AZUL}"/>
      <path d="M50 80 L50 120" stroke="${LARANJA}" stroke-width="2.5"/>
      <path d="M38 80 Q50 92 62 80" fill="none" stroke="#0a2c52" stroke-width="3"/>
      <rect x="42" y="62" width="16" height="18" rx="5" fill="${PELE_SOMBRA}"/>
      <circle cx="28" cy="46" r="5.5" fill="${PELE_SOMBRA}"/>
      <circle cx="72" cy="46" r="5.5" fill="${PELE_SOMBRA}"/>
      <ellipse cx="50" cy="44" rx="22" ry="25" fill="${PELE}"/>
      <path d="M28 41 C26 21 38 14 50 14 C63 14 75 21 72 41 C70 30 62 26 50 26 C38 26 30 30 28 41 Z" fill="${CABELO}"/>
      <path d="M29 48 C30 62 39 70 50 70 C61 70 70 62 71 48 C68 58 61 63 50 63 C39 63 32 58 29 48 Z" fill="${CABELO}"/>
      <path d="M38 38 h7 M55 38 h7" stroke="${CABELO}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="42" cy="45" r="2.4" fill="#0d0d0d"/>
      <circle cx="58" cy="45" r="2.4" fill="#0d0d0d"/>
      <path d="M44 56 Q50 61 56 56" stroke="#f2e6dc" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${braco}
    </g>
  </g>`;
}

export const estiloAvatar = `
    .aceno { animation: aceno 1.8s ease-in-out infinite; }
    @keyframes aceno { 0%,55%,100% { transform: rotate(0deg); } 12%,36% { transform: rotate(16deg); } 24%,48% { transform: rotate(-10deg); } }
    .anda-avatar { animation: passo .5s ease-in-out infinite alternate; }
    @keyframes passo { from { transform: translateY(0); } to { transform: translateY(-4px); } }`;

// ---------- 📖 história em cenas ----------

export function historia({ testes, praticadas, total, foco }) {
  const cenas = [
    ['2022', '🚪', 'A porta de entrada', ['Programa Catalisa da Zup Innovation', 'Lógica, POO, SOLID e Design Patterns', 'Spring Boot, JPA, Mockito e Spring Security']],
    ['2023', '🧪', 'Novas linguagens, mais testes', ['Kotlin + Spring Boot no BookMarket', 'Testes automatizados e Mockito (Alura)', 'Spring Boot 3']],
    ['2024', '🧱', 'Base sólida', ['Spring Boot Essentials (DevDojo)', 'API REST de cadastro de estudantes', 'Menos volume, mais profundidade']],
    ['2025', '🎓', 'Formação profissional', ['Formação Spring Professional (DevSuperior)', 'Injeção de dependência e componentes', 'Projeto em dupla: LkBank']],
    ['2026', '🏦', 'Projeto de verdade', ['Java 25 + Spring Boot 4', `RKF Bank: ${testes} testes, CI, logs e lock otimista`, 'Workshops JPA e MongoDB · CRUD nota 10/10']],
    ['Agora', '🚀', 'Rumo ao Pleno', [`${praticadas} de ${total} competências de Pleno praticadas`, 'Dev Junior na Zup, serviço para o Itaú', `Próximo passo: ${foco}`]],
  ];
  const n = cenas.length;
  const fatia = 4; // segundos por cena
  const ciclo = n * fatia;
  const pct = (100 / n).toFixed(3);
  const xs = cenas.map((_, i) => 110 + i * (980 / (n - 1)));
  // Keyframes do marcador: anda de um ano para o outro e espera na cena.
  const passos = cenas.map((_, i) => {
    const ini = ((i * 100) / n).toFixed(2);
    const fim = (((i + 1) * 100) / n - 3).toFixed(2);
    return `${ini}% { transform: translateX(${(xs[i] - xs[0]).toFixed(1)}px); } ${fim}% { transform: translateX(${(xs[i] - xs[0]).toFixed(1)}px); }`;
  }).join(' ');
  const g = cenas.map(([ano, icone, titulo, linhas], i) => `
  <g class="cena" style="animation-delay:${i * fatia}s">
    <text x="120" y="118" font-size="64">${icone}</text>
    <text x="220" y="92" class="ano">${xml(ano)}</text>
    <text x="220" y="132" class="titulo">${xml(titulo)}</text>
    ${linhas.map((l, j) => `<text x="${222}" y="${178 + j * 30}" class="linha"><tspan fill="${LARANJA}">▸ </tspan>${xml(l)}</text>`).join('\n    ')}
  </g>`).join('');
  const marcos = cenas.map(([ano], i) => `
    <circle cx="${xs[i]}" cy="318" r="7" fill="${FUNDO}" stroke="${LARANJA}" stroke-width="2"/>
    <text x="${xs[i]}" y="346" text-anchor="middle" class="marco">${xml(ano)}</text>`).join('');
  return `${cabecalho(1200, 370, `Minha história em ${n} cenas, de 2022 até agora: ${cenas.map((c) => `${c[0]} ${c[2]}`).join('; ')}`)}
  <defs>${gradientes}
    <radialGradient id="brilho" cx=".85" cy=".2" r=".6"><stop offset="0" stop-color="${LARANJA}" stop-opacity=".22"/><stop offset="1" stop-color="${LARANJA}" stop-opacity="0"/></radialGradient>
  </defs>
  <style>
    .ano { font: 800 34px ${SANS}; fill: ${LARANJA}; }
    .titulo { font: 700 30px ${SANS}; fill: ${TEXTO}; }
    .linha { font: 400 19px ${SANS}; fill: #c9d1d9; }
    .marco { font: 600 13px ${SANS}; fill: ${APAGADO}; }
    .cena { opacity: 0; animation: cena ${ciclo}s infinite; }
    @keyframes cena { 0% { opacity: 0; transform: translateY(14px); } 2% { opacity: 1; transform: none; } ${(pct - 2).toFixed(2)}% { opacity: 1; transform: none; } ${pct}% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 0; } }
    .marcador { animation: anda ${ciclo}s cubic-bezier(.6,0,.2,1) infinite; }
    @keyframes anda { ${passos} 100% { transform: translateX(${(xs[n - 1] - xs[0]).toFixed(1)}px); } }
    .rastro { transform-origin: ${xs[0]}px 0; animation: rastro ${ciclo}s cubic-bezier(.6,0,.2,1) infinite; }
    @keyframes rastro { ${cenas.map((_, i) => `${((i * 100) / n).toFixed(2)}% { transform: scaleX(${((xs[i] - xs[0]) / (xs[n - 1] - xs[0]) || 0.001).toFixed(4)}); } ${(((i + 1) * 100) / n - 3).toFixed(2)}% { transform: scaleX(${((xs[i] - xs[0]) / (xs[n - 1] - xs[0]) || 0.001).toFixed(4)}); }`).join(' ')} 100% { transform: scaleX(1); } }
    .pulso { animation: pulso 1.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes pulso { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.6); opacity: .25; } }${estiloAvatar}
  </style>
  <rect width="1200" height="370" rx="14" fill="${FUNDO}" stroke="${BORDA}"/>
  <rect width="1200" height="370" rx="14" fill="url(#brilho)"/>
  <text x="40" y="44" style="font: 700 14px ${SANS}; letter-spacing: 3px" fill="${APAGADO}">📖 MINHA HISTÓRIA · ${n} CENAS · ${ciclo}s</text>
  ${g}
  <line x1="${xs[0]}" y1="318" x2="${xs[n - 1]}" y2="318" stroke="${BORDA}" stroke-width="3"/>
  <line x1="${xs[0]}" y1="318" x2="${xs[n - 1]}" y2="318" stroke="url(#marca)" stroke-width="3" class="rastro"/>
  ${marcos}
  <g class="marcador">${avatar(xs[0] - 30, 238, 0.6, { andar: true })}<circle cx="${xs[0]}" cy="318" r="10" fill="${LARANJA}" class="pulso"/><circle cx="${xs[0]}" cy="318" r="7" fill="${LARANJA}"/></g>
</svg>
`;
}

// ---------- 🔢 números com dígitos que rolam ----------

function digitosRolando(valor, x, y, cor, atraso) {
  const s = String(valor);
  const larg = 26;
  return s.split('').map((ch, i) => {
    if (!/\d/.test(ch)) return `<text x="${x + i * larg}" y="${y}" class="num" fill="${cor}">${xml(ch)}</text>`;
    const d = Number(ch);
    const id = `c${x}_${y}_${i}`.replace(/\./g, '');
    const coluna = Array.from({ length: 10 }, (_, k) => `<text x="${x + i * larg}" y="${y + k * 52}" class="num" fill="${cor}">${k}</text>`).join('');
    return `<clipPath id="${id}"><rect x="${x + i * larg - 2}" y="${y - 44}" width="${larg + 2}" height="54"/></clipPath>
      <g clip-path="url(#${id})"><g class="rola" style="--alvo:${-d * 52}px; animation-delay:${(atraso + i * 0.12).toFixed(2)}s; animation-name: r${d}">${coluna}</g></g>`;
  }).join('\n      ');
}

export function numeros(itens) {
  const w = 1200;
  const col = w / itens.length;
  const cards = itens.map(([valor, rotulo, sub, cor], i) => {
    const largura = String(valor).length * 26;
    const x = Math.round(i * col + col / 2 - largura / 2);
    return `
    <g class="card" style="animation-delay:${(i * 0.15).toFixed(2)}s">
      <rect x="${i * col + 10}" y="18" width="${col - 20}" height="150" rx="12" fill="#0b1422" stroke="${BORDA}"/>
      <rect x="${i * col + 10}" y="18" width="${col - 20}" height="3" rx="1.5" fill="${cor}"/>
      ${digitosRolando(valor, x, 92, cor, 0.4 + i * 0.15)}
      <text x="${i * col + col / 2}" y="130" text-anchor="middle" class="rot">${xml(rotulo)}</text>
      <text x="${i * col + col / 2}" y="152" text-anchor="middle" class="sub">${xml(sub)}</text>
    </g>`;
  }).join('');
  const kf = Array.from({ length: 10 }, (_, d) => `@keyframes r${d} { 0% { transform: translateY(0); } 100% { transform: translateY(${-d * 52}px); } }`).join(' ');
  return `${cabecalho(w, 186, `Kevin em números: ${itens.map(([v, r]) => `${v} ${r}`).join(', ')}`)}
  <style>
    .num { font: 800 44px ${MONO}; }
    .rot { font: 700 15px ${SANS}; fill: ${TEXTO}; }
    .sub { font: 400 12px ${SANS}; fill: ${APAGADO}; }
    .rola { animation-duration: 1.8s; animation-timing-function: cubic-bezier(.2,.9,.2,1); animation-fill-mode: both; }
    ${kf}
    .card { opacity: 0; animation: sobe .7s cubic-bezier(.2,.8,.2,1) forwards; }
    @keyframes sobe { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  </style>
  ${cards}
</svg>
`;
}

// ---------- 🔘 botões ----------

export function botao(texto, { icone = '', cor = LARANJA, largura = 260, destaque = false, sub = '' } = {}) {
  const h = sub ? 64 : 46;
  // Botão de uma linha mede o próprio texto (~8px por caractere em 15px bold) para a seta não encostar.
  if (!sub) largura = 22 + (icone ? 24 : 0) + Math.round(texto.length * 8.2) + 34;
  return `${cabecalho(largura, h, texto + (sub ? `: ${sub}` : ''))}
  <defs>${gradientes}
    <linearGradient id="brilho" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="forma"><rect x="1" y="1" width="${largura - 2}" height="${h - 2}" rx="${h / 2 - 1}"/></clipPath>
  </defs>
  <style>
    .brilho { animation: passa 3.2s ease-in-out infinite; }
    @keyframes passa { 0% { transform: translateX(-${largura}px); } 60%,100% { transform: translateX(${largura}px); } }
    .seta { animation: seta 1.4s ease-in-out infinite; }
    @keyframes seta { 0%,100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
  </style>
  <g clip-path="url(#forma)">
    <rect width="${largura}" height="${h}" fill="${destaque ? 'url(#marca)' : FUNDO}"/>
    <rect width="${largura}" height="${h}" fill="${cor}" opacity="${destaque ? 0 : 0.12}"/>
    <rect class="brilho" width="${Math.round(largura / 2)}" height="${h}" fill="url(#brilho)"/>
  </g>
  <rect x="1" y="1" width="${largura - 2}" height="${h - 2}" rx="${h / 2 - 1}" fill="none" stroke="${destaque ? LARANJA : cor}" stroke-width="1.5"/>
  <text x="22" y="${sub ? 29 : 29}" style="font: 700 15px ${SANS}" fill="${TEXTO}">${icone ? `${icone}  ` : ''}${xml(texto)}</text>
  ${sub ? `<text x="22" y="49" style="font: 400 12px ${SANS}" fill="${destaque ? '#fff' : APAGADO}">${xml(sub)}</text>` : ''}
  <text x="${largura - 30}" y="${sub ? 38 : 29}" style="font: 700 16px ${SANS}" fill="${destaque ? '#fff' : cor}" class="seta">›</text>
</svg>
`;
}

// ---------- 💻 IDE com a classe Kevin ----------

export function ide(linhas) {
  const altura = 70 + linhas.length * 24 + 24;
  const realce = (l) => xml(l)
    .replace(/(&quot;[^&]*?&quot;)/g, '<tspan fill="#a5d6ff">$1</tspan>')
    .replace(/\b(public|class|extends|implements|return|String|List)\b/g, '<tspan fill="#ff7b72">$1</tspan>')
    .replace(/(@Override)/g, '<tspan fill="#d2a8ff">$1</tspan>')
    .replace(/\b(Kevin|Developer|AprendizContinuo)\b/g, '<tspan fill="#ffa657">$1</tspan>');
  const corpo = linhas.map((l, i) => `<text x="64" y="${74 + i * 24}" class="cod ln" style="animation-delay:${(0.4 + i * 0.12).toFixed(2)}s" xml:space="preserve">${realce(l)}</text>
    <text x="40" y="${74 + i * 24}" text-anchor="end" class="num ln" style="animation-delay:${(0.4 + i * 0.12).toFixed(2)}s">${i + 1}</text>`).join('\n    ');
  const ult = linhas.length;
  return `${cabecalho(1200, altura, 'Classe Java Kevin: nome, cidade, empresa, nível, foco, aprendizado e próximo passo')}
  <style>
    .cod { font: 400 16px ${MONO}; fill: #c9d1d9; }
    .num { font: 400 13px ${MONO}; fill: #484f58; }
    .ln { opacity: 0; animation: mostra .25s ease-out forwards; }
    @keyframes mostra { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
    .cursor { animation: pisca 1s step-end infinite; }
    @keyframes pisca { 50% { opacity: 0; } }
  </style>
  <rect width="1200" height="${altura}" rx="12" fill="${FUNDO}" stroke="${BORDA}"/>
  <rect width="1200" height="38" rx="12" fill="#161b22"/><rect y="26" width="1200" height="12" fill="#161b22"/>
  <circle cx="22" cy="19" r="6" fill="#ff5f56"/><circle cx="42" cy="19" r="6" fill="#ffbd2e"/><circle cx="62" cy="19" r="6" fill="#27c93f"/>
  <rect x="90" y="8" width="130" height="30" rx="6" fill="${FUNDO}"/>
  <text x="104" y="28" style="font: 600 13px ${SANS}" fill="${TEXTO}">☕ Kevin.java</text>
  <text x="1180" y="25" text-anchor="end" style="font: 400 12px ${SANS}" fill="${APAGADO}">Java 25 · UTF-8 · LF</text>
  ${corpo}
  <rect x="64" y="${74 + (ult - 1) * 24 + 8}" width="9" height="3" fill="${LARANJA}" class="cursor"/>
</svg>
`;
}

// ---------- ➖ divisor ----------

export function divisor() {
  return `${cabecalho(1200, 14, 'divisor')}
  <defs>${gradientes}
    <radialGradient id="luz"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="${LARANJA}" stop-opacity=".8"/><stop offset="1" stop-color="${LARANJA}" stop-opacity="0"/></radialGradient>
  </defs>
  <style>
    .luz { animation: corre 4.5s ease-in-out infinite; }
    @keyframes corre { 0% { transform: translateX(-60px); } 100% { transform: translateX(1260px); } }
  </style>
  <rect y="6" width="1200" height="2" rx="1" fill="url(#marca)" opacity=".85"/>
  <ellipse class="luz" cx="0" cy="7" rx="60" ry="6" fill="url(#luz)"/>
</svg>
`;
}

// ---------- 📣 chamada final ----------

export function chamada() {
  return `${cabecalho(1200, 210, 'Vamos conversar? Estou disponível para oportunidades em desenvolvimento Java backend. Clique para falar comigo no LinkedIn.')}
  <defs>${gradientes}
    <radialGradient id="g1" cx=".2" cy=".3" r=".7"><stop offset="0" stop-color="${AZUL}" stop-opacity=".6"/><stop offset="1" stop-color="${AZUL}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx=".85" cy=".8" r=".6"><stop offset="0" stop-color="${LARANJA}" stop-opacity=".35"/><stop offset="1" stop-color="${LARANJA}" stop-opacity="0"/></radialGradient>
  </defs>
  <style>
    .onda { animation: onda 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes onda { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(1.35); opacity: 0; } }
    .entra { opacity: 0; animation: entra .8s cubic-bezier(.2,.8,.2,1) forwards; }
    @keyframes entra { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
${estiloAvatar}
  </style>
  <rect width="1200" height="210" rx="16" fill="${FUNDO}" stroke="${BORDA}"/>
  <rect width="1200" height="210" rx="16" fill="url(#g1)"/><rect width="1200" height="210" rx="16" fill="url(#g2)"/>
  ${avatar(44, 46, 1.05, { acenar: true })}
  <text x="180" y="88" class="entra" style="font: 800 34px ${SANS}; animation-delay:.2s" fill="#fff">Vamos conversar?</text>
  <text x="182" y="122" class="entra" style="font: 400 17px ${SANS}; animation-delay:.4s" fill="#c9d1d9">Disponível para oportunidades em desenvolvimento Java backend.</text>
  <text x="182" y="150" class="entra" style="font: 400 15px ${SANS}; animation-delay:.6s" fill="${APAGADO}">Java · Spring Boot · APIs REST · JPA · Testes · CI/CD</text>
  <g transform="translate(860 70)">
    <rect width="290" height="64" rx="32" fill="none" stroke="${LARANJA}" stroke-width="2" class="onda"/>
    <rect width="290" height="64" rx="32" fill="url(#marca)"/>
    <text x="145" y="40" text-anchor="middle" style="font: 700 18px ${SANS}" fill="#fff">Falar no LinkedIn  ›</text>
  </g>
</svg>
`;
}
