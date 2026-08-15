// GET /api/config — entrega ao painel os dados públicos do Supabase.
// Só URL e anon key: ambas são públicas por design e protegidas por RLS.
// Existe pra que nenhuma chave fique escrita no HTML do repositório.

export default function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        return res.status(500).json({ erro: 'Servidor não configurado' });
    }

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ url, anonKey });
}
