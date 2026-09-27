const ORIGIN = "https://kk777.site.je";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);

  // Pages側へのアクセスをWordPress側へ転送
  const target = new URL(
    incoming.pathname + incoming.search,
    ORIGIN
  );

  const headers = new Headers(context.request.headers);

  // Pages側のHostはWordPressへ送らない
  headers.delete("host");

  // WordPressにHTTPSとして認識させる
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Forwarded-Host", incoming.host);

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

  // WordPressからのリダイレクトを書き換える
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

  // CookieのDomainを削除
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

  const contentType =
    responseHeaders.get("content-type") || "";

  /*
   * HTMLの場合
   *
   * WordPressがHTML内に
   * https://kk777.site.je/wp-json/
   * などを書き込んでいるため、
   * Pages側URLへ置換する。
   */
  if (contentType.includes("text/html")) {
    let html = await response.text();

    const publicOrigin = incoming.origin;

    // WordPress本体URL
    html = html.replaceAll(
      ORIGIN,
      publicOrigin
    );

    // REST API URL
    html = html.replaceAll(
      ORIGIN + "/wp-json",
      publicOrigin + "/wp-json"
    );

    // 念のためhttp版も置換
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

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
