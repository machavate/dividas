# Livro de Dívidas — PWA

App tipo caderno de fiado: registar devedores, valores, datas, pagamentos parciais e enviar lembretes por WhatsApp com um toque. Login por loja (Firebase), assinatura de 399 MZN/mês com aprovação manual de comprovativo.

## O que já está pronto
- Ecrã de login/registo por loja (e-mail + senha)
- Lista de devedores com saldo total, busca, e ficha por devedor
- Registo de pagamentos parciais e histórico
- Botão "Enviar lembrete no WhatsApp" (abre o WhatsApp com a mensagem já escrita)
- Ecrã de assinatura: dados de pagamento (M-Pesa/e-Mola), upload de comprovativo, estado (teste/ativo/pendente/expirado)
- `admin.html`: painel simples para você aprovar/rejeitar comprovativos e ativar a assinatura da loja
- PWA instalável (funciona como app no ecrã inicial, Android e iPhone)

## Sobre o lembrete de WhatsApp — importante
O WhatsApp **não permite** enviar mensagens automaticamente sem custo, isso exige a API oficial paga da Meta (WhatsApp Business API), com aprovação de negócio e custo por mensagem. O que construí é o caminho gratuito e mais usado: o botão abre o WhatsApp já com o número e a mensagem escritos — falta só tocar em "Enviar". Se no futuro quiser o envio 100% automático (ex: todo dia 1 do mês, sem ninguém tocar em nada), posso integrar a API paga da Meta depois — é um projeto à parte.

## Sobre a cobrança dos 399 MZN/mês
Também não integrei M-Pesa/e-Mola automaticamente (isso exige acordo comercial com a Vodacom/Movitel). Ficou como você pediu: a loja transfere manualmente, envia o comprovativo (foto + referência) dentro da app, e você aprova em `admin.html`, o que liberta mais 30 dias de acesso.

## Passo a passo para pôr a funcionar (± 20-30 min)

### 1. Criar o projeto Firebase (grátis)
1. Aceda a https://console.firebase.google.com → **Adicionar projeto**
2. Dentro do projeto: **Build → Authentication → Sign-in method** → ative **E-mail/Senha**
3. **Build → Firestore Database** → Criar base de dados → modo produção
4. **Build → Storage** → Ativar
5. Vá a **Definições do projeto** (ícone ⚙️) → **As suas apps** → clique no ícone **Web `</>`** → registe a app → copie o objeto `firebaseConfig`

### 2. Configurar o código
Abra `firebase-config.js` e cole a sua configuração, e o seu e-mail de administrador:
```js
export const firebaseConfig = { ...cole aqui... };
export const ADMIN_EMAILS = ["oseuemail@gmail.com"];
```
Faça o mesmo e-mail em `firestore.rules`, na linha `request.auth.token.email in [...]`.

### 3. Publicar as regras de segurança
No Firebase Console → Firestore Database → separador **Regras** → cole o conteúdo de `firestore.rules` → Publicar.
Faça o mesmo em Storage → Regras → conteúdo de `storage.rules`.

### 4. Colocar o site no ar (grátis)
A forma mais simples é o **Firebase Hosting**:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # escolha este projeto, pasta pública = esta pasta, SPA = não
firebase deploy
```
Vai receber um link tipo `https://seu-projeto.web.app` — é esse link que envia aos clientes pelo WhatsApp/Instagram.

Alternativas igualmente grátis: Vercel ou Netlify (basta arrastar a pasta).

### 5. Testar
- Abra o link no telemóvel → **Criar conta** → cria a loja com 7 dias grátis
- Adicione um devedor com um número de WhatsApp válido → abra a ficha dele → teste o botão de lembrete
- No seu próprio e-mail de admin, abra `/admin.html` para ver o painel de aprovação de comprovativos

### 6. Instalar como app (sem loja de apps)
- **Android (Chrome):** menu ⋮ → "Instalar aplicação"
- **iPhone (Safari):** botão Partilhar → "Adicionar ao ecrã principal"
Fica com ícone próprio, abre em ecrã inteiro, como uma app normal.

## Ficheiros
```
index.html          → ecrãs da app
style.css            → visual (tema "caderno de contabilidade")
app.js                → toda a lógica (login, devedores, pagamentos, WhatsApp, assinatura)
firebase-config.js  → suas chaves do Firebase (edite este)
admin.html            → painel de aprovação de comprovativos
manifest.json + sw.js → tornam a app instalável/PWA
firestore.rules / storage.rules → segurança dos dados
icons/                → ícones do app
```

## Possíveis melhorias futuras
- Lembretes automáticos agendados (exige WhatsApp Business API paga)
- Múltiplos utilizadores por loja (ex: dono + funcionário)
- Gráficos de dívida por mês
- Exportar lista de devedores em PDF/Excel
