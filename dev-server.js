// Servidor local de desenvolvimento — não vai para produção.
// Na Vercel, os arquivos de /api viram funções automaticamente e o HTML
// é servido como estático. Isto reproduz os dois comportamentos na sua
// máquina, para testar o fluxo completo sem precisar de login na Vercel.
//
// Uso: npm run dev  →  http://localhost:3000

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
const PORTA = Number(process.env.PORT) || 3000;

// Carrega .env.local, como a Vercel faz no ambiente dela.
// Parser próprio em vez de process.loadEnvFile para não exigir Node 21+,
// já que engines.node do projeto é >=18.
function carregarEnv(arquivo) {
    let texto;
    try {
        texto = readFileSync(arquivo, 'utf8');
    } catch {
        console.warn('Aviso: .env.local não encontrado — as rotas /api vão responder 500.');
        return;
    }

    for (const linha of texto.split('\n')) {
        const limpa = linha.trim();
        if (!limpa || limpa.startsWith('#')) continue;

        const corte = limpa.indexOf('=');
        if (corte < 1) continue;

        const chave = limpa.slice(0, corte).trim();
        const valor = limpa.slice(corte + 1).trim().replace(/^(['"])(.*)\1$/, '$2');

        // Variável já definida no shell tem precedência, como na Vercel.
        if (!(chave in process.env)) process.env[chave] = valor;
    }
}

carregarEnv(join(RAIZ, '.env.local'));

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
};

// As funções da Vercel usam res.status().json(); o http do Node não tem isso.
function adaptarResposta(res) {
    res.status = (codigo) => {
        res.statusCode = codigo;
        return res;
    };
    res.json = (corpo) => {
        if (!res.hasHeader('Content-Type')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        res.end(JSON.stringify(corpo));
        return res;
    };
    return res;
}

function lerCorpo(req) {
    return new Promise((resolve) => {
        const partes = [];
        req.on('data', (parte) => partes.push(parte));
        req.on('end', () => {
            const bruto = Buffer.concat(partes).toString('utf8');
            if (!bruto) return resolve(undefined);
            try {
                resolve(JSON.parse(bruto));
            } catch {
                resolve(bruto);
            }
        });
    });
}

async function tratarApi(req, res, rota) {
    let handler;
    try {
        ({ default: handler } = await import(`./api/${rota}.js`));
    } catch {
        res.statusCode = 404;
        return res.end('Rota /api/' + rota + ' não existe');
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        req.body = await lerCorpo(req);
    }

    try {
        await handler(req, adaptarResposta(res));
    } catch (erro) {
        console.error(`Erro em /api/${rota}:`, erro);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ erro: 'Erro interno' }));
        }
    }
}

async function servirEstatico(req, res, caminho) {
    if (caminho === '/') caminho = '/index.html';
    if (caminho === '/painel') caminho = '/painel.html';

    // Impede sair da pasta do projeto via ../
    const destino = join(RAIZ, normalize(caminho).replace(/^(\.\.[/\\])+/, ''));
    if (!destino.startsWith(RAIZ.endsWith(sep) ? RAIZ : RAIZ + sep)) {
        res.statusCode = 403;
        return res.end('Acesso negado');
    }

    try {
        const conteudo = await readFile(destino);
        res.setHeader('Content-Type', TIPOS[extname(destino)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(conteudo);
    } catch {
        res.statusCode = 404;
        res.end('Não encontrado');
    }
}

createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://localhost:${PORTA}`);

    if (pathname.startsWith('/api/')) {
        return tratarApi(req, res, pathname.slice(5).replace(/\/+$/, ''));
    }
    return servirEstatico(req, res, pathname);
// Só 127.0.0.1: o processo tem a service role key em memória e não deve
// ficar exposto na rede local.
}).listen(PORTA, '127.0.0.1', () => {
    console.log(`\n  Landing page → http://localhost:${PORTA}/`);
    console.log(`  Painel       → http://localhost:${PORTA}/painel\n`);
});
