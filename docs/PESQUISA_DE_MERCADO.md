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
