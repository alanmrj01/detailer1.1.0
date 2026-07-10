# Detailer Business Lab — MVP

Aplicação web educacional configurável para demonstrar a um criador de conteúdo como sua metodologia pode ser transformada em uma experiência prática de decisões para alunos de estética automotiva.

## O que está pronto

- React + Vite + TypeScript + CSS Modules.
- Tema claro e escuro.
- Interface responsiva para celular e desktop.
- Sete decisões encadeadas nos primeiros 90 dias de uma estética automotiva.
- Motor determinístico com:
  - impactos em caixa, reputação, qualidade, capacidade, risco, clientes e fadiga;
  - requisitos de equipamento;
  - bloqueio de compras que violam a reserva mínima;
  - limites de indicadores entre 0 e 100;
  - rastro/auditoria de todas as decisões;
  - cálculo final por pesos configuráveis.
- Animações CSS dinâmicas de garagem, lavagem, polimento, interior, reclamação e crescimento.
- Painel protegido do criador para editar:
  - nome, método, textos, cor e logo;
  - PIN local;
  - capital e indicadores iniciais;
  - preços e fontes de mercado;
  - veículos;
  - todas as situações, escolhas, consequências e impactos;
  - faixas e mensagens do resultado final;
  - exportação e importação de toda a configuração em JSON.
- Build de produção incluído em `dist/`.
- Testes de regressão do motor de decisões.

## Acesso do criador

PIN inicial do MVP: `2468`

> A proteção é local e serve apenas para apresentação. Para a versão comercial, substitua por Supabase Auth + RLS e armazenamento remoto por parceiro.

## Executar

```bash
npm install
npm run dev
```

Abrir: `http://localhost:5173`

## Testar e gerar produção

```bash
npm run test
npm run build
```

## Uso em iframe

Depois de publicar a pasta `dist` em Vercel, Netlify ou Cloudflare Pages:

```html
<iframe
  src="https://seu-app.vercel.app"
  title="Detailer Business Lab"
  width="100%"
  height="860"
  style="border: 0; border-radius: 24px;"
  loading="lazy"
  allow="fullscreen"
></iframe>
```

A hospedagem precisa permitir incorporação. Não configure `X-Frame-Options: DENY` nem uma CSP `frame-ancestors` que bloqueie o domínio da landing page.

## Pesquisa de mercado embutida

Os quatro equipamentos possuem seis fontes de preço cada, com varejista, preço, data de consulta e URL, acessíveis em **Configurações → Mercado e veículos**. O preço usado pelo jogo é a média aritmética das fontes e pode ser recalculado no painel.

Equipamentos pesquisados:

1. WAP Ousada Plus 2200 — média inicial R$ 701,57.
2. WAP GTW 10 — média inicial R$ 286,78.
3. Kers RS 15 mm 900 W — média inicial R$ 899,95.
4. WAP Spot Cleaner W2 — média inicial R$ 636,42.

Os preços variam com voltagem, vendedor, promoções, frete e data. Eles são uma referência educacional, não uma cotação permanente. O criador pode atualizar as fontes e recalcular a média.

## Veículos

A configuração inicial usa modelos familiares ao público brasileiro: Volkswagen Polo e T-Cross, Fiat Argo e Strada, Chevrolet Onix, Hyundai HB20 e Creta. A seleção foi orientada por rankings recentes de emplacamentos da Fenabrave e pode ser alterada integralmente no painel.

## Estrutura principal

```text
src/
├── app/                  # Shell da aplicação
├── components/           # Cabeçalho, métricas e animações
├── context/              # Configuração persistente
├── data/                 # Configuração padrão e fontes pesquisadas
├── features/
│   ├── game/             # Motor, telas e testes da simulação
│   └── settings/         # Painel modular do criador
├── types/                # Contratos TypeScript
├── utils/                # Storage, formatação e validação
└── styles/               # Tema global
```

## Limites intencionais do MVP

- Dados salvos apenas no `localStorage` do navegador.
- Não possui login de alunos, checkout, certificados ou painel remoto.
- O PIN não é segurança real.
- Valores de serviços são hipóteses educacionais configuráveis; não são apresentados como média nacional.
- As animações são vetoriais/CSS, sem uso de imagens de terceiros.

## Próxima evolução comercial recomendada

- Supabase Auth, Postgres, Storage e RLS.
- Perfis separados de criador e aluno.
- Configuração por parceiro no banco.
- Webhook Hotmart/Kiwify para liberar e revogar acesso.
- Histórico de alunos e analytics de conclusão.
- Editor de novos cenários e publicação versionada.
- Domínios e identidade por criador.


## Abrir no StackBlitz

O ZIP desta versão foi preparado com o `package.json` diretamente na raiz, dependências fixadas e `package-lock.json` usando o registro público do npm.

1. Importe o arquivo ZIP no StackBlitz.
2. No terminal, execute `npm install`.
3. Depois execute `npm run dev`.
4. Confirme que `package.json` aparece na raiz do explorador antes de executar os comandos.

Requisitos: Node.js 18.18 ou superior.
