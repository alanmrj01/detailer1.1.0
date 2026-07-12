# Detailer Business Lab — MVP

Aplicação web educacional configurável para demonstrar a um criador de conteúdo como sua metodologia pode ser transformada em uma experiência prática de decisões para alunos de estética automotiva.

## O que está pronto

- React + Vite + TypeScript + CSS Modules.
- Tema claro e escuro.
- Interface responsiva para celular e desktop.
- Oito decisões encadeadas em uma simulação com duração configurável — 90 dias na configuração padrão.
- Motor determinístico com:
  - impactos em caixa, reputação, qualidade, capacidade, risco, clientes e fadiga;
  - requisitos de equipamento;
  - bloqueio de compras que violam a reserva mínima;
  - limites de indicadores entre 0 e 100;
  - rastro/auditoria de todas as decisões;
  - snapshot imutável do cenário usado em cada partida;
  - cálculo final por pesos configuráveis e régua absoluta de desempenho;
  - todas as faixas de resultado alcançáveis;
  - caminho recomendado calibrado para aproximadamente 4,5 estrelas.
- Ilustrações 3D em WebP com animações e efeitos leves para garagem, lavagem, polimento, interior, reclamação e crescimento.
- Painel protegido do criador para editar:
  - nome, método, tagline, textos, cor e logo;
  - PIN local;
  - duração, moeda, capital e indicadores iniciais;
  - preços e fontes de mercado;
  - veículos vinculados às situações, com fatores de tamanho, sujeira e segmento aplicados pelo motor;
  - todas as situações, escolhas, consequências e impactos;
  - faixas e mensagens do resultado final;
  - exportação e importação de toda a configuração em JSON.
- Build de produção incluído em `dist/`.
- 21 testes unitários/integrados, importação/exportação, varredura automática dos 12.636 caminhos válidos e regressão visual com 26 screenshots de referência.

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

### Testes visuais

Os screenshots de referência ficam em `visual-tests/__screenshots__/` e cobrem capa, oito etapas, cinco resultados, prévia da fase 2, painel de validação, celular, modal de confirmação e feedback com perda de classificação.

Na primeira execução local:

```bash
npx playwright install chromium
npm run test:visual
```

Para atualizar os screenshots somente após aprovar uma alteração visual:

```bash
npm run test:visual:update
```

Para executar toda a suíte:

```bash
npm run test:all
```


## Balanceamento e validação

A versão atual usa uma régua absoluta: cada indicador é comparado com patamares fixos de operação frágil e excelente. A nota de uma mesma operação não muda quando escolhas ou caminhos são adicionados ou removidos. Com a configuração padrão:

- 12.636 caminhos válidos são testados automaticamente;
- a régua permanece fixa entre 0 e 100 pontos;
- os caminhos atuais ocupam de 38 a 92 pontos;
- todas as quatro faixas de resultado são alcançáveis;
- a dificuldade padrão é moderada: 8,4% dos caminhos são frágeis, 49,2% instáveis, 40,2% sustentáveis e 2,2% formam uma base sólida;
- o caminho recomendado termina em 90 pontos e 4,5 estrelas;
- Fortalezas e Atenções usam os mesmos indicadores do diagnóstico principal;
- resultados exatamente com 5 estrelas recebem orientação de manutenção do padrão;
- pesos, benchmarks e faixas podem ser revisados em **Configurações → Resultados**;
- alterações no painel podem ser verificadas em **Configurações → Dados e validação**.

A mesma área permite exportar e importar a configuração em JSON, restaurar a configuração original e verificar se a distribuição voltou a ficar permissiva demais. Cada partida preserva o cenário com que começou; mudanças feitas no painel passam a valer somente em novas rodadas.

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

- Dados salvos apenas no `localStorage` do navegador; cada rodada guarda seu próprio snapshot de cenário.
- Não possui login de alunos, checkout, certificados ou painel remoto.
- O PIN não é segurança real.
- Valores de serviços são hipóteses educacionais configuráveis; não são apresentados como média nacional.
- As ilustrações são assets WebP locais com efeitos CSS leves e não dependem de carregamento externo.

## Próxima evolução comercial recomendada

- Supabase Auth, Postgres, Storage e RLS.
- Perfis separados de criador e aluno.
- Configuração por parceiro no banco.
- Webhook Hotmart/Kiwify para liberar e revogar acesso.
- Histórico de alunos e analytics de conclusão.
- Editor de novos cenários e publicação versionada entre parceiros e alunos.
- Domínios e identidade por criador.


## Abrir no StackBlitz

O ZIP desta versão foi preparado com o `package.json` diretamente na raiz, dependências fixadas e `package-lock.json` usando o registro público do npm.

1. Importe o arquivo ZIP no StackBlitz.
2. No terminal, execute `npm install`.
3. Depois execute `npm run dev`.
4. Confirme que `package.json` aparece na raiz do explorador antes de executar os comandos.

Requisitos: Node.js 18.18 ou superior.

## Modo de jogo para celular

Durante as oito decisões, telas de celular passam a usar uma interface própria de jogo, sem alterar o layout desktop:

- HUD compacto com decisão, categoria da etapa, classificação e três indicadores principais.
- Painel inferior “Ver todos” para consultar os sete indicadores da operação, com tipografia maior e organização em duas colunas.
- Cena tratada como o foco narrativo: primeiro o contexto visual, depois a pergunta e somente então as escolhas.
- Informações repetidas de fase e progresso foram removidas no mobile para reduzir poluição.
- Cena, pergunta e alternativas dimensionadas para ocupar uma única tela em 390×844 e 360×800.
- Até quatro alternativas totalmente visíveis, sem rolagem do documento principal.
- Cards com título, descrição e preço maiores, melhor contraste e distribuição interna mais clara.
- Confirmação em painel inferior com apenas escolha, áreas impactadas e ações necessárias.
- Feedback prioriza a mudança de classificação e três consequências principais; a análise completa fica recolhida em “Entender esta decisão”.
- Textos de apoio mais objetivos no celular, mantendo os textos configuráveis completos no desktop.
- Layout horizontal específico para celulares em 844×390, também sem rolagem.
- Cabeçalho global ocultado somente durante uma rodada mobile; capa, resultado, configurações e desktop permanecem inalterados.

A regressão visual inclui referências para a primeira decisão, quatro alternativas, indicadores expandidos, confirmação, feedback negativo e orientação horizontal.
