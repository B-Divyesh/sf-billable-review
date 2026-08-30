self.addEventListener('message', async event => {
  try {
    const response = await fetch(event.data, { method: 'HEAD', redirect: 'manual', cache: 'no-store' });
    self.postMessage({ status: response.status, type: response.type, ok: response.ok });
  } catch {
    self.postMessage(null);
  }
});
