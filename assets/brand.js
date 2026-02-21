(function () {
  const BRAND_NAME = "AllTime";

  function stripSpanishPrefix(pathname) {
    if (pathname === "/es" || pathname === "/es/") return "/";
    if (pathname.startsWith("/es/")) return pathname.slice(3);
    return pathname;
  }

  function swapFileNameInPath(sourcePath, targetFile) {
    try {
      const absolute = new URL(sourcePath, window.location.href);
      absolute.pathname = absolute.pathname.replace(/[^/]*$/, targetFile);
      return `${absolute.pathname}${absolute.search}${absolute.hash}`;
    } catch {
      return sourcePath;
    }
  }

  function replaceTextNodes(root, regex, replacement) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.parentElement) return NodeFilter.FILTER_REJECT;
          const tagName = node.parentElement.tagName;
          if (tagName === "SCRIPT" || tagName === "STYLE" || tagName === "NOSCRIPT") {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.nodeValue || !regex.test(node.nodeValue)) {
            regex.lastIndex = 0;
            return NodeFilter.FILTER_REJECT;
          }
          regex.lastIndex = 0;
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    const nodes = [];
    let current;
    while ((current = walker.nextNode())) nodes.push(current);

    nodes.forEach((node) => {
      node.nodeValue = node.nodeValue.replace(regex, replacement);
    });
  }

  function applyAllTimeBranding() {
    document.documentElement.setAttribute("data-brand", "alltime");
    document.documentElement.lang = "en";

    document.querySelectorAll("img[src]").forEach((img) => {
      const source = img.getAttribute("src") || "";
      const normalized = source.split("?")[0].split("#")[0];

      if (/(^|\/)logo(-tiempo)?\.png$/i.test(normalized) && !/\/logos\//i.test(normalized)) {
        img.setAttribute("src", swapFileNameInPath(source, "logo.png"));
      }

      if (/(^|\/)wordmark(-tiempo)?\.png$/i.test(normalized)) {
        img.setAttribute("src", swapFileNameInPath(source, "wordmark.png"));
      }

      if (/(^|\/)success-clock\.png$/i.test(normalized)) {
        img.setAttribute("src", swapFileNameInPath(source, "logo.png"));
      }

      if (img.alt) {
        img.alt = img.alt
          .replace(/\bTiempo\b/g, BRAND_NAME)
          .replace(/\busetiempoapp\.com\b/g, "usealltimeapp.com");
      }
    });

    document.querySelectorAll(".logo-text").forEach((element) => {
      element.textContent = BRAND_NAME;
    });

    document.querySelectorAll(".footer-copy").forEach((element) => {
      element.textContent = element.textContent
        .replace(/\bTiempo\b/g, BRAND_NAME)
        .replace(/\busetiempoapp\.com\b/g, "usealltimeapp.com");
    });

    if (document.title) {
      document.title = document.title
        .replace(/\bTiempo\b/g, BRAND_NAME)
        .replace(/\busetiempoapp\.com\b/g, "usealltimeapp.com");
    }

    document.querySelectorAll('meta[name="description"]').forEach((meta) => {
      if (!meta.content) return;
      meta.content = meta.content
        .replace(/\bTiempo\b/g, BRAND_NAME)
        .replace(/\busetiempoapp\.com\b/g, "usealltimeapp.com");
    });

    document.querySelectorAll('link[rel="canonical"]').forEach((link) => {
      try {
        const canonical = new URL(link.href, window.location.origin);
        canonical.hostname = "usealltimeapp.com";
        canonical.pathname = stripSpanishPrefix(canonical.pathname);
        link.href = canonical.toString();
      } catch {
        // Ignore malformed canonical links.
      }
    });

    replaceTextNodes(document.body, /\bTiempo\b/g, BRAND_NAME);
    replaceTextNodes(document.body, /\busetiempoapp\.com\b/g, "usealltimeapp.com");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyAllTimeBranding, { once: true });
  } else {
    applyAllTimeBranding();
  }
})();
