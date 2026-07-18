# Pesquisa de mercado — base do MVP

Data principal de consulta: 08/07/2026.

## Método

Para cada equipamento apresentado como compra no jogo foram registradas seis ofertas públicas. O valor inicial usado no simulador é a **média aritmética simples** das seis ofertas. Essa opção foi escolhida porque foi solicitada como regra do MVP; para uma versão comercial, recomenda-se avaliar mediana, remoção de ofertas indisponíveis e separação por voltagem/frete.

Todos os registros estão também dentro de `src/data/defaultConfig.ts` e podem ser editados no painel do criador.

## Médias

| Equipamento | Ofertas usadas | Média inicial |
|---|---:|---:|
| WAP Ousada Plus 2200 | 6 | R$ 701,57 |
| WAP GTW 10 | 6 | R$ 286,78 |
| Kers RS 15 mm 900 W | 6 | R$ 899,95 |
| WAP Spot Cleaner W2 | 6 | R$ 636,42 |

## Observações importantes

- Preços podem variar por voltagem, vendedor parceiro, cupom, forma de pagamento, frete e disponibilidade.
- Uma oferta promocional ou um valor fora da curva influencia a média aritmética.
- O produto sinaliza essas informações como referência educacional e permite atualizar fontes e recalcular a média.
- Valores de serviços prestados no cenário são hipóteses pedagógicas configuráveis, não uma pesquisa nacional de preço de serviços.

## Veículos

Foram usados nomes reais e familiares ao mercado brasileiro: Volkswagen Polo e T-Cross, Fiat Argo e Strada, Chevrolet Onix, Hyundai HB20 e Creta. A seleção foi orientada pelos relatórios de modelos mais vendidos da Fenabrave e pelo balanço do primeiro semestre de 2026.

Fontes de referência:

- https://www.fenabrave.org.br/relatorios/rel_MaisVendidos.asp
- https://www.fenabrave.org.br/portalv2/Conteudo/emplacamentos
- https://motor1.uol.com.br/news/800605/vendas-primeiro-semestre-carros-2026/

## Fontes completas dos equipamentos

As 24 URLs e seus respectivos preços estão disponíveis no painel **Configurações → Mercado e veículos** e em `src/data/defaultConfig.ts`. Isso permite auditar e substituir qualquer oferta sem alterar o motor do jogo.

## Atualização econômica dinâmica — julho de 2026

A versão 4.4 deixa de tratar o preço dos desafios como números isolados. O motor utiliza uma base nacional conservadora e aplica fatores de porte do veículo, estrutura escolhida e posicionamento de preço.

Bases pedagógicas centrais usadas no motor:

- lavagem detalhada: R$ 160 para veículo pequeno antes dos fatores;
- polimento comercial: R$ 520;
- higienização interna: R$ 420;
- pacote combinado de lavagem e cuidados internos: R$ 540.

Essas bases foram mantidas dentro das faixas observadas em operações brasileiras com preços públicos. Exemplos consultados em julho de 2026:

- Beck Estética Automotiva: lavagem detalhada a partir de R$ 80, higienização a partir de R$ 400 e polimento comercial a partir de R$ 500 — https://www.beckauto.com.br/
- Start Clean: higienização de R$ 400 a R$ 550 e polimento comercial de R$ 450 a R$ 750 conforme o porte — https://www.lojastartclean.com.br/
- PantherBlack: lavagem detalhada por R$ 150 e polimento a partir de R$ 450 — https://esteticapantherblack.com.br/
- Nitro Estética: lavagem detalhada por R$ 99,90 e higienização completa por R$ 449,90 — https://www.nitroestetica.com.br/
- GestLav, referência Brasil 2026: lavagem técnica de R$ 120 a R$ 250, higienização de R$ 250 a R$ 700 e polimento comercial de R$ 400 a R$ 1.200 — https://gestlav.com.br/artigo?id=6

O preço final não copia uma única empresa. Ele combina essas faixas com o contexto da partida. Desconto, retrabalho, atraso, campanha, treinamento e apoio operacional passam a reutilizar o ticket realmente calculado ou o perfil da operação, evitando contradições entre texto e caixa.
