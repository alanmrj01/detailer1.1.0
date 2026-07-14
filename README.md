# Detailer Business Lab — MVP

Aplicação web educacional configurável para demonstrar a um criador de conteúdo como sua metodologia pode ser transformada em uma experiência prática de decisões para alunos de estética automotiva.

## O que está pronto

- React + Vite + TypeScript + CSS Modules.
- Tema escuro definitivo, sem alternância visual que possa gerar inconsistências.
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
  - caminho recomendado calibrado para saúde da operação alta, sem atingir o teto.
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
- Demonstração limitada a duas partidas por navegador; a terceira tentativa apresenta o convite para um piloto gratuito de 14 dias.
- Build de produção incluído em `dist/`.
- 35 testes unitários/integrados, incluindo persistência bloqueada, compatibilidade, limite da demonstração, saúde inicial visual em 0★, importação/exportação e varredura automática dos 12.636 caminhos válidos.

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

Os screenshots de referência ficam em `visual-tests/__screenshots__/` e cobrem capa, oito etapas, cinco resultados, prévia da fase 2, painel de validação, celular, modal de confirmação e feedback com queda na saúde da operação.

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
- o índice permanece absoluto entre 0 e 100;
- os caminhos atuais ocupam de 34 a 99 pontos;
- todas as quatro faixas de resultado são alcançáveis;
- a dificuldade padrão exige equilíbrio: 26,0% dos caminhos são frágeis, 52,7% instáveis, 20,7% sustentáveis e 0,6% formam uma base sólida;
- o caminho recomendado termina em 93 pontos e saúde da operação 4,4;
- saúde 4,9 continua possível, mas ocorre em apenas 2 dos 12.636 caminhos válidos;
- Fortalezas e Atenções usam os mesmos indicadores do diagnóstico principal;
- resultados exatamente com saúde 5,0 recebem orientação de manutenção do padrão;
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

Quando o visitante tenta iniciar uma terceira partida, o app envia ao contêiner:

```js
{
  type: 'detailer-business:trial-request',
  source: 'demo-limit'
}
```

A landing page pode ouvir esse evento com `window.addEventListener('message', ...)`, fechar o iframe em tela cheia e levar o visitante ao formulário do piloto de 14 dias.

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

- Dados persistidos localmente quando o navegador permite; se o armazenamento estiver bloqueado, a rodada continua em memória durante a sessão. Cada rodada guarda seu próprio snapshot de cenário.
- O limite de duas partidas é local ao navegador/aparelho e serve como mecanismo de conversão, não como bloqueio antifraude. Limpeza de dados, aba anônima ou outro dispositivo reiniciam a contagem.
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

- HUD compacto com decisão, categoria da etapa, saúde da operação e três indicadores principais.
- Painel inferior “Ver todos” para consultar os sete indicadores da operação, com tipografia maior e organização em duas colunas.
- Cena tratada como o foco narrativo: primeiro o contexto visual, depois a pergunta e somente então as escolhas.
- Informações repetidas de fase e progresso foram removidas no mobile para reduzir poluição.
- Cena, pergunta e alternativas dimensionadas para ocupar uma única tela em 390×844 e 360×800.
- Até quatro alternativas totalmente visíveis, sem rolagem do documento principal.
- Cards com título, descrição e preço maiores, melhor contraste e distribuição interna mais clara.
- Confirmação em painel inferior com apenas escolha, áreas impactadas e ações necessárias.
- Feedback prioriza a mudança na saúde da operação e três consequências principais; a análise completa fica recolhida em “Entender esta decisão”.
- Textos de apoio mais objetivos no celular, mantendo os textos configuráveis completos no desktop.
- Layout horizontal específico para celulares em 844×390, também sem rolagem.
- Cabeçalho global ocultado somente durante uma rodada mobile; capa, resultado, configurações e desktop permanecem inalterados.

A regressão visual inclui referências para a primeira decisão, quatro alternativas, indicadores expandidos, confirmação, feedback negativo e orientação horizontal.
## Compatibilidade progressiva

A versão 1.3.7 mantém o bundle moderno para aparelhos atuais e gera uma entrega alternativa para navegadores antigos. A aplicação detecta capacidades, não modelos específicos de celular.

- Fallbacks para APIs JavaScript recentes usadas pelo jogo.
- Persistência protegida contra bloqueios, modo privado, iframe e WebViews limitados.
- Continuação da partida em memória quando `localStorage` não está disponível.
- Validação e descarte seguro de partidas antigas ou corrompidas.
- Fallbacks visuais para recursos CSS recentes, mantendo contraste e estrutura.
- Build legado com polyfills carregado somente quando o navegador precisa.

A experiência moderna não é substituída pela versão antiga: navegadores atuais continuam recebendo o bundle otimizado normal.


## Refinamentos 1.3.8 — narrativa e experiência mobile

A versão 1.3.8 revisa a ligação entre as escolhas e os desafios posteriores. Referências ao serviço escolhido agora usam concordância própria, a etapa de pressão não atribui atraso ao catálogo e a reclamação seguinte considera a forma como o jogador lidou com o prazo.

No celular, a abertura foi condensada em uma promessa, um resumo e uma ação principal. Durante a rodada incorporada, a saúde da operação fica centralizada e o canto direito permanece livre para o botão de fechar da landing. A tela de consequência destaca primeiro o efeito dominante da decisão e mantém os detalhes adicionais recolhidos.

As configurações personalizadas do criador não são sobrescritas: a migração altera somente os textos padrão de versões anteriores.


## Refinamentos 1.3.9 — saúde da operação e aprendizagem técnica

A versão 1.3.9 reforça o posicionamento do produto como ferramenta de aprendizagem profissional:

- as estrelas passam a ser apresentadas como **saúde da operação**, uma síntese do equilíbrio entre caixa, reputação, qualidade, capacidade, risco e carga;
- a régua ficou mais exigente no topo sem tornar 4,9 impossível;
- uma pequena bonificação de equilíbrio só aparece quando nenhum indicador crítico fica para trás;
- escolhas diferentes distribuem seus efeitos entre indicadores coerentes com o dilema, evitando que todas pareçam alterar sempre as mesmas variáveis;
- consequências e orientações incorporam termos do universo detailer, como capital de giro, ponto de equilíbrio, tempo de ciclo, margem de contribuição, taxa de ocupação, inspeção de pintura, diluição, extração, checklist e análise de causa raiz;
- a tela de consequência foi condensada: apresenta o efeito dominante, a variação da saúde, os três impactos mais relevantes e uma única leitura técnica, evitando repetir a mesma ideia em vários blocos;
- migrações atualizam somente textos e parâmetros padrão antigos, preservando personalizações feitas pelo criador.

O objetivo da calibração não é punir o aluno, mas impedir que decisões isoladamente boas escondam fragilidades importantes. A cadeia pedagógica permanece: **contexto → decisão → impacto → leitura técnica → aplicação prática**.

## Refinamento visual 1.3.10 — medidores de impacto

A tela de consequência substitui os deltas numéricos dos três efeitos principais por medidores semicirculares compactos. A posição do ponteiro comunica se o efeito foi favorável ou desfavorável e sua intensidade relativa, sem expor números que poderiam ser interpretados como pontuação isolada.

A alteração é exclusivamente visual: cálculos, ordenação dos impactos, saúde da operação, textos e balanceamento permanecem inalterados.
