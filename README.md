# Abra Seu Restaurante — H2 Consultoria

Landing page de captação para a consultoria de abertura de restaurantes da Heloísa Duarte,
com registro de leads no Supabase e painel para acompanhamento.

## Estrutura

```
index.html          Landing page (HTML/CSS/JS puro, sem build)
painel.html         Painel de leads, protegido por login do Supabase
api/leads.js        POST — grava o lead (roda no servidor, usa service role key)
api/config.js       GET  — entrega URL + anon key ao painel
supabase/schema.sql Tabela de leads e políticas de RLS
```

Não há etapa de build: a Vercel serve os HTML como estáticos e transforma
`api/*.js` em funções serverless automaticamente.

## Como o lead é capturado

Ao enviar o formulário, a página faz duas coisas na mesma ação:

1. `POST /api/leads` com `keepalive`, que grava no Supabase.
2. Abre o WhatsApp da Heloísa com a mensagem pré-preenchida.

A gravação não usa `await` de propósito — o `window.open` precisa acontecer ainda
dentro do clique, senão o navegador bloqueia o popup. Se a API falhar, o contato
pelo WhatsApp acontece do mesmo jeito.

## Configuração

### 1. Supabase

1. Crie o projeto em [supabase.com](https://supabase.com).
2. Rode `supabase/schema.sql` no SQL Editor.
3. Em **Authentication > Users**, crie o usuário da Heloísa (email + senha).
   Só quem tem login enxerga os leads.
4. Copie os valores de **Project Settings > API**.

A tabela fica com RLS ligada e **sem** política de insert: nada grava direto do
browser. A escrita passa só pela função `/api/leads`, que usa a service role key.

### 2. Vercel

Em **Settings > Environment Variables**, configure:

| Variável | Onde encontrar | Exposição |
|---|---|---|
| `SUPABASE_URL` | Project Settings > API > Project URL | pública |
| `SUPABASE_ANON_KEY` | Project Settings > API > anon public | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings > API > service_role | **secreta** |

A service role key ignora RLS. Ela existe apenas como variável de ambiente do
servidor e nunca é enviada ao browser.

## Desenvolvimento local

As rotas `/api` precisam do runtime da Vercel para funcionar:

```bash
npm i -g vercel
vercel dev
```

Copie `.env.example` para `.env.local` e preencha os valores.

Abrir o `index.html` direto no navegador também funciona para ajustes visuais —
só o registro do lead fica indisponível (o WhatsApp continua abrindo).
