(() => {
  'use strict';

  const storageKey = 'haus_console_state_v1';
  const nativeFetch = window.fetch.bind(window);

  const emptyState = () => ({
    nervMode: null,
    pulse: null,
    actions: [],
    tasks: [],
  });

  const readState = () => {
    try {
      return { ...emptyState(), ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
    } catch (_) {
      return emptyState();
    }
  };

  const writeState = (state) => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  };

  const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

  const requestBody = async (input, init) => {
    const body = init?.body ?? (input instanceof Request ? await input.clone().text() : null);
    return body ? JSON.parse(body) : {};
  };

  window.fetch = async (input, init = {}) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input, window.location.href);
    if (requestUrl.origin !== window.location.origin || !requestUrl.pathname.startsWith('/api/')) {
      return nativeFetch(input, init);
    }

    const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const path = requestUrl.pathname;
    const state = readState();

    try {
      if (method === 'GET' && path === '/api/state') {
        return jsonResponse(state);
      }

      const body = await requestBody(input, init);

      if (method === 'POST' && path === '/api/pulse') {
        state.pulse = body;
      } else if (method === 'POST' && path === '/api/action') {
        state.actions.unshift(body);
      } else if (method === 'POST' && path === '/api/tasks') {
        state.tasks.push({ ...body, id: body.id || crypto.randomUUID() });
      } else if (method === 'POST' && path === '/api/tasks/move') {
        const task = state.tasks.find((item) => item.id === body.id);
        if (task) task.status = body.status;
      } else if (method === 'POST' && path === '/api/tasks/delete') {
        state.tasks = state.tasks.filter((item) => item.id !== body.id);
      } else {
        return jsonResponse({ error: 'Not found' }, 404);
      }

      writeState(state);
      return jsonResponse({ ok: true });
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  };
})();
