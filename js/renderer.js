const Renderer = {
  _editMode: false,

  _mountPoint() {
    return document.getElementById('app');
  },

  async _saveFile(filePath, content) {
    const res = await fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: filePath, content })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    return data;
  },

  showLoading() {
    this._mountPoint().innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  },

  home(articles) {
    const app = this._mountPoint();
    if (!articles.length) {
      app.innerHTML = '<div class="not-found"><h2>暂无文章</h2><p>还没有发布任何文章。</p></div>';
      return;
    }

    let html = '<div class="article-grid">';
    articles.forEach(a => { html += this._card(a); });
    html += '</div>';

    if (this._editMode) {
      html += '<button class="fab-add" id="btn-new-article" title="新建文章">＋</button>';
    }

    app.innerHTML = html;

    if (this._editMode) {
      document.getElementById('btn-new-article').addEventListener('click', () => this._newArticleModal());
    }
  },

  article(meta, htmlBody, md) {
    const app = this._mountPoint();
    const date = new Date(meta.date).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const tagsHtml = meta.tags.map(t =>
      `<a href="#/tag/${encodeURIComponent(t)}" class="tag-badge">${t}</a>`
    ).join('');

    const editBtn = this._editMode
      ? `<button class="btn-edit-article" id="btn-edit-article">✎ 编辑正文</button>`
      : '';

    app.innerHTML = `
      <article class="article-page">
        <a href="#/" class="back-link">&larr; 返回首页</a>
        <header class="article-header">
          <div class="article-meta">
            <span class="card-date">${date}</span>
            <a href="#/category/${encodeURIComponent(meta.category)}" class="card-category">${meta.category}</a>
          </div>
          <h1>${meta.title}</h1>
          <div class="article-meta">${tagsHtml}</div>
          ${editBtn}
        </header>
        <div class="article-body" id="article-body">${htmlBody}</div>
        <hr>
        <a href="#/" class="back-link">&larr; 返回首页</a>
      </article>
    `;

    if (this._editMode) {
      document.getElementById('btn-edit-article').addEventListener('click', () => {
        this._articleEditMode(meta, md);
      });
    }
  },

  _articleEditMode(meta, md) {
    const body = document.getElementById('article-body');
    body.innerHTML = `
      <textarea class="edit-textarea" id="edit-md-textarea">${this._escapeHtml(md)}</textarea>
      <div class="edit-actions">
        <button class="btn-save" id="btn-save-md">保存</button>
        <button class="btn-cancel" id="btn-cancel-edit">取消</button>
      </div>
    `;

    document.getElementById('btn-save-md').addEventListener('click', async () => {
      const newMd = document.getElementById('edit-md-textarea').value;
      try {
        await this._saveFile(meta.file, newMd);
        const html = marked.parse(newMd);
        const cached = window.loader._articles.get(meta.slug);
        if (cached) { cached.md = newMd; cached.html = html; }
        window.router._resolve();
      } catch (err) {
        alert('保存失败: ' + err.message);
      }
    });

    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
      window.router._resolve();
    });
  },

  filteredList(articles, filter) {
    const app = this._mountPoint();
    const label = filter.type === 'category' ? '分类' : '标签';

    if (!articles.length) {
      app.innerHTML = `
        <div class="filtered-page">
          <a href="#/" class="back-link">&larr; 返回首页</a>
          <div class="not-found">
            <h2>无匹配文章</h2>
            <p>${label}「${filter.value}」下暂无文章。</p>
          </div>
        </div>`;
      return;
    }

    let html = `
      <div class="filtered-page">
        <a href="#/" class="back-link">&larr; 返回首页</a>
        <div class="filter-heading">
          <h2>${label}：${filter.value}</h2>
          <p class="text-muted">共 ${articles.length} 篇文章</p>
        </div>
        <div class="article-grid">`;
    articles.forEach(a => { html += this._card(a); });
    html += '</div></div>';
    app.innerHTML = html;
  },

  notFound() {
    this._mountPoint().innerHTML = `
      <div class="not-found">
        <h2>404</h2>
        <p>你要找的页面不存在。</p>
        <a href="#/" class="back-link" style="margin-top: 1rem;">&larr; 返回首页</a>
      </div>`;
  },

  _card(article) {
    const date = new Date(article.date).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const coverHtml = article.cover
      ? `<img class="card-cover" src="${article.cover}" alt="" loading="lazy">`
      : '';

    const tagsHtml = article.tags.map(t =>
      `<a href="#/tag/${encodeURIComponent(t)}" class="tag-badge" onclick="event.stopPropagation()">${t}</a>`
    ).join('');

    const editIcon = this._editMode
      ? `<button class="card-edit-btn" data-slug="${article.slug}" onclick="event.stopPropagation();Renderer._openMetaModal('${article.slug}')" title="编辑元数据">✎</button>`
      : '';

    return `
      <article class="card" data-slug="${article.slug}" onclick="router.navigate('#/article/${article.slug}')">
        ${editIcon}
        ${coverHtml}
        <div class="card-meta">
          <span class="card-date">${date}</span>
          <a href="#/category/${encodeURIComponent(article.category)}" class="card-category" onclick="event.stopPropagation()">${article.category}</a>
        </div>
        <h3 class="card-title">${article.title}</h3>
        <p class="card-excerpt">${article.excerpt}</p>
        <div class="card-tags">${tagsHtml}</div>
      </article>`;
  },

  _openMetaModal(slug) {
    const article = window.loader._index.find(a => a.slug === slug);
    if (!article) return;
    this._metaModal(article);
  },

  _metaModal(article) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>编辑文章信息</h3>
        <label>标题</label>
        <input type="text" id="meta-title" value="${this._escapeAttr(article.title)}">
        <label>日期</label>
        <input type="date" id="meta-date" value="${article.date}">
        <label>分类</label>
        <input type="text" id="meta-category" value="${this._escapeAttr(article.category)}">
        <label>标签（逗号分隔）</label>
        <input type="text" id="meta-tags" value="${this._escapeAttr(article.tags.join(', '))}">
        <label>摘要</label>
        <textarea id="meta-excerpt" rows="3">${this._escapeHtml(article.excerpt || '')}</textarea>
        <div class="edit-actions">
          <button class="btn-save" id="btn-save-meta">保存</button>
          <button class="btn-cancel" id="btn-close-modal">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { document.body.removeChild(overlay); }
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    document.getElementById('btn-save-meta').addEventListener('click', async () => {
      article.title = document.getElementById('meta-title').value.trim();
      article.date = document.getElementById('meta-date').value;
      article.category = document.getElementById('meta-category').value.trim();
      article.tags = document.getElementById('meta-tags').value.split(',').map(t => t.trim()).filter(Boolean);
      article.excerpt = document.getElementById('meta-excerpt').value.trim();

      try {
        await this._saveFile('content/index.json', JSON.stringify(window.loader._index, null, 2));
        document.body.removeChild(overlay);
        Renderer.updateNavCategories(window.loader.getCategories());
        window.router._resolve();
      } catch (err) {
        alert('保存失败: ' + err.message);
      }
    });
  },

  _newArticleModal() {
    const today = new Date().toISOString().slice(0, 10);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-lg">
        <h3>新建文章</h3>
        <label>Slug（URL 标识，英文）</label>
        <input type="text" id="new-slug" placeholder="hello-world">
        <label>标题</label>
        <input type="text" id="new-title" placeholder="文章标题">
        <label>日期</label>
        <input type="date" id="new-date" value="${today}">
        <label>分类</label>
        <input type="text" id="new-category" placeholder="技术">
        <label>标签（逗号分隔）</label>
        <input type="text" id="new-tags" placeholder="JavaScript, 前端">
        <label>摘要</label>
        <textarea id="new-excerpt" rows="2" placeholder="简短的摘要..."></textarea>
        <label>正文（Markdown）</label>
        <textarea id="new-content" rows="12" placeholder="在此撰写 Markdown 正文..."></textarea>
        <div class="edit-actions">
          <button class="btn-save" id="btn-new-save">保存</button>
          <button class="btn-cancel" id="btn-new-cancel">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { document.body.removeChild(overlay); }
    });

    document.getElementById('btn-new-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    document.getElementById('btn-new-save').addEventListener('click', async () => {
      const slug = document.getElementById('new-slug').value.trim();
      const title = document.getElementById('new-title').value.trim();
      const date = document.getElementById('new-date').value;
      const category = document.getElementById('new-category').value.trim();
      const tags = document.getElementById('new-tags').value.split(',').map(t => t.trim()).filter(Boolean);
      const excerpt = document.getElementById('new-excerpt').value.trim();
      const content = document.getElementById('new-content').value;

      if (!slug || !title) { alert('Slug 和标题为必填项'); return; }

      const newArticle = {
        slug, title, date, category, tags,
        excerpt: excerpt || content.slice(0, 150),
        cover: null,
        file: `content/articles/${slug}.md`
      };

      try {
        await this._saveFile(newArticle.file, content);
        window.loader._index.push(newArticle);
        window.loader._index.sort((a, b) => new Date(b.date) - new Date(a.date));
        await this._saveFile('content/index.json', JSON.stringify(window.loader._index, null, 2));
        Renderer.updateNavCategories(window.loader.getCategories());
        document.body.removeChild(overlay);
        window.router._resolve();
      } catch (err) {
        alert('保存失败: ' + err.message);
      }
    });
  },

  updateNavCategories(categories) {
    const nav = document.getElementById('nav-categories');
    if (!nav || !categories.length) return;
    nav.innerHTML = categories.map(c =>
      `<a href="#/category/${encodeURIComponent(c)}" data-nav="category">${c}</a>`
    ).join('');
  },

  _escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  _escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};
