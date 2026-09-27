const ORIGIN = "https://kk777.site.je";
const PUBLIC = "https://777keiba-jp.pages.dev";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);

  // wp-json は専用Functionに任せる
  if (incoming.pathname.startsWith("/wp-json/")) {
    return fetch(context.request);
  }

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

  // リダイレクト先をPages側へ
  const location = responseHeaders.get("Location");

  if (location) {
    try {
      const url = new URL(location, ORIGIN);

      if (url.hostname === "kk777.site.je") {
        url.protocol = incoming.protocol;
        url.host = incoming.host;

        responseHeaders.set(
          "Location",
          url.toString()
        );
      }
    } catch {}
  }

  // CookieのDomainを削除
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

  // HTMLだけ書き換え
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
        PUBLIC + value.slice(ORIGIN.length)
      );
    }
  }
}
