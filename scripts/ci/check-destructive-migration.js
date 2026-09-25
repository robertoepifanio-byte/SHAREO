/**
 * scripts/ci/check-destructive-migration.js
 *
 * Guard de CI: falha se qualquer migration Prisma adicionada desde a ultima
 * tag/commit contiver SQL destrutivo sem arquivo de opt-in (DESTRUTIVA-APROVADA.md)
 * na mesma pasta.
 *
 * SQL considerado destrutivo:
 *   DROP TABLE, DROP COLUMN, ALTER COLUMN ... TYPE, TRUNCATE,
 *   DELETE FROM sem WHERE, RENAME TABLE / RENAME COLUMN / RENAME TO
 *
 * Uso em CI (via deploy.yml):
 *   node scripts/ci/check-destructive-migration.js [--base <git-ref>] [--all]
 *
 *   --base <ref>  ref base para o diff (padrao: HEAD~1)
 *   --all         verificar TODAS as migrations, nao so as novas
 *
 * Para liberar uma migration destrutiva, crie o arquivo
 *   prisma/migrations/<nome-da-migration>/DESTRUTIVA-APROVADA.md
 * com o motivo e quem aprovou.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../../prisma/migrations');
const OPT_IN_FILE = 'DESTRUTIVA-APROVADA.md';

/**
 * Detecta operacoes SQL destrutivas em um bloco de SQL.
 * Retorna lista de descricoes dos matches encontrados; vazia = sem destrutivo.
 */
function findDestructiveStatements(sql) {
  const found = [];

  // DROP TABLE
  if (/DROP\s+TABLE/i.test(sql)) found.push('DROP TABLE');

  // DROP COLUMN
  if (/DROP\s+COLUMN/i.test(sql)) found.push('DROP COLUMN');

  // ALTER COLUMN ... TYPE (mudanca de tipo pode ser irreversivel)
  if (/ALTER\s+COLUMN\s+\S+\s+TYPE/i.test(sql)) found.push('ALTER COLUMN ... TYPE');

  // TRUNCATE
  if (/TRUNCATE\b/i.test(sql)) found.push('TRUNCATE');

  // DELETE FROM sem WHERE (por instrucao, nao por tabela)
  // Divide em statements pelo ponto-e-virgula e verifica cada um
  const statements = sql.split(';');
  for (const stmt of statements) {
    const upper = stmt.toUpperCase().replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (/DELETE\s+FROM\b/.test(upper) && !/\bWHERE\b/.test(upper)) {
      found.push('DELETE FROM sem WHERE');
      break;
    }
  }

  // RENAME TABLE / RENAME COLUMN / RENAME TO (renomear pode quebrar codigo em producao)
  if (/RENAME\s+(TABLE|COLUMN|TO)\b/i.test(sql)) found.push('RENAME TABLE/COLUMN/TO');

  return found;
}

/**
 * Retorna a lista de pastas de migrations a verificar.
 * Sem --all, usa o diff do git para pegar apenas migrations adicionadas/modificadas.
 */
function getMigrationFolders({ all = false, base = 'HEAD~1' } = {}) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];

  if (all) {
    return fs.readdirSync(MIGRATIONS_DIR)
      .filter((d) => {
        const full = path.join(MIGRATIONS_DIR, d);
        return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'migration.sql'));
      });
  }

  // Sem try/catch de propósito: base inexistente (checkout raso, SHA desconhecido)
  // tem de parar o deploy com o erro do git. O fallback antigo verificava TODAS as
  // migrations e bloqueou o staging em 25/09 por DROPs aplicados em agosto.
  const raw = execSync(
    `git diff --name-status "${base}" HEAD -- prisma/migrations/`,
    { encoding: 'utf8', cwd: path.join(__dirname, '../..') }
  );
  const added = raw
    .split('\n')
    .filter((line) => /^[AM]\t/.test(line))
    .map((line) => line.replace(/^[AM]\t/, '').trim())
    .filter((f) => f.endsWith('migration.sql'));

  return [...new Set(added.map((f) => path.basename(path.dirname(f))))];
}

function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const baseIdx = args.indexOf('--base');
  const base = baseIdx !== -1 ? args[baseIdx + 1] : 'HEAD~1';

  const folders = getMigrationFolders({ all, base });

  if (folders.length === 0) {
    console.log('Nenhuma migration nova encontrada.');
    return;
  }

  let hasError = false;

  for (const folder of folders) {
    const migDir = path.join(MIGRATIONS_DIR, folder);
    const sqlFile = path.join(migDir, 'migration.sql');
    if (!fs.existsSync(sqlFile)) continue;

    const sql = fs.readFileSync(sqlFile, 'utf8');
    const destructive = findDestructiveStatements(sql);
    if (destructive.length === 0) {
      console.log(`[OK] ${folder}`);
      continue;
    }

    const optIn = path.join(migDir, OPT_IN_FILE);
    if (fs.existsSync(optIn)) {
      console.log(`[OK-APROVADO] ${folder}: destrutivo com opt-in (${destructive.join(', ')})`);
      continue;
    }

    console.error(`[BLOQUEADO] ${folder}: SQL destrutivo sem ${OPT_IN_FILE}:`);
    destructive.forEach((d) => console.error(`  * ${d}`));
    console.error(
      `  Para aprovar, crie prisma/migrations/${folder}/${OPT_IN_FILE} com o motivo.\n`
    );
    hasError = true;
  }

  if (hasError) {
    console.error(
      'Deploy bloqueado: migration destrutiva sem opt-in. ' +
      'Crie DESTRUTIVA-APROVADA.md na pasta da migration para liberar.'
    );
    process.exit(1);
  }
}

module.exports = { findDestructiveStatements, getMigrationFolders };

if (require.main === module) {
  main();
}
