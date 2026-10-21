// Gera as partes automáticas do README e os SVGs animados a partir de progresso.json.
// Com --api (no GitHub Actions) também busca repositórios e commits recentes na API do GitHub.
// Uso: node scripts/atualizar-readme.mjs [--api]
import path from 'node:path';
import { RAIZ, ler, escrever, substituirBloco, xml } from './lib.mjs';
import * as svg from './svgs.mjs';

const USUARIO = 'k3vinrich4rd';
const usarApi = process.argv.includes('--api');
const p = JSON.parse(ler(path.join(RAIZ, 'progresso.json')));
const { regua, rkf, historico = [] } = p;
const ck = rkf.checklist;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const badge = (rotulo, valor, cor, extra = '') =>
  `<img src="https://img.shields.io/static/v1?label=${encodeURIComponent(rotulo)}&message=${encodeURIComponent(valor)}&color=${cor}&style=flat-square${extra}"/>`;
const barra = (a, b, n = 12) => '█'.repeat(Math.round((a / (b || 1)) * n)).padEnd(n, '░');

// ---------- blocos que dependem só do progresso.json ----------

function blocoStatus() {
  // MVP zerado passa a impressão de parado: enquanto nada fechou, o badge mostra as entregas recentes.
  const mvp = ck.mvp.feitos
    ? badge('MVP', `${ck.mvp.feitos}/${ck.mvp.total}`, '003D74')
    : badge('Entregas recentes', `${ck.recentes.length} ✔`, '003D74');
  return [
    badge('Régua Pleno', `${regua.praticadas}/${regua.total}`, 'EC7000'),
    badge('Testes RKF Bank', `${rkf.testes} ✔`, '3fb950', '&logo=junit5&logoColor=white'),
    mvp,
    badge('Foco agora', apelido(p.foco), '6A1B9A'),
  ].join('\n');
}

