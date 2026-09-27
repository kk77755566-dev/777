const ORIGIN = "https://kk777.site.je";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);

  const target = new URL(
    incoming.pathname + incoming.search,
    ORIGIN
  );

  const headers = new Headers(context.request.headers);

  headers.delete("host");
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Forwarded-Host", incoming.host);

  const method = context.request.method;

  const request = new Request(target, {
    method,
    headers,
    body: ["GET", "HEAD"].includes(method)
      ? undefined
      : context.request.body,
    redirect: "manual",
  });

  const response = await fetch(request);

  const responseHeaders = new Headers(response.headers);

  responseHeaders.set(
    "Access-Control-Allow-Origin",
    incoming.origin
  );

  responseHeaders.set(
    "Access-Control-Allow-Credentials",
    "true"
  );

  responseHeaders.set(
    "Access-Control-Allow-Methods",
    "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  responseHeaders.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-WP-Nonce, Authorization"
  );

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: responseHeaders,
    });
  }

  const location = responseHeaders.get("Location");

  if (location) {
    try {
      const url = new URL(location, ORIGIN);

      if (url.hostname === "kk777.site.je") {
        url.protocol = "https:";
        url.host = incoming.host;

        responseHeaders.set("Location", url.toString());
      }
    } catch {}
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
