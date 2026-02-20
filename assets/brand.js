(function () {
  const ALLTIME = "alltime";
  const TIEMPO = "tiempo";
  const BRAND_STORAGE_KEY = "alltime_brand_preference";

  function isSupportedBrand(value) {
    return value === ALLTIME || value === TIEMPO;
  }

  function isSpanishPath(pathname) {
    return pathname === "/es" || pathname.startsWith("/es/");
  }

  function languagePrefersSpanish() {
    const langs = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || ""];

    return langs.some((lang) => /^es([-_]|$)/i.test(lang || ""));
  }

  function getStoredBrand() {
    try {
      const stored = localStorage.getItem(BRAND_STORAGE_KEY);
      return isSupportedBrand(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  function setStoredBrand(brand) {
    try {
      if (isSupportedBrand(brand)) {
        localStorage.setItem(BRAND_STORAGE_KEY, brand);
      }
    } catch {
      // Ignore storage failures.
    }
  }

  function resolveBrand() {
    const url = new URL(window.location.href);
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname;
    const requestedBrand = (url.searchParams.get("brand") || "").toLowerCase();

    if (isSupportedBrand(requestedBrand)) {
      setStoredBrand(requestedBrand);
      return requestedBrand;
    }

    const storedBrand = getStoredBrand();
    if (storedBrand) {
      return storedBrand;
    }

    if (host === "usetiempoapp.com" || host === "www.usetiempoapp.com") {
      return TIEMPO;
    }

    if (isSpanishPath(pathname)) {
      return TIEMPO;
    }

    return languagePrefersSpanish() ? TIEMPO : ALLTIME;
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
    while ((current = walker.nextNode())) {
      nodes.push(current);
    }

    nodes.forEach((node) => {
      node.nodeValue = node.nodeValue.replace(regex, replacement);
    });
  }

  function updateMetaBranding(brandName, canonicalDomain) {
    if (document.title) {
      document.title = document.title.replace(/\b(Tiempo|AllTime)\b/g, brandName);
    }

    document.querySelectorAll('meta[name="description"]').forEach((meta) => {
      if (meta.content) {
        meta.content = meta.content
          .replace(/\b(Tiempo|AllTime)\b/g, brandName)
          .replace(/\b(usetiempoapp\.com|usealltimeapp\.com)\b/g, canonicalDomain);
      }
    });
  }

  function updateCanonicalLinks() {
    const currentIsSpanishPath = isSpanishPath(window.location.pathname);

    document.querySelectorAll('link[rel="canonical"]').forEach((link) => {
      try {
        const canonical = new URL(link.href, window.location.origin);
        canonical.hostname = "usealltimeapp.com";
        if (currentIsSpanishPath && !isSpanishPath(canonical.pathname)) {
          canonical.pathname = addSpanishPrefix(canonical.pathname);
        }
        link.href = canonical.toString();
      } catch {
        // Ignore malformed canonical links.
      }
    });
  }

  function applyBranding() {
    const brand = resolveBrand();
    const brandName = brand === TIEMPO ? "Tiempo" : "AllTime";
    const canonicalDomain = brand === TIEMPO ? "usetiempoapp.com" : "usealltimeapp.com";

    document.documentElement.setAttribute("data-brand", brand);
    document.documentElement.lang = brand === TIEMPO ? "es" : "en";

    // Use the same new logo assets for both brands so Spanish pages never fall back to stale legacy files.
    const logoFile = "logo.png";
    const wordmarkFile = "wordmark.png";

    document.querySelectorAll("img[src]").forEach((img) => {
      const source = img.getAttribute("src") || "";
      const normalized = source.split("?")[0].split("#")[0];

      if (/(^|\/)logo(-tiempo)?\.png$/i.test(normalized) && !/\/logos\//i.test(normalized)) {
        img.setAttribute("src", swapFileNameInPath(source, logoFile));
      }

      if (/(^|\/)wordmark(-tiempo)?\.png$/i.test(normalized)) {
        img.setAttribute("src", swapFileNameInPath(source, wordmarkFile));
      }

      if (/(^|\/)success-clock\.png$/i.test(normalized)) {
        img.setAttribute("src", swapFileNameInPath(source, logoFile));
      }

      if (img.alt) {
        img.alt = img.alt.replace(/\b(Tiempo|AllTime)\b/g, brandName);
      }
    });

    document.querySelectorAll(".logo-text").forEach((element) => {
      element.textContent = brandName;
    });

    document.querySelectorAll(".footer-copy").forEach((element) => {
      element.textContent = element.textContent.replace(/\b(Tiempo|AllTime)\b/g, brandName);
    });

    if (brand === ALLTIME) {
      replaceTextNodes(document.body, /\bTiempo\b/g, "AllTime");
      replaceTextNodes(document.body, /\busetiempoapp\.com\b/g, "usealltimeapp.com");
    } else {
      replaceTextNodes(document.body, /\bAllTime\b/g, "Tiempo");
      replaceTextNodes(document.body, /\busealltimeapp\.com\b/g, "usetiempoapp.com");
    }

    updateMetaBranding(brandName, canonicalDomain);
    updateCanonicalLinks();
    window.AllTimeBrand = {
      getBrand() {
        return brand;
      },
      setBrand(nextBrand) {
        if (!isSupportedBrand(nextBrand)) return;
        setStoredBrand(nextBrand);
        const url = new URL(window.location.href);
        url.searchParams.set("brand", nextBrand);
        window.location.href = url.toString();
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyBranding, { once: true });
  } else {
    applyBranding();
  }
})();
