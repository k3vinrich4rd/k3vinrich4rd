// Bloco AUTO:cursos do README: um painel por curso começado (selos, caminho dos capítulos e tabela) e a fila dos
// cursos matriculados que ainda não comecei. Os dados vêm de cursos.json, mantido pela tarefa agendada
// "progresso-dos-cursos" do Claude (lê a plataforma no Chrome), então nenhum curso novo precisa de código novo.
const NUMEROS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

// shields.io: hífen e sublinhado se escrevem dobrados; o resto vai codificado.
const selo = (rotulo, valor, cor) =>
  `<img src="https://img.shields.io/badge/${[rotulo, valor].map((t) => encodeURIComponent(t.replace(/-/g, '--').replace(/_/g, '__'))).join('-')}-${cor}?style=for-the-badge"/>`;

const status = (c) => (c.feitas >= c.total ? '✅' : c.feitas > 0 ? '🔄' : '📅');
// Quebra o nome em linhas de ~18 caracteres para as caixas do diagrama não ficarem largas demais.
const quebrado = (nome) =>
  nome.split(' ').reduce((linhas, palavra) => {
    const ultima = linhas.at(-1);
    if (ultima && `${ultima} ${palavra}`.length <= 18) linhas[linhas.length - 1] = `${ultima} ${palavra}`;
    else linhas.push(palavra);
    return linhas;
  }, []).join('<br/>');

function painel(curso) {
  const caps = curso.capitulos ?? [];
  const concluidos = caps.filter((c) => c.feitas >= c.total).length;
  const selos = [
    selo('progresso', `${curso.progresso}%`, 'EC7000'),
    caps.length && selo('capítulos concluídos', `${concluidos} de ${caps.length}`, '3fb950'),
    curso.desafios?.total && selo('desafios entregues', `${curso.desafios.feitos} de ${curso.desafios.total}`, '58a6ff'),
  ].filter(Boolean);
  const nos = caps.map((c, i) => `C${i + 1}["${NUMEROS[i] ?? i + 1} ${quebrado(c.nome.replace(/"/g, "'"))}<br/>${status(c)} ${c.feitas}/${c.total}"]`);
  const estilos = caps
    .map((c, i) => (c.feitas >= c.total ? `    style C${i + 1} fill:#1f6f3f,color:#fff` : c.feitas > 0 ? `    style C${i + 1} fill:#9a6700,color:#fff` : null))
    .filter(Boolean);
  const tabela = caps.map((c, i) => `| ${i + 1} | ${c.nome} | ${c.feitas}/${c.total} | ${c.duracao ?? ''} | ${status(c)} | ${c.entrega ?? ''} |`);
  return `### ${curso.progresso >= 100 ? '✅' : '☕'} [${curso.nome}](${curso.url}) · ${curso.plataforma}

<div align="center">

${selos.join('\n')}

</div>
${caps.length ? `
\`\`\`mermaid
flowchart LR
    ${nos.join(' --> ')}
${estilos.join('\n')}
\`\`\`

| # | Capítulo | Aulas | Duração | Status | O que entreguei |
|:-:|---|:-:|:-:|:-:|---|
${tabela.join('\n')}
` : ''}
<sub>${curso.aulas.feitas} de ${curso.aulas.total} aulas assistidas</sub>`;
}

export function blocoCursos(dados) {
  const cursos = (dados?.cursos ?? []).filter((c) => c.progresso > 0);
  const partes = cursos.length ? cursos.map(painel) : ['<sub>Nenhum curso em andamento agora.</sub>'];
  const fila = dados?.naFila ?? [];
  if (fila.length) partes.push(`**📌 Na fila (matriculado, ainda não comecei):** ${fila.map((c) => `[${c.nome}](${c.url}) (${c.aulas} aulas)`).join(' · ')}`);
  partes.push(`<sub>🤖 Progresso lido da plataforma do curso pela minha automação em ${dados?.atualizado ?? '—'}.</sub>`);
  return partes.join('\n\n');
}
