import styles from './InfoPages.module.css';

export function HowToPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span>COMO JOGAR</span>
        <h1>Tome decisões e observe as consequências</h1>
        <p>Na fase 1 você define a estratégia inicial da operação e enfrenta cinco situações reais do dia a dia de uma estética automotiva.</p>
      </section>
      <section className={styles.grid}>
        <article><b>1</b><h2>Monte a base</h2><p>Escolha estrutura, equipamentos e serviço principal.</p></article>
        <article><b>2</b><h2>Resolva os desafios</h2><p>Compare as opções sem buscar uma resposta automática.</p></article>
        <article><b>3</b><h2>Leia os impactos</h2><p>Acompanhe caixa, reputação, qualidade, risco e capacidade.</p></article>
        <article><b>4</b><h2>Melhore a rodada</h2><p>Use o resultado final e o histórico para testar outra estratégia.</p></article>
      </section>
    </main>
  );
}
