// Disparado todo dia pelo Agendador de Tarefas do Windows (tarefa "Perfil GitHub - commit diario").
// Se ainda não há commit do Kevin no perfil hoje, regenera o README (dica do dia, progresso do Obsidian, pulso)
// e publica. Commit só com mudança real: nada de commit vazio. Os commits do github-actions[bot] não contam para a
// ofensiva, por isso isto roda na máquina, com o e-mail do Kevin. Com o PC desligado, quem garante o dia é o
// workflow atualizar-readme.yml: a primeira atualização do dia sai com o autor Kevin se ainda não houver commit dele.
// Uso: node automacao/commit-diario.mjs        Instalar o agendamento: powershell -File automacao/agendar-commit-diario.ps1
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RAIZ, lerConfig } from '../scripts/lib.mjs';

const cfg = lerConfig();
const env = { KEVIN_SYNC: '1' }; // o hook global de post-commit ignora commits feitos pela automação
const git = (args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', env: { ...process.env, ...env } }).trim();
const log = (msg) => fs.appendFileSync(path.join(RAIZ, 'automacao', 'sync.log'), `${new Date().toISOString()} diário: ${msg}\n`);

/** Mesma trava do registrar-commit.mjs: não disputa o git do perfil com um commit chegando ao mesmo tempo. */
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

function commitDiario() {
  if (git(['status', '--porcelain'])) return log('perfil com mudanças manuais pendentes: sem commit hoje');
  if (git(['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') return log('perfil fora da main: sem commit hoje');

  // Pega o que o Actions publicou; em conflito nos arquivos gerados vale a versão regenerada logo abaixo.
  git(['pull', '--rebase', '--autostash', '-X', 'theirs', '-q']);

  // Qualquer commit do Kevin hoje (o hook de commit já cria um no perfil a cada commit em outro repositório) basta.
  const email = git(['config', 'user.email']);
  const meiaNoite = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  if (git(['log', 'origin/main', `--author=${email}`, `--since=${meiaNoite}`, '--format=%h'])) {
    return log('já tem commit seu no perfil hoje: nada a fazer');
  }

  execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'coletar-progresso.mjs')], { cwd: RAIZ, stdio: 'ignore' });
  execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'atualizar-readme.mjs')], { cwd: RAIZ, stdio: 'ignore' });
  git(['add', 'README.md', 'progresso.json', 'cursos.json', 'assets']);
  if (!git(['diff', '--cached', '--name-only'])) return log('README sem mudanças hoje: sem commit');
  git(['commit', '-q', '-m', 'docs(perfil): atualização diária do README']);
  if (cfg.autoPush) {
    try {
      git(['push', '-q']);
    } catch {
      git(['pull', '--rebase', '--autostash', '-X', 'theirs', '-q']); // o Actions publicou no meio do caminho
      git(['push', '-q']);
    }
  }
  log(`commit diário criado${cfg.autoPush ? ' e enviado' : ' (sem push: autoPush desligado)'}`);
}

try {
  comTrava(commitDiario);
} catch (e) {
  log(`falhou: ${e.message.split('\n')[0]}`);
  process.exitCode = 1;
}
