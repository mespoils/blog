class DataLoader {
  constructor() {
    this._index = null;
    this._articles = new Map();
  }

  async loadIndex() {
    if (this._index) return this._index;
    const res = await fetch('content/index.json');
    if (!res.ok) throw new Error(`无法加载文章索引: ${res.status}`);
    this._index = await res.json();
    this._index.sort((a, b) => new Date(b.date) - new Date(a.date));
    return this._index;
  }

  async loadArticle(slug) {
    const cached = this._articles.get(slug);
    if (cached) return cached;

    const meta = this._index.find(a => a.slug === slug);
    if (!meta) return null;

    const res = await fetch(meta.file);
    if (!res.ok) throw new Error(`无法加载文章: ${res.status}`);
    const md = await res.text();
    const html = marked.parse(md);

    const article = { meta, html, md };
    this._articles.set(slug, article);
    return article;
  }

  getCategories() {
    return [...new Set(this._index.map(a => a.category))];
  }

  getTags() {
    return [...new Set(this._index.flatMap(a => a.tags))];
  }

  filterByCategory(cat) {
    return this._index.filter(a => a.category === cat);
  }

  filterByTag(tag) {
    return this._index.filter(a => a.tags.includes(tag));
  }
}
