# Distrito Geek

Catálogo independente da Distrito Geek para anúncios do Mercado Livre, Shopee e outros marketplaces. Não possui integração ou compartilhamento de autenticação com o FlowOps.

## Desenvolvimento

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

Use `npm run dev:netlify` para testar Functions e Netlify Blobs localmente.

## Administração

O painel fica em `/admin`. Configure no Netlify:

- `ADMIN_EMAIL`: e-mail permitido.
- `ADMIN_PASSWORD_HASH`: `salt:hash` gerado com `crypto.scryptSync(password, salt, 64)`.
- `SESSION_SECRET`: valor aleatório com pelo menos 32 bytes.
- `CONTACT_EMAIL`: endereço público de contato.

As credenciais nunca devem ser adicionadas ao repositório. O painel aceita cadastro manual e importação CSV/XLS com pré-visualização.

## Catálogo inicial

`npm run import:seed -- caminho/planilha.csv` recria `src/data/catalog.seed.json`. A importação fornecida resultou em 36 anúncios ativos e um pausado; os dois registros `Qa Codex` foram ignorados.

## Deploy e rollback

```bash
npm run build
npx netlify deploy --prod --dir=dist --functions=netlify/functions
```

O histórico de deploys do Netlify mantém as versões anteriores. Para rollback, abra **Deploys**, selecione a versão estável anterior e use **Publish deploy**.

O domínio próprio só deve ser conectado depois de confirmar os registros DNS que pertencem exclusivamente à Distrito Geek.
