const ORIGIN = "https://kk777.site.je";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);

  const target = new URL(
    incoming.pathname + incoming.search,
    ORIGIN
  );

  /*
   * CORS preflight
   *
   * ブラウザから OPTIONS が来た場合は、
   * Pages側で直接OKを返す。
   */
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": incoming.origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods":
          "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, X-WP-Nonce, X-HTTP-Method-Override, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  /*
   * リクエストヘッダーをWordPressへ転送
   */
  const headers = new Headers(context.request.headers);

  // Pages側のHostは送らない
  headers.delete("host");

  // WordPressにHTTPSとして認識させる
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Forwarded-Host", incoming.host);

  /*
   * Cookie / X-WP-Nonce / Authorization は
   * context.request.headersからそのまま引き継ぐ
   */

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

  /*
   * WordPressからのリダイレクトを書き換える
   */
  const location = responseHeaders.get("Location");

  if (location) {
    try {
      const redirectUrl = new URL(location, ORIGIN);

      if (redirectUrl.hostname === "kk777.site.je") {
        redirectUrl.protocol = incoming.protocol;
        redirectUrl.host = incoming.host;

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
   *
   * WordPressのログインCookieをPages側で利用するため。
   */
  const cookies = responseHeaders.getSetCookie?.();

  if (cookies && cookies.length > 0) {
    responseHeaders.delete("Set-Cookie");

    for (const cookie of cookies) {
      responseHeaders.append(
        "Set-Cookie",
        cookie.replace(/;\s*Domain=[^;]+/i, "")
      );
    }
  }

  /*
   * 念のためPages側のCORSヘッダーを設定
   */
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
    "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  responseHeaders.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-WP-Nonce, X-HTTP-Method-Override, Authorization"
  );

  /*
   * HTMLだけWordPressのURLを書き換える
   */
  const contentType =
    responseHeaders.get("content-type") || "";

  if (contentType.includes("text/html")) {
    let html = await response.text();

    const publicOrigin = incoming.origin;

    html = html.replaceAll(
      ORIGIN,
      publicOrigin
    );

    html = html.replaceAll(
      "http://kk777.site.je",
      publicOrigin
    );

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }

  /*
   * JSON / REST API / CSS / JS / 画像など
   */
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
