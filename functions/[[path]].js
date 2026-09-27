const ORIGIN = "https://kk777.site.je";
const PUBLIC = "https://777keiba-jp.pages.dev";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);

  /*
   * CORS preflight
   */
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": PUBLIC,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods":
          "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, X-WP-Nonce, Authorization",
      },
    });
  }

  /*
   * WordPress側へ転送
   */
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

  /*
   * CORS
   */
  responseHeaders.set(
    "Access-Control-Allow-Origin",
    PUBLIC
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

  /*
   * Redirectを書き換える
   */
  const location = responseHeaders.get("Location");

  if (location) {
    try {
      const redirectUrl = new URL(location, ORIGIN);

      if (redirectUrl.hostname === "kk777.site.je") {
        redirectUrl.protocol = "https:";
        redirectUrl.hostname = "777keiba-jp.pages.dev";

        responseHeaders.set(
          "Location",
          redirectUrl.toString()
        );
      }
    } catch {
      // そのまま
    }
  }

  /*
   * CookieのDomainを削除
   */
  const cookies = responseHeaders.getSetCookie?.();

  if (cookies?.length) {
    responseHeaders.delete("Set-Cookie");

    for (const cookie of cookies) {
      responseHeaders.append(
        "Set-Cookie",
        cookie.replace(/;\s*Domain=[^;]+/i, "")
      );
    }
  }

  /*
   * HTML内のURLを書き換える
   */
  const contentType =
    responseHeaders.get("content-type") || "";

  if (contentType.includes("text/html")) {
    let html = await response.text();

    html = html.replaceAll(
      ORIGIN,
      PUBLIC
    );

    html = html.replaceAll(
      "http://kk777.site.je",
      PUBLIC
    );

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
