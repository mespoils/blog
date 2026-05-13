(async function () {
  const loader = new DataLoader();
  const router = new Router();

  Renderer.showLoading();

  try {
    await loader.loadIndex();
  } catch (err) {
    Renderer.notFound();
    console.error('加载文章索引失败:', err);
    return;
  }

  Renderer.updateNavCategories(loader.getCategories());

  router.addRoute('^#/?$', () => {
    Renderer.home(loader._index);
  });

  router.addRoute('^#/article/(.+)$', async (slug) => {
    Renderer.showLoading();
    try {
      const article = await loader.loadArticle(decodeURIComponent(slug));
      if (!article) { Renderer.notFound(); return; }
      Renderer.article(article.meta, article.html, article.md);
    } catch (err) {
      Renderer.notFound();
      console.error('加载文章失败:', err);
    }
  });

  router.addRoute('^#/category/(.+)$', (cat) => {
    const articles = loader.filterByCategory(decodeURIComponent(cat));
    Renderer.filteredList(articles, { type: 'category', value: decodeURIComponent(cat) });
  });

  router.addRoute('^#/tag/(.+)$', (tag) => {
    const articles = loader.filterByTag(decodeURIComponent(tag));
    Renderer.filteredList(articles, { type: 'tag', value: decodeURIComponent(tag) });
  });

  window.loader = loader;
  window.router = router;

  router.start();

  // 暗色模式
  const themeToggle = document.getElementById('theme-toggle');
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') {
    document.documentElement.classList.add('dark');
    themeToggle.textContent = '☀';
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    themeToggle.textContent = isDark ? '☀' : '☽';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

  // 编辑模式
  const editToggle = document.getElementById('edit-toggle');
  const editStored = sessionStorage.getItem('editMode');
  if (editStored === 'on') {
    Renderer._editMode = true;
    editToggle.classList.add('active');
    editToggle.textContent = '✎ 退出编辑';
  }

  editToggle.addEventListener('click', () => {
    Renderer._editMode = !Renderer._editMode;
    if (Renderer._editMode) {
      editToggle.classList.add('active');
      editToggle.textContent = '✎ 退出编辑';
      sessionStorage.setItem('editMode', 'on');
    } else {
      editToggle.classList.remove('active');
      editToggle.textContent = '✎ 编辑';
      sessionStorage.removeItem('editMode');
    }
    router._resolve();
  });
})();
