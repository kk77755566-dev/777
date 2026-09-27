const ORIGIN = "https://kk777.site.je";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);

  const target = new URL(
    "/wp-json/" +
      incoming.pathname.replace(/^\/wp-json\/?/, "") +
      incoming.search,
    ORIGIN
  );

  const headers = new Headers(context.request.headers);

  headers.delete("host");
  headers.set("X-Forwarded-Proto", "https");

  const request = new Request(target, {
    method: context.request.method,
    headers,
    body: ["GET", "HEAD"].includes(context.request.method)
      ? undefined
      : context.request.body,
    redirect: "manual",
  });

  const response = await fetch(request);

  const responseHeaders = new Headers(response.headers);

  const location = responseHeaders.get("Location");

  if (location) {
    try {
      const url = new URL(location, ORIGIN);

      if (url.hostname === "kk777.site.je") {
        url.hostname = incoming.hostname;
        url.protocol = incoming.protocol;
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
