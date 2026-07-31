import type { PublicArticleCard } from "../lib/public-articles";

type ArticleLibraryProps = {
  articles: PublicArticleCard[];
};

export function ArticleLibrary({ articles }: ArticleLibraryProps) {
  if (articles.length === 0) {
    return <p className="article-empty-state">Pierwsze artykuły pojawią się wkrótce.</p>;
  }

  return (
    <div className="article-grid">
      {articles.map((article) => (
        <a className="article-card" href={`/articles/${article.slug}`} key={article.slug}>
          <p>{article.category}</p>
          <h3>{article.title}</h3>
          <span>{article.excerpt}</span>
        </a>
      ))}
    </div>
  );
}
