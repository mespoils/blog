class Router {
  constructor() {
    this.routes = [];
    window.addEventListener('hashchange', () => this._resolve());
  }

  addRoute(pattern, handler) {
    this.routes.push({ pattern: new RegExp(pattern), handler });
  }

  navigate(hash) {
    window.location.hash = hash;
  }

  start() {
    this._resolve();
  }

  _resolve() {
    const hash = window.location.hash || '#/';

    for (const route of this.routes) {
      const match = hash.match(route.pattern);
      if (match) {
        route.handler(...match.slice(1));
        return;
      }
    }

    Renderer.notFound();
  }
}
