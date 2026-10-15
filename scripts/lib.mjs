// Funções compartilhadas pelos scripts de automação do perfil.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function lerConfig() {
  const arquivo = path.join(RAIZ, 'automacao', 'config.json');
  const padrao = path.join(RAIZ, 'automacao', 'config.example.json');
  return JSON.parse(fs.readFileSync(fs.existsSync(arquivo) ? arquivo : padrao, 'utf8'));
}

export const ler = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : null);

export function escrever(f, conteudo) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (ler(f) === conteudo) return false;
  fs.writeFileSync(f, conteudo);
  return true;
}

export function frontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---/.exec(md ?? '');
  const dados = {};
  if (m) for (const linha of m[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(linha);
    if (kv) dados[kv[1]] = kv[2].trim();
  }
  return dados;
}

/** Divide um Markdown em seções pelo nível de título (## ou ###). */
export function secoes(md, nivel = 2) {
  const marca = '#'.repeat(nivel) + ' ';
  const out = [];
  let atual = null;
  for (const linha of md.split('\n')) {
    if (linha.startsWith(marca)) { atual = { titulo: linha.slice(marca.length).trim(), linhas: [] }; out.push(atual); }
    else if (atual) atual.linhas.push(linha);
  }
  return out.map((s) => ({ ...s, corpo: s.linhas.join('\n') }));
}

export const tarefas = (texto) =>
  [...texto.matchAll(/^\s*- \[( |x|X)\] (.+)$/gm)].map((m) => ({ feito: m[1] !== ' ', texto: m[2].trim() }));

/** Remove a sintaxe do Obsidian para publicar o texto no GitHub. */
export const limparObsidian = (t) =>
  t.replace(/\s*→\s*(\[\[[^\]]+\]\]\s*(·\s*)?)+/g, ' ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

export const xml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Troca o conteúdo entre <!-- AUTO:nome:START --> e <!-- AUTO:nome:END -->. */
export function substituirBloco(md, nome, conteudo) {
  const re = new RegExp(`(<!-- AUTO:${nome}:START -->)[\\s\\S]*?(<!-- AUTO:${nome}:END -->)`);
  if (!re.test(md)) { console.warn(`aviso: marcador AUTO:${nome} não encontrado no README`); return md; }
  return md.replace(re, `$1\n${conteudo.trim()}\n$2`);
}

export const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