/** "Esta semana": o que está aberto agora no checklist do Obsidian, sem detalhes entre parênteses. */
function blocoAgora() {
  const abertos = (ck.agora ?? []).filter((i) => !i.feito).map((i) => i.texto.replace(/\s*[—(].*$/, '').replace(/^⏫\s*/, '').trim());
  const fechado = ck.recentes[0];
  const linhas = [
    ...abertos.slice(0, 3).map((t) => `- 🔨 ${t}`),
    `- 🎯 Foco de estudo: **${apelido(p.foco)}**`,
    fechado && `- ✅ Última entrega: ${fechado}`,
  ].filter(Boolean);
  return `**🔥 Esta semana**\n\n${linhas.join('\n')}`;
}

function blocoRecrutador() {
  return `| Pergunta | Resposta rápida |
|---|---|
| Quem é? | Dev **Java backend Junior** na **Zup Innovation**, prestando serviço para o **Itaú**, em transição para **Pleno** (**${regua.praticadas}/${regua.total}** competências já praticadas) |
| Melhor projeto? | **[RKF Bank](https://github.com/${USUARIO}/rkf_bank)**: banco digital com Spring Boot 4, Java 25, MySQL, **${rkf.testes} testes**, CI e logs rastreáveis |
| Stack principal? | Java · Spring Boot · JPA/Hibernate · MySQL/PostgreSQL · MongoDB · JUnit/Mockito · Docker · GitHub Actions |
| O que está estudando? | ${p.trilha.map(apelido).join(' → ')} |
| Contato? | [LinkedIn](https://www.linkedin.com/in/kevin-richard-b68a54203/) · [kevinrichardve@gmail.com](mailto:kevinrichardve@gmail.com) |`;
}

function blocoRegua() {
  const icone = { praticada: '✅', andamento: '🔄', planejada: '⏳' };
  const linhas = regua.itens.map((i) => {
    const evidencia = i.evidencia || (i.status === 'andamento' ? (i.proximo ? '⏫ próximo da fila' : 'em andamento') : 'próximo ciclo');
    return `| ${i.nome} | ${icone[i.status]} | ${evidencia} |`;
  });
  return `| Competência de Pleno | Status | Evidência |
|---|:-:|---|
${linhas.join('\n')}

<sub>✅ praticado em projeto · 🔄 em andamento · ⏳ planejado · gerado do meu Obsidian em ${p.atualizado}</sub>`;
}

/** Barra só quando já há avanço; antes disso, mostra quanto falta (zeros em série parecem projeto parado). */
const progresso = (feitos, total, n = 12, sufixo = '') =>
  feitos ? `\`${barra(feitos, total, n)}\` ${feitos}/${total}${sufixo}` : `<sub>${total} a fazer</sub>`;

function blocoChecklist() {
  const item = (i) => `- [${i.feito ? 'x' : ' '}] ${i.texto}`;
  const mvp = ck.mvp.grupos.map((g) => `<b>${g.nome}</b> ${progresso(g.feitos, g.total, 8)}\n\n${g.itens.map(item).join('\n')}`).join('\n\n');
  const pleno = ck.pleno.grupos.map((g) => {
    const st = g.total && g.feitos === g.total ? 'x' : ' ';
    const tag = g.proximo ? ' ⏫ **próximo**' : g.futuro ? ' 🔮' : '';
    return `- [${st}] **${g.nome}**${tag} ${progresso(g.feitos, g.total, 8)}`;
  }).join('\n');
  const recentes = ck.recentes.length ? `\n**✔️ Concluído recentemente** <sub>${ck.recentes.length} entregas</sub>\n${ck.recentes.map((r) => `- ✅ ${r}`).join('\n')}\n` : '';
  return `${recentes}
**🚀 MVP do RKF Bank (31/10/2026)** ${progresso(ck.mvp.feitos, ck.mvp.total)}

${mvp}

**📏 Rumo ao Pleno** ${progresso(ck.pleno.feitos, ck.pleno.total, 12, ' passos')}

${pleno}

**🧹 Débitos técnicos:** ${ck.debitos.feitos ? `${ck.debitos.feitos}/${ck.debitos.total} resolvidos` : `${ck.debitos.total} mapeados`}

<sub>🤖 Sincronizado com o checklist do meu Obsidian em ${p.atualizado}.</sub>`;
}

function blocoDiario() {
  if (!historico.length) return '_Em breve._';
  return `| Quando | Onde | O que eu aprendi |
|---|---|---|
${historico.map((h) => `| ${h.data} | ${h.branch} | ${h.aprendizado} |`).join('\n')}`;
}

function blocoEstudos() {
  const estudos = p.estudos ?? [];
  if (!estudos.length) return '_Em breve._';
  const icone = { praticado: '✅', andamento: '🔄', planejado: '⏳' };
  const areas = [...new Set(estudos.map((e) => e.area))];
  const conta = (st) => estudos.filter((e) => e.status === st).length;
  const mapa = areas.map((a) => `    ${a}\n${estudos.filter((e) => e.area === a).map((e) => `      ${icone[e.status] ?? '•'} ${e.nome}`).join('\n')}`).join('\n');
  const agora = estudos.filter((e) => e.status !== 'praticado')
    .sort((a, b) => (a.status === 'andamento' ? -1 : 1) - (b.status === 'andamento' ? -1 : 1))
    .map((e) => `| ${icone[e.status]} ${e.nome} | ${e.area} | ${e.passos.total ? progresso(e.passos.feitos, e.passos.total, 10) : '—'} |`);
  const b = p.biblioteca;
  const cerebro = b
    ? `\n\n📚 **${b.notas}** notas de estudo no segundo cérebro · **${b.comSem}** com exemplos "com × sem" (como fica usando e como ficaria sem) · sessões guiadas: ${b.sessoes.map((s) => `**${s}**`).join(' · ')}`
    : '';
  return `**${conta('praticado')}** assuntos praticados em projeto · **${conta('andamento')}** em andamento · **${conta('planejado')}** planejados${cerebro}

\`\`\`mermaid
mindmap
  root((🧠 Estudos))
${mapa}
\`\`\`

| Estudando agora | Área | Próximos passos |
|---|---|---|
${agora.join('\n')}

<sub>🤖 Lido das notas de estudo do meu Obsidian em ${p.atualizado}.</sub>`;
}

const dicas = [
  ['@Transactional(readOnly = true)', 'Em métodos só de leitura, avisa o Hibernate para não checar mudanças nas entidades: menos trabalho e intenção clara.'],
  ['getReferenceById', 'No update, devolve uma referência sem fazer SELECT. O banco só é consultado quando você realmente precisa dos dados.'],
  ['@Version', 'Lock otimista: se duas transações alteram a mesma linha, a segunda recebe conflito em vez de sobrescrever o dado.'],
  ['BigDecimal', 'Dinheiro nunca em double: 0.1 + 0.2 em double dá 0.30000000000000004.'],
  ['open-in-view=false', 'Desligar evita consultas escondidas na camada web e expõe cedo o famoso LazyInitializationException.'],
  ['@MapsId', 'Faz a entidade filha usar o mesmo id da mãe, sem coluna extra. Ótimo para relações 1:1 que nascem juntas.'],
  ['@EmbeddedId', 'Quando uma relação N:N tem dados próprios (quantidade, preço), ela vira entidade com chave composta.'],
  ['@DataJpaTest', 'Sobe só a camada JPA: ideal para testar consultas derivadas, cascata e constraints sem subir a aplicação inteira.'],
  ['Optional.orElseThrow', 'Transforma "não achei" em exceção de negócio numa linha, sem if de null espalhado pelo código.'],
  ['@RestControllerAdvice', 'Centraliza o tratamento de erros: cada exceção vira um status HTTP e um JSON no mesmo formato.'],
  ['ResponseEntity.created(uri)', 'No POST, devolve 201 com o header Location apontando para o recurso novo.'],
  ['MDC + X-Request-Id', 'Coloque o id da requisição no MDC e ele aparece em todas as linhas de log daquela chamada.'],
  ['Commits semânticos', 'feat:, fix:, test:, docs:... o histórico vira documentação e o changelog quase se escreve sozinho.'],
  ['Records', 'DTOs imutáveis em uma linha: record ContaDto(UUID id, BigDecimal saldo) {}.'],
  ['Flyway', 'Cada mudança de schema vira um V__*.sql versionado. Nada de ddl-auto=update em produção.'],
  ['Testcontainers', 'Testa contra o MySQL de verdade num container, e não contra um H2 que se comporta diferente.'],
  ['Pageable', 'Receba Pageable no controller e o Spring monta page, size e sort direto da URL.'],
  ['@Valid + Bean Validation', 'Validação declarativa no DTO: a regra mora perto do dado e a mensagem sai pronta para o front.'],
  ['equals/hashCode por id', 'Entidades em Set precisam de equals e hashCode consistentes, senão itens somem ou duplicam.'],
  ['Dependabot + CodeQL', 'Segurança no automático: PRs de atualização e alerta de vulnerabilidade sem você lembrar de olhar.'],
];

// Perguntas de entrevista tiradas das minhas notas de estudo (Obsidian). Três por dia, em rodízio.
const flashcards = [
  ['Java', 'Por que nunca usar double para dinheiro?', 'Porque double guarda em base 2 e 0.1 não tem representação exata: <code>0.1 + 0.2</code> dá <code>0.30000000000000004</code>. No RKF Bank o saldo é <code>BigDecimal</code> e a coluna é <code>DECIMAL(19,2)</code>.'],
  ['Java', 'Diferença entre JDK, JRE e JVM?', 'A JVM executa bytecode; o JRE é JVM + bibliotecas para rodar; o JDK é JRE + ferramentas de desenvolvimento (<code>javac</code>). O mesmo <code>.jar</code> roda no Windows e no Linux do CI porque o bytecode é da JVM, não do sistema.'],
  ['Java', 'Java tem vazamento de memória?', 'Tem: o GC só recolhe objetos inalcançáveis. Um <code>static Map</code> que nunca é limpo mantém tudo vivo até o <code>OutOfMemoryError</code>. A solução é cache com limite e expiração.'],
  ['Java', '== ou equals para comparar dois BigDecimal?', 'Nenhum dos dois: <code>==</code> compara endereço e <code>equals</code> compara a escala (<code>1.0</code> ≠ <code>1.00</code>). Para valor, use <code>compareTo(...) == 0</code>.'],
  ['Java', 'Por que records são ótimos para DTO e péssimos para entidade JPA?', 'Records são imutáveis e já trazem <code>equals</code>, <code>hashCode</code> e <code>toString</code>. O Hibernate precisa de construtor vazio e de alterar campos, o que record não permite. Cuidado: o <code>toString</code> automático pode vazar senha no log.'],
  ['Java', 'O que é uma race condition?', 'Duas threads leem o mesmo valor e gravam por cima uma da outra. Em memória resolve com <code>AtomicInteger</code>/<code>synchronized</code>; no banco, com lock otimista (<code>@Version</code>), que no RKF Bank vira <code>409</code>.'],
  ['Java', 'Por que exceção de negócio deve ser unchecked num projeto Spring?', 'O <code>@Transactional</code> só faz rollback automático em <code>RuntimeException</code>. Uma exceção checked deixaria o débito gravado pela metade.'],
  ['Spring', 'Qual a diferença entre 401 e 403?', '<code>401</code>: não sei quem você é (sem token, vencido ou adulterado). <code>403</code>: sei quem você é, mas não pode (conta de outro cliente). No RKF Bank a regra de dono mora no <code>ContaService</code>.'],
  ['Spring', 'Por que a senha vai em BCrypt e não em SHA-256?', 'BCrypt tem salt aleatório (senhas iguais viram hashes diferentes) e é lento de propósito, o que encarece a força bruta. SHA-256 é rápido demais para senha.'],
  ['Spring', 'O que acontece se eu editar uma migração do Flyway já aplicada?', 'O checksum não bate e a aplicação não sobe (<code>Migration checksum mismatch</code>). Mudança nova = arquivo novo (<code>V6__...</code>). É uma proteção: todo banco fica igual.'],
  ['Spring', 'Por que o @Transactional não funciona numa chamada interna?', 'Ele é implementado por um proxy (AOP). Chamar outro método da mesma classe não passa pelo proxy, então a transação não abre.'],
  ['Spring', 'Por que injeção de dependência pelo construtor?', 'Campos <code>final</code>, dependências explícitas e teste sem Spring: <code>new ContaService(mock(ContaRepository.class))</code>.'],
  ['Spring', 'O que o MockMvc testa que chamar o controller direto não testa?', 'O JSON de verdade, o <code>@Valid</code>, a serialização e o status HTTP. Um <code>{"valor":"abc"}</code> só é pego passando pelo MockMvc.'],
  ['IA', 'RAG ou fine-tuning para responder sobre as decisões do time?', 'RAG: o conhecimento muda e precisa citar a fonte. Fine-tuning ensina jeito e tarefa, não fatos atualizados.'],
  ['IA', 'Qual a diferença entre chatbot e agente de IA?', 'O chatbot responde; o agente usa ferramentas em loop até cumprir um objetivo. Por isso precisa de guardrails: ler pode ser automático, mexer em dinheiro exige confirmação humana.'],
  ['IA', 'Que problema o MCP resolve?', 'O N × M de integrações: cada sistema expõe um servidor MCP e qualquer IA compatível usa, como o USB-C fez com cabos.'],
  ['IA', 'Por que o saldo não deve ser calculado pelo LLM?', 'O LLM prevê texto, não faz conta exata. Regra exata (saldo, CPF, limite) é código; o LLM interpreta e o código valida e executa.'],
  ['LGPD', 'O cliente pede para apagar os dados. O banco pode dar DELETE?', 'Não: registros financeiros têm guarda obrigatória por outras leis. O certo é encerrar a conta, bloquear o acesso e anonimizar ao fim do prazo.'],
];

function blocoFlashcards() {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dia = Math.floor((agora - new Date(agora.getFullYear(), 0, 0)) / 86400000);
  const hojeCards = [0, 1, 2].map((k) => flashcards[(dia * 3 + k) % flashcards.length]);
  const cards = hojeCards.map(([area, pergunta, resposta]) =>
    `<details>\n<summary><b>🃏 ${area} · ${pergunta}</b></summary>\n<br/>\n\n${resposta}\n\n</details>`).join('\n\n');
  return `${cards}\n\n<sub>🔄 Três perguntas novas por dia, tiradas das minhas notas de estudo · ${flashcards.length} no baralho</sub>`;
}

function blocoDica() {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dia = Math.floor((agora - new Date(agora.getFullYear(), 0, 0)) / 86400000);
  const [titulo, texto] = dicas[dia % dicas.length];
  return `> 💡 **Dica do dia: \`${titulo}\`**  \n> ${texto}  \n> <sub>Muda todo dia sozinha · ${dia % dicas.length + 1}/${dicas.length}</sub>`;
}

// ---------- SVGs ----------

const apelidos = [
  [/API REST/i, 'APIs em camadas'], [/JPA/i, 'JPA'], [/Testes unit/i, 'testes'], [/Transa/i, 'transações'],
  [/API externa/i, 'API externa'], [/Logs/i, 'logs'], [/CI\/CD/i, 'CI/CD'], [/Git Flow/i, 'Git Flow'], [/NoSQL/i, 'NoSQL'],
  [/Migra/i, 'Flyway'], [/Autentica/i, 'JWT'], [/Testcontainers|banco real/i, 'Testcontainers'], [/nuvem|AWS/i, 'AWS'],
  [/Ingl/i, 'inglês'], [/Mensageria/i, 'mensageria'],
];
const apelido = (n) => apelidos.find(([re]) => re.test(n))?.[1] ?? n.split(' ').slice(0, 2).join(' ');

function svgRumoAoPleno() {
  const largura = Math.round((742 * regua.praticadas) / regua.total);
  const nomes = regua.itens.filter((i) => i.status === 'praticada').map((i) => apelido(i.nome)).join(' · ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="230" viewBox="0 0 820 230" role="img" aria-label="Rumo ao Pleno: ${regua.praticadas} de ${regua.total} competências praticadas em projeto">
  <!-- Gerado por scripts/atualizar-readme.mjs a partir de progresso.json. Não edite à mão. -->
  <defs>
    <linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#003D74"/><stop offset="1" stop-color="#EC7000"/></linearGradient>
  </defs>
  <style>
    .t { font-family: 'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif; fill: #e6edf3; }
    .dim { fill: #8b949e; }
    .fill { transform: scaleX(0); transform-origin: left; animation: grow 2.4s cubic-bezier(.2,.8,.2,1) .3s forwards; }
    @keyframes grow { to { transform: scaleX(1); } }
    .rocket { animation: fly 2.4s cubic-bezier(.2,.8,.2,1) .3s forwards, bob 1.4s ease-in-out 2.7s infinite; }
    @keyframes fly { to { transform: translateX(${largura + 18}px); } }
    @keyframes bob { 0%,100% { transform: translate(${largura + 18}px, 0); } 50% { transform: translate(${largura + 18}px, -5px); } }
    .pop { opacity: 0; animation: pop .4s ease-out forwards; }
    @keyframes pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .pulse { animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
  </style>
  <rect width="820" height="230" rx="12" fill="#0d1117" stroke="#30363d"/>
  <text x="30" y="44" class="t" font-size="20" font-weight="700">🚀 Rumo ao Pleno</text>
  <text x="30" y="68" class="t dim" font-size="13">competências de Pleno já praticadas em projeto público · atualizado em ${xml(p.atualizado)}</text>
  <rect x="30" y="100" width="742" height="24" rx="12" fill="#21262d"/>
  <rect x="30" y="100" width="${largura}" height="24" rx="12" fill="url(#g)" class="fill"/>
  <g class="rocket"><text x="10" y="120" font-size="22">🚀</text></g>
  <circle cx="772" cy="112" r="16" fill="none" stroke="#6DB33F" stroke-width="2" class="pulse"/>
  <text x="772" y="118" text-anchor="middle" font-size="16">🏁</text>
  <text x="30" y="152" class="t dim" font-size="12">Junior</text>
  <text x="772" y="152" text-anchor="end" class="t dim" font-size="12">Pleno</text>
  <g class="pop" style="animation-delay:2.6s">
    <text x="30" y="196" class="t" font-size="30" font-weight="800" fill="#EC7000">${regua.praticadas} / ${regua.total}</text>
    <text x="150" y="186" class="t" font-size="13">✅ praticadas</text>
    <text x="150" y="205" class="t dim" font-size="11.5">${xml(nomes)}</text>
  </g>
  <g class="pop" style="animation-delay:3.1s">
    <text x="790" y="196" text-anchor="end" class="t" font-size="13">🔄 ${regua.andamento} em andamento</text>
    <text x="790" y="215" text-anchor="end" class="t" font-size="13">⏳ ${regua.planejadas} planejada${regua.planejadas === 1 ? '' : 's'}</text>
  </g>
</svg>
`;
}

function svgBanner() {
  const pctPleno = pct(regua.praticadas, regua.total);
  const trilha = p.trilha.slice(0, 3).map(apelido).join(' → ');
  const tokens = ['@Transactional', '@Version', 'git push origin develop', 'HTTP 201 Created', 'SELECT * FROM tb_conta', '@DataJpaTest', 'X-Request-Id', 'mvn verify', 'docker compose up', '@RestController', 'BigDecimal saldo', 'Spring Boot 4'];
  const flutuantes = tokens.map((t, i) => {
    const x = 30 + ((i * 97) % 640);
    const y = 60 + ((i * 53) % 300);
    return `<text x="${x}" y="${y}" class="tok" style="animation-delay:-${(i * 1.7).toFixed(1)}s">${xml(t)}</text>`;
  }).join('\n    ');
  const linhas = [
    ['nível', 'Junior → Pleno', ''],
    ['empresa', 'Zup Innovation · Itaú', ''],
    ['stack', 'Java 25 · Spring Boot 4', ''],
    ['projeto', 'RKF Bank (banco digital)', ''],
    ['testes', `${rkf.testes} ✔ BUILD SUCCESS`, 'ok'],
    ['foco', trilha, 'or'],
  ];
  const termo = linhas.map(([k, v, c], i) =>
    `<text x="24" y="${92 + i * 25}" class="mono ln" style="animation-delay:${(1.2 + i * 0.35).toFixed(2)}s"><tspan class="key">${xml(k)}</tspan><tspan x="110" class="${c || 'val'}">${xml(v)}</tspan></text>`).join('\n      ');
  const yBarra = 92 + linhas.length * 25;
  const atraso = (1.2 + linhas.length * 0.35).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" role="img" aria-label="Kevin Richard, desenvolvedor Java backend. Régua Pleno ${regua.praticadas} de ${regua.total}, ${rkf.testes} testes no RKF Bank.">
  <!-- Gerado por scripts/atualizar-readme.mjs a partir de progresso.json. Não edite à mão. -->
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1117"/><stop offset=".55" stop-color="#0b1b33"/><stop offset="1" stop-color="#0d1117"/></linearGradient>
    <radialGradient id="glowL" cx=".15" cy=".2" r=".6"><stop offset="0" stop-color="#003D74" stop-opacity=".55"/><stop offset="1" stop-color="#003D74" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowR" cx=".85" cy=".85" r=".55"><stop offset="0" stop-color="#EC7000" stop-opacity=".35"/><stop offset="1" stop-color="#EC7000" stop-opacity="0"/></radialGradient>
    <linearGradient id="marca" x1="0" x2="1"><stop offset="0" stop-color="#EC7000"/><stop offset="1" stop-color="#ffb366"/></linearGradient>
    <linearGradient id="prog" x1="0" x2="1"><stop offset="0" stop-color="#003D74"/><stop offset="1" stop-color="#EC7000"/></linearGradient>
    <pattern id="grade" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#1f6feb" stroke-opacity=".08"/></pattern>
  </defs>
  <style>
    .sans { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif; }
    .mono { font-family: Consolas, 'Fira Code', 'JetBrains Mono', Menlo, monospace; font-size: 15px; }
    .tok { font-family: Consolas, Menlo, monospace; font-size: 13px; fill: #58a6ff; opacity: 0; animation: subir 14s linear infinite; }
    @keyframes subir { 0% { opacity: 0; transform: translateY(30px); } 15% { opacity: .16; } 85% { opacity: .16; } 100% { opacity: 0; transform: translateY(-60px); } }
    .entra { opacity: 0; animation: entra .8s cubic-bezier(.2,.8,.2,1) forwards; }
    @keyframes entra { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: none; } }
    .ln { opacity: 0; animation: mostra .01s forwards; }
    @keyframes mostra { to { opacity: 1; } }
    .key { fill: #8b949e; } .val { fill: #e6edf3; } .ok { fill: #3fb950; font-weight: bold; } .or { fill: #EC7000; font-weight: bold; }
    .cursor { animation: pisca 1s step-end infinite; }
    @keyframes pisca { 50% { opacity: 0; } }
    .digita { clip-path: inset(0 100% 0 0); animation: digita 1s steps(14) .3s forwards; }
    @keyframes digita { to { clip-path: inset(0 0 0 0); } }
    .enche { transform: scaleX(0); transform-origin: left; animation: enche 1.6s cubic-bezier(.2,.8,.2,1) ${atraso}s forwards; }
    @keyframes enche { to { transform: scaleX(1); } }
    .pulso { animation: pulso 1.8s ease-in-out infinite; transform-origin: 54px 64px; }
    @keyframes pulso { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
    .scan { animation: scan 6s linear infinite; }${svg.estiloAvatar}
    @keyframes scan { from { transform: translateY(-40px); } to { transform: translateY(440px); } }
  </style>

  <rect width="1200" height="400" fill="url(#bg)"/>
  <rect width="1200" height="400" fill="url(#grade)"/>
  <rect width="1200" height="400" fill="url(#glowL)"/>
  <rect width="1200" height="400" fill="url(#glowR)"/>
  <rect class="scan" width="1200" height="40" fill="#EC7000" opacity=".035"/>
  <g>
    ${flutuantes}
  </g>

  <g class="sans">
    <text x="40" y="150" font-size="64" font-weight="800" fill="#ffffff" class="entra" style="animation-delay:.3s">Kevin Richard</text>
    <text x="42" y="196" font-size="28" font-weight="700" fill="url(#marca)" class="entra" style="animation-delay:.5s">Java Backend Developer</text>
    <text x="42" y="230" font-size="17" fill="#c9d1d9" class="entra" style="animation-delay:.7s">Spring Boot · JPA/Hibernate · Testes · CI/CD · Cloud</text>
    <text x="42" y="258" font-size="15" fill="#8b949e" class="entra" style="animation-delay:.9s">Zup Innovation · serviço para o Itaú Unibanco · Osasco, SP</text>

    <g class="entra" style="animation-delay:1.1s">
      <rect x="40" y="296" width="170" height="58" rx="10" fill="#0d1117" stroke="#30363d"/>
      <text x="56" y="322" font-size="22" font-weight="800" fill="#EC7000">${regua.praticadas}/${regua.total}</text>
      <text x="56" y="342" font-size="12" fill="#8b949e">competências de Pleno</text>
      <rect x="222" y="296" width="170" height="58" rx="10" fill="#0d1117" stroke="#30363d"/>
      <text x="238" y="322" font-size="22" font-weight="800" fill="#3fb950">${rkf.testes}</text>
      <text x="238" y="342" font-size="12" fill="#8b949e">testes verdes no RKF Bank</text>
      <rect x="404" y="296" width="170" height="58" rx="10" fill="#0d1117" stroke="#30363d"/>
      <text x="420" y="322" font-size="22" font-weight="800" fill="#58a6ff">${ck.mvp.feitos ? `${ck.mvp.feitos}/${ck.mvp.total}` : ck.recentes.length}</text>
      <text x="420" y="342" font-size="12" fill="#8b949e">${ck.mvp.feitos ? 'entregas do MVP' : 'entregas recentes'}</text>
    </g>
  </g>

  <g class="entra" style="animation-delay:1.3s">${svg.avatar(566, 214, 0.95, { acenar: true })}</g>

  <g transform="translate(680 40)">
    <rect width="480" height="320" rx="12" fill="#0d1117" fill-opacity=".92" stroke="#30363d"/>
    <rect width="480" height="34" rx="12" fill="#161b22"/>
    <rect y="22" width="480" height="12" fill="#161b22"/>
    <circle cx="20" cy="17" r="6" fill="#ff5f56"/><circle cx="40" cy="17" r="6" fill="#ffbd2e"/><circle cx="60" cy="17" r="6" fill="#27c93f"/>
    <text x="240" y="22" text-anchor="middle" class="mono" font-size="12" fill="#8b949e">kevin@zup: ~ — bash</text>
    <text x="24" y="64" class="mono"><tspan fill="#EC7000" font-weight="bold">➜ </tspan><tspan fill="#58a6ff">~ </tspan><tspan class="digita" fill="#e6edf3">kevin --status</tspan></text>
    <g>
      ${termo}
    </g>
    <g class="ln" style="animation-delay:${atraso}s">
      <text x="24" y="${yBarra + 4}" class="mono key">pleno</text>
      <rect x="110" y="${yBarra - 9}" width="290" height="14" rx="7" fill="#21262d"/>
      <rect x="110" y="${yBarra - 9}" width="${Math.round((290 * pctPleno) / 100)}" height="14" rx="7" fill="url(#prog)" class="enche"/>
      <text x="410" y="${yBarra + 4}" class="mono or">${pctPleno}%</text>
    </g>
    <text x="24" y="${yBarra + 36}" class="mono ln" style="animation-delay:${(Number(atraso) + 0.6).toFixed(2)}s"><tspan fill="#EC7000" font-weight="bold">➜ </tspan><tspan fill="#58a6ff">~ </tspan><tspan class="cursor" fill="#e6edf3">▌</tspan></text>
  </g>
</svg>
`;
}

function atualizarTerminal(svg) {
  return svg
    .replace(/(Tests run: <tspan class="ok">)\d+/, `$1${rkf.testes}`)
    .replace(/(RKF Bank: )\d+( testes)/, `$1${rkf.testes}$2`);
}

// ---------- blocos que dependem da API do GitHub ----------

async function api(rota) {
  const r = await fetch(`https://api.github.com${rota}`, {
    headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) },
  });
  if (!r.ok) throw new Error(`${rota}: HTTP ${r.status}`);
  return r.json();
}

async function repositorios() {
  const todos = [];
  for (let pag = 1; ; pag++) {
    const lote = await api(`/users/${USUARIO}/repos?per_page=100&type=owner&page=${pag}`);
    todos.push(...lote);
    if (lote.length < 100) return todos;
  }
}

function stl(anos, contagem) {
  const faces = [];
  const caixa = (x0, y0, z0, x1, y1, z1) => {
    const v = (x, y, z) => `      vertex ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`;
    const tri = (n, a, b, c) => faces.push(`  facet normal ${n}\n    outer loop\n${v(...a)}\n${v(...b)}\n${v(...c)}\n    endloop\n  endfacet`);
    tri('0.0000 0.0000 -1.0000', [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]); tri('0.0000 0.0000 -1.0000', [x0, y0, z0], [x1, y1, z0], [x1, y0, z0]);
    tri('0.0000 0.0000 1.0000', [x0, y0, z1], [x1, y0, z1], [x1, y1, z1]); tri('0.0000 0.0000 1.0000', [x0, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    tri('0.0000 -1.0000 0.0000', [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]); tri('0.0000 -1.0000 0.0000', [x0, y0, z0], [x1, y0, z1], [x0, y0, z1]);
    tri('0.0000 1.0000 0.0000', [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]); tri('0.0000 1.0000 0.0000', [x0, y1, z0], [x1, y1, z1], [x1, y1, z0]);
    tri('-1.0000 0.0000 0.0000', [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]); tri('-1.0000 0.0000 0.0000', [x0, y0, z0], [x0, y1, z1], [x0, y1, z0]);
    tri('1.0000 0.0000 0.0000', [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); tri('1.0000 0.0000 0.0000', [x1, y0, z0], [x1, y1, z1], [x1, y0, z1]);
  };
  caixa(-4, -4, -1, anos.length * 12 - 4 + 2, 12, 0);
  anos.forEach((a, i) => caixa(i * 12, 0, 0, i * 12 + 8, 8, Math.max(contagem[a], 0.5) * 0.6));
  return `solid repositorios_por_ano\n${faces.join('\n')}\nendsolid repositorios_por_ano`;
}

function blocoRepos(repos) {
  const proprios = repos.filter((r) => !r.fork);
  const linguagens = {};
  for (const r of proprios) { const l = r.language ?? 'Sem linguagem'; linguagens[l] = (linguagens[l] ?? 0) + 1; }
  const top = Object.entries(linguagens).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let a = Math.min(...proprios.map((r) => +r.created_at.slice(0, 4))); a <= anoAtual; a++) anos.push(a);
  const porAno = Object.fromEntries(anos.map((a) => [a, proprios.filter((r) => +r.created_at.slice(0, 4) === a).length]));
  const serie = anos.map((a) => porAno[a]).join(', ');
  const teto = Math.ceil(Math.max(...Object.values(porAno)) / 10) * 10 + 10;
  return `<details>
<summary><b>📊 Meus ${proprios.length} repositórios em números (gráficos, atualizados sozinhos)</b></summary>
<br/>

\`\`\`mermaid
pie showData
    title Linguagem principal dos repositórios
${top.map(([l, n]) => `    "${l}" : ${n}`).join('\n')}
\`\`\`

\`\`\`mermaid
xychart-beta
    title "Repositórios criados por ano"
    x-axis [${anos.join(', ')}]
    y-axis "Repositórios" 0 --> ${teto}
    bar [${serie}]
    line [${serie}]
\`\`\`

> 2022 foi o ano do volume (dezenas de exercícios do Catalisa). De 2025 em diante, a troca foi por **menos repositórios e projetos mais completos**, como o RKF Bank.

**🧊 Os mesmos números em 3D** (gire com o mouse, dê zoom com a roda). Da esquerda para a direita: ${anos.join(', ')}.

\`\`\`stl
${stl(anos, porAno)}
\`\`\`

</details>`;
}

async function blocoAtividade(repos) {
  const recentes = repos
    .filter((r) => !r.fork && r.name !== USUARIO && r.pushed_at)
    .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, 4);
  const linhas = [];
  for (const r of recentes) {
    try {
      // O RKF Bank trabalha na develop; nos outros vale a branch padrão. Busca a mais para sobrar depois de tirar merges.
      const rota = `/repos/${USUARIO}/${r.name}/commits?per_page=8&author=${USUARIO}`;
      const commits = await api(`${rota}&sha=develop`).catch(() => api(rota));
      for (const c of commits.filter((c) => !/^Merge /.test(c.commit.message)).slice(0, 2)) {
        const titulo = c.commit.message.split('\n')[0];
        const msg = titulo.replace(/\|/g, '\\|').slice(0, 72);
        const data = c.commit.author.date;
        linhas.push([data, `| ${iconeCommit(titulo)} | [\`${nomeCurto(r.name)}\`](${r.html_url}) | [\`${c.sha.slice(0, 7)}\`](${c.html_url}) ${msg} | ${tempoRelativo(data)} |`]);
      }
    } catch (e) { console.warn(`aviso: ${e.message}`); return null; } // tabela pela metade engana: mantém a anterior
  }
  if (!linhas.length) return null;
  linhas.sort((a, b) => b[0].localeCompare(a[0]));
  ultimoCommit = linhas[0][0];
  return `| | Repositório | Commit | Quando |
|:-:|---|---|---|
${linhas.slice(0, 8).map((l) => l[1]).join('\n')}

<sub>✨ feat · 🐛 fix · 🧪 test · 📝 docs · 🔧 chore/build/ci · ♻️ refactor &nbsp;|&nbsp; 🤖 atualizado sozinho pelo GitHub Actions a cada 6 horas · ${agoraBrasilia()}</sub>`;
}

// ---------- ⚡ pulso da semana ----------

let ultimoCommit = null;

// Nomes de repositório muito longos ganham um apelido só na exibição (o link continua o mesmo).
const nomeCurto = (nome) => ({ 'JAVA-SPRING-PROFESSIONAL-MODELO-DE-DOMINIO-ORM': 'dscommerce', 'desafio-devsuperior-crud-clientes': 'crud-clientes' }[nome] ?? nome);
const AGORA = new Date();

const iconeCommit = (titulo) => ({
  feat: '✨', fix: '🐛', test: '🧪', docs: '📝', chore: '🔧', build: '🔧', ci: '🔧', refactor: '♻️', perf: '⚡', style: '🎨', revert: '⏪',
}[/^(\w+)(\(|!|:)/.exec(titulo)?.[1]] ?? '•');

function tempoRelativo(iso) {
  const min = Math.max(0, Math.round((AGORA - new Date(iso)) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : d < 30 ? `há ${d} dias` : new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

const agoraBrasilia = () =>
  `${AGORA.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })} às ${AGORA.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`;

/** Calendário de contribuições pela página pública do perfil (não precisa de token). */
async function calendario() {
  const r = await fetch(`https://github.com/users/${USUARIO}/contributions`, { headers: { 'User-Agent': 'perfil-k3vinrich4rd' } });
  if (!r.ok) throw new Error(`calendário: HTTP ${r.status}`);
  const html = await r.text();
  const datas = Object.fromEntries([...html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})" id="(contribution-day-component-\d+-\d+)" data-level="(\d)"/g)]
    .map(([, data, id, nivel]) => [id, { data, nivel: Number(nivel), qtd: 0 }]));
  for (const [, id, texto] of html.matchAll(/for="(contribution-day-component-\d+-\d+)"[^>]*>([^<]*)/g)) {
    if (datas[id]) datas[id].qtd = /^No contributions/.test(texto) ? 0 : Number(/^(\d+)/.exec(texto)?.[1] ?? 0);
  }
  const dias = Object.values(datas).sort((a, b) => a.data.localeCompare(b.data));
  if (dias.length < 60) throw new Error('calendário: formato inesperado');
  return dias;
}

function dadosPulso(dias) {
  const hoje = AGORA.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const ate = dias.filter((d) => d.data <= hoje);
  const ultimos = (n) => ate.slice(-n);
  const soma = (lista) => lista.reduce((s, d) => s + d.qtd, 0);
  // Sequência: conta para trás a partir de hoje (ou de ontem, se hoje ainda não teve commit).
  let seq = 0;
  const rev = [...ate].reverse();
  for (let i = rev[0]?.qtd ? 0 : 1; i < rev.length && rev[i].qtd > 0; i++) seq++;
  const dia = ultimos(84);
  // Começa num domingo para as colunas serem semanas de verdade.
  while (dia.length && new Date(`${dia[0].data}T12:00:00Z`).getUTCDay() !== 0) dia.shift();
  return {
    dias: dia,
    semana: soma(ultimos(7)),
    mes: soma(ultimos(30)),
    ativos: ultimos(30).filter((d) => d.qtd > 0).length,
    sequencia: seq,
    ultimo: ultimoCommit ? tempoRelativo(ultimoCommit) : (() => {
      const d = [...ate].reverse().find((x) => x.qtd > 0);
      // Sem a API só se sabe o dia, não a hora: fala em dias para não inventar precisão.
      if (!d) return '—';
      const dias = Math.round((new Date(`${hoje}T12:00:00Z`) - new Date(`${d.data}T12:00:00Z`)) / 86400000);
      return dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
    })(),
    atualizado: agoraBrasilia(),
  };
}

// ---------- execução ----------

const arquivoReadme = path.join(RAIZ, 'README.md');
let readme = ler(arquivoReadme);
readme = substituirBloco(readme, 'status', blocoStatus());
readme = substituirBloco(readme, 'recrutador', blocoRecrutador());
readme = substituirBloco(readme, 'regua', blocoRegua());
readme = substituirBloco(readme, 'checklist', blocoChecklist());
readme = substituirBloco(readme, 'diario', blocoDiario());
readme = substituirBloco(readme, 'estudos', blocoEstudos());
readme = substituirBloco(readme, 'dica', blocoDica());
readme = substituirBloco(readme, 'flashcards', blocoFlashcards());
if (ck.gantt) readme = substituirBloco(readme, 'gantt', ck.gantt);
// Números soltos no texto que acompanham o progresso.
readme = readme
  .replace(/\d+(?= testes, JaCoCo)/, rkf.testes)
  .replace(/(Terminal rodando os testes do RKF Bank: )\d+/, `$1${rkf.testes}`)
  .replace(/(Rumo ao Pleno: )\d+ de \d+/, `$1${regua.praticadas} de ${regua.total}`);

if (usarApi) {
  try {
    const repos = await repositorios();
    readme = substituirBloco(readme, 'repos', blocoRepos(repos));
    const atividade = await blocoAtividade(repos);
    if (atividade) readme = substituirBloco(readme, 'atividade', atividade);
  } catch (e) {
    console.warn(`aviso: API do GitHub indisponível, mantendo os blocos anteriores (${e.message})`);
  }
}
readme = substituirBloco(readme, 'agora', blocoAgora());

// O pulso usa a página pública de contribuições: funciona com ou sem token. Se falhar, fica o anterior.
let svgPulso = null;
try {
  svgPulso = svg.pulso(dadosPulso(await calendario()));
} catch (e) {
  console.warn(`aviso: pulso não atualizado (${e.message})`);
}

// ---------- SVGs animados das seções (história, números, botões...) ----------

const anoAtual = Number(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 4));
const totalRepos = Number(/Meus (\d+) repositórios/.exec(readme)?.[1] ?? 0);
const formacao = readme.slice(readme.indexOf('## 🎓 Formação'));
const certificacoes = (formacao.match(/^\| (?!Certificação|---)[^|]+\| [^|]+\|$/gm) ?? []).length;
const estudos = p.estudos ?? [];
const classeKevin = /## 🚀 Sobre mim[\s\S]*?```java\n([\s\S]*?)\n```/.exec(readme)?.[1].split('\n') ?? [];

const arquivosSvg = {
  'historia.svg': svg.historia({ testes: rkf.testes, praticadas: regua.praticadas, total: regua.total, foco: apelido(p.foco) }),
  'numeros.svg': svg.numeros([
    [anoAtual - 2022, 'anos codando', 'desde o Catalisa, em 2022', '#58a6ff'],
    [totalRepos, 'repositórios', 'de exercícios a projetos reais', '#EC7000'],
    [rkf.testes, 'testes no RKF Bank', 'BUILD SUCCESS ✔', '#3fb950'],
    [`${regua.praticadas}/${regua.total}`, 'régua Pleno', 'competências praticadas', '#EC7000'],
    [estudos.filter((e) => e.status === 'praticado').length, 'assuntos praticados', `de ${estudos.length} no meu Obsidian`, '#d2a8ff'],
    [certificacoes, 'certificações', 'Alura · Udemy · AWS · Workover', '#58a6ff'],
  ]),
  'sobre-mim.svg': svg.ide(classeKevin),
  'divisor.svg': svg.divisor(),
  'chamada.svg': svg.chamada(),
  ...(svgPulso && { 'pulso.svg': svgPulso }),
};
const botoes = {
  // Larguras pensadas para caber 5 botões por linha na coluna do perfil (~830px).
  'trilhas.svg': ['Trilhas', { icone: '🎮', largura: 128 }],
  'ao-vivo.svg': ['Ao vivo', { icone: '📡', largura: 132 }],
  'historia.svg': ['Trajetória', { icone: '🧭', largura: 148 }],
  'rkf-bank.svg': ['Projeto atual', { icone: '🏦', largura: 168, destaque: true }],
  'projetos.svg': ['Projetos', { icone: '🗂️', largura: 138 }],
  'pleno.svg': ['Junior → Pleno', { icone: '📈', largura: 176 }],
  'roadmap.svg': ['Roadmap', { icone: '🎯', largura: 142 }],
  'stack.svg': ['Stack', { icone: '🛠️', largura: 118 }],
  'perguntas.svg': ['Perguntas', { icone: '💬', largura: 148 }],
  'formacao.svg': ['Formação', { icone: '🎓', largura: 146 }],
  'trilha-recrutador.svg': ['Sou recrutador(a) e tenho 1 minuto', { icone: '💼', largura: 400, destaque: true, sub: 'Quem sou, melhor projeto, stack e contato' }],
  'trilha-dev.svg': ['Sou dev e quero ver código', { icone: '👩‍💻', largura: 400, cor: '#58a6ff', sub: 'Roteiro de leitura do mais simples ao mais completo' }],
  'trilha-iniciante.svg': ['Também estou começando na área', { icone: '🌱', largura: 400, cor: '#3fb950', sub: 'O caminho que funcionou para mim' }],
  'ver-codigo.svg': ['Ver código', { icone: '📂', largura: 170, cor: '#58a6ff' }],
  'ler-readme.svg': ['Ler o README', { icone: '📖', largura: 190 }],
  'linkedin.svg': ['Chamar no LinkedIn', { icone: '📩', largura: 240, destaque: true }],
  'email.svg': ['Enviar e-mail', { icone: '✉️', largura: 190, cor: '#ff7b72' }],
};

const mudancas = [
  escrever(arquivoReadme, readme) && 'README.md',
  ...Object.entries(arquivosSvg).map(([nome, conteudo]) => escrever(path.join(RAIZ, 'assets', nome), conteudo) && `assets/${nome}`),
  ...Object.entries(botoes).map(([nome, [texto, op]]) => escrever(path.join(RAIZ, 'assets', 'botoes', nome), svg.botao(texto, op)) && `assets/botoes/${nome}`),
  escrever(path.join(RAIZ, 'assets', 'banner.svg'), svgBanner()) && 'assets/banner.svg',
  escrever(path.join(RAIZ, 'assets', 'rumo-ao-pleno.svg'), svgRumoAoPleno()) && 'assets/rumo-ao-pleno.svg',
  escrever(path.join(RAIZ, 'assets', 'terminal.svg'), atualizarTerminal(ler(path.join(RAIZ, 'assets', 'terminal.svg')))) && 'assets/terminal.svg',
].filter(Boolean);
console.log(mudancas.length ? `atualizado: ${mudancas.join(', ')}` : 'README e SVGs sem mudanças');
