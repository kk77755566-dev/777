export async function onRequest(context) {
  const url = new URL(context.request.url);

  const target = new URL(
    url.pathname + url.search,
    "http://kk777.site.je"
  );

  const request = new Request(target, context.request);

  return fetch(request);
}
