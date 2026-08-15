// POST /api/leads — grava um lead no Supabase.
// Roda só no servidor: a service role key nunca chega ao browser.

const LIMITES = {
    nome: 120,
    whatsapp: 40,
    email: 160,
    conceito: 2000,
    fase: 40,
    origem: 120,
    referrer: 500,
    user_agent: 500,
};

function limpar(valor, max) {
    if (typeof valor !== 'string') return null;
    const texto = valor.trim().slice(0, max);
    return texto.length ? texto : null;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        console.error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
        return res.status(500).json({ erro: 'Servidor não configurado' });
    }

    const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
    if (!body) return res.status(400).json({ erro: 'Corpo inválido' });

    // Honeypot: bots preenchem tudo. Respondemos ok pra não sinalizar o bloqueio.
    if (limpar(body.website, 100)) return res.status(200).json({ ok: true });

    const lead = {
        nome: limpar(body.nome, LIMITES.nome),
        whatsapp: limpar(body.whatsapp, LIMITES.whatsapp),
        email: limpar(body.email, LIMITES.email),
        conceito: limpar(body.conceito, LIMITES.conceito),
        fase: limpar(body.fase, LIMITES.fase),
        origem: limpar(body.origem, LIMITES.origem),
        referrer: limpar(body.referrer, LIMITES.referrer),
        user_agent: limpar(req.headers['user-agent'], LIMITES.user_agent),
    };

    if (!lead.nome || !lead.whatsapp) {
        return res.status(400).json({ erro: 'Nome e WhatsApp são obrigatórios' });
    }

    try {
        const resposta = await fetch(`${url}/rest/v1/leads`, {
            method: 'POST',
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify(lead),
        });

        if (!resposta.ok) {
            const detalhe = await resposta.text();
            console.error('Supabase recusou o insert:', resposta.status, detalhe);
            return res.status(502).json({ erro: 'Não foi possível registrar o lead' });
        }

        return res.status(201).json({ ok: true });
    } catch (erro) {
        console.error('Falha ao chamar o Supabase:', erro);
        return res.status(502).json({ erro: 'Não foi possível registrar o lead' });
    }
}

function safeParse(texto) {
    try {
        return JSON.parse(texto);
    } catch {
        return null;
    }
}
