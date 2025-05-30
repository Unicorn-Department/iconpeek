// Content script to extract favicon and touch icon information
function extractIconsFromPage() {
  const icons = [];

  // Function to resolve relative URLs
  function resolveUrl(url) {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    if (url.startsWith("//")) {
      return window.location.protocol + url;
    }
    if (url.startsWith("/")) {
      return window.location.origin + url;
    }
    return new URL(url, window.location.href).href;
  }

  // Function to parse sizes attribute
  function parseSizes(sizesAttr) {
    if (!sizesAttr || sizesAttr === "any") return ["any"];
    return sizesAttr
      .toLowerCase()
      .split(/\s+/)
      .map((size) => {
        if (size.includes("x")) {
          return size;
        }
        return size;
      });
  }

  // Get all link elements with icon-related rel attributes
  const linkElements = document.querySelectorAll('link[rel*="icon"]');

  linkElements.forEach((link) => {
    const rel = link.getAttribute("rel");
    const href = link.getAttribute("href");
    const sizes = link.getAttribute("sizes");
    const type = link.getAttribute("type") || "unknown";

    if (href) {
      const iconInfo = {
        url: resolveUrl(href),
        rel: rel,
        sizes: parseSizes(sizes),
        type: type,
        element: "link",
      };
      icons.push(iconInfo);
    }
  });

  // Check for default favicon.ico
  const defaultFavicon = window.location.origin + "/favicon.ico";
  const hasDefaultFavicon = icons.some((icon) =>
    icon.url.toLowerCase().includes("favicon.ico"),
  );

  if (!hasDefaultFavicon) {
    icons.push({
      url: defaultFavicon,
      rel: "shortcut icon",
      sizes: ["16x16"],
      type: "image/x-icon",
      element: "default",
    });
  }

  // Also check meta tags for msapplication icons
  const metaElements = document.querySelectorAll('meta[name*="msapplication"]');
  metaElements.forEach((meta) => {
    const name = meta.getAttribute("name");
    const content = meta.getAttribute("content");

    if (content && (name.includes("TileImage") || name.includes("square"))) {
      icons.push({
        url: resolveUrl(content),
        rel: "ms-application",
        sizes: ["unknown"],
        type: "image/png",
        element: "meta",
        metaName: name,
      });
    }
  });

  return {
    icons: icons,
    pageTitle: document.title,
    pageUrl: window.location.href,
    timestamp: Date.now(),
  };
}

// Listen for messages from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getIcons") {
    const iconData = extractIconsFromPage();
    sendResponse(iconData);
  }
  return true; // Keep message channel open for async response
});

// Also extract icons immediately and store them
const initialIconData = extractIconsFromPage();
window.faviconData = initialIconData;
