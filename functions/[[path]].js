const ORIGIN = "https://kk777.site.je";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);

  const target = new URL(
    incoming.pathname + incoming.search,
    ORIGIN
  );

  // 元のリクエストヘッダーを引き継ぐ
  const headers = new Headers(context.request.headers);

  // InfinityFree側には元のHostを送らない
  headers.delete("host");

  // WordPressにHTTPS経由でアクセスしていることを伝える
  headers.set("X-Forwarded-Proto", "https");

  // REST API / Gutenberg用
  headers.set("X-Forwarded-For", incoming.hostname);

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
   * WordPressのリダイレクトを
   * kk777.site.je → 777keiba-jp.pages.dev
   * に書き換える
   */
  const location = responseHeaders.get("Location");

  if (location) {
    try {
      const redirectUrl = new URL(location, ORIGIN);

      if (redirectUrl.hostname === "kk777.site.je") {
        redirectUrl.protocol = incoming.protocol;
        redirectUrl.hostname = incoming.hostname;

        responseHeaders.set(
          "Location",
          redirectUrl.toString()
        );
      }
    } catch {
      // 相対URLなどはそのまま
    }
  }

  /*
   * CookieのDomainを削除
   *
   * WordPressのログイン・REST API・Nonceで重要
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
   * HTMLだけURLを書き換える。
   *
   * REST APIのJSONは変更しない。
   */
  if (contentType.includes("text/html")) {
    const rewriter = new HTMLRewriter()
      .on("a", new RewriteAttribute("href"))
      .on("form", new RewriteAttribute("action"))
      .on("img", new RewriteAttribute("src"))
      .on("script", new RewriteAttribute("src"))
      .on("link", new RewriteAttribute("href"))
      .on("iframe", new RewriteAttribute("src"));

    return rewriter.transform(
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    );
  }

  /*
   * JSON / REST API / CSS / JS / 画像などは
   * レスポンスをそのまま返す。
   */
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}


class RewriteAttribute {
  constructor(attribute) {
    this.attribute = attribute;
  }

  element(element) {
    const value = element.getAttribute(this.attribute);

    if (!value) return;

    if (value.startsWith(ORIGIN)) {
      element.setAttribute(
        this.attribute,
        value.replace(
          ORIGIN,
          "https://777keiba-jp.pages.dev"
        )
      );
    }
  }
}
