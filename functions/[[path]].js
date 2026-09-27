const ORIGIN = "https://kk777.site.je";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);
  const target = new URL(
    incoming.pathname + incoming.search,
    ORIGIN
  );

const headers = new Headers(context.request.headers);

// 元のPages側のHostを送らない
headers.delete("host");

// WordPress側ではHTTPSアクセスとして扱う
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

  // WordPressからのリダイレクト先をPages側URLに書き換える
  const location = responseHeaders.get("Location");

  if (location) {
    try {
      const redirectUrl = new URL(location, ORIGIN);

      if (redirectUrl.hostname === "kk777.site.je") {
        redirectUrl.protocol = incoming.protocol;
        redirectUrl.hostname = incoming.hostname;
        responseHeaders.set("Location", redirectUrl.toString());
      }
    } catch {
      // Locationが通常のURLでない場合はそのまま
    }
  }

  // CookieのDomainを削除して、pages.dev側で使えるようにする
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

  const contentType = responseHeaders.get("content-type") || "";

  // HTML内のkk777.site.jeを777keiba-jp.pages.devへ置換
  if (contentType.includes("text/html")) {
    const rewritten = new HTMLRewriter()
      .on("a", new RewriteAttribute("href", ORIGIN, incoming.origin))
      .on("form", new RewriteAttribute("action", ORIGIN, incoming.origin))
      .on("img", new RewriteAttribute("src", ORIGIN, incoming.origin))
      .on("script", new RewriteAttribute("src", ORIGIN, incoming.origin))
      .on("link", new RewriteAttribute("href", ORIGIN, incoming.origin));

    return rewritten.transform(
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

class RewriteAttribute {
  constructor(attribute, origin, publicOrigin) {
    this.attribute = attribute;
    this.origin = origin;
    this.publicOrigin = publicOrigin;
  }

  element(element) {
    const value = element.getAttribute(this.attribute);

    if (value && value.startsWith(this.origin)) {
      element.setAttribute(
        this.attribute,
        this.publicOrigin + value.slice(this.origin.length)
      );
    }
  }
}
