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
   * WordPress REST APIへ転送
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
   * WordPressのリダイレクトを書き換え
   */
  const location = responseHeaders.get("Location");

  if (location) {
    try {
      const url = new URL(location, ORIGIN);

      if (url.hostname === "kk777.site.je") {
        url.protocol = "https:";
        url.hostname = incoming.hostname;

        responseHeaders.set(
          "Location",
          url.toString()
        );
      }
    } catch {}
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

  const contentType =
    responseHeaders.get("content-type") || "";

  /*
   * ★重要
   * REST APIのJSON内に残っている
   * kk777.site.je を pages.dev に置換する
   */
  if (
    contentType.includes("application/json") ||
    contentType.includes("+json")
  ) {
    let body = await response.text();

    body = body.replaceAll(
      "https://kk777.site.je",
      PUBLIC
    );

    body = body.replaceAll(
      "http://kk777.site.je",
      PUBLIC
    );

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }

  /*
   * HTMLの場合も置換
   */
  if (contentType.includes("text/html")) {
    let body = await response.text();

    body = body.replaceAll(
      "https://kk777.site.je",
      PUBLIC
    );

    body = body.replaceAll(
      "http://kk777.site.je",
      PUBLIC
    );

    return new Response(body, {
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
