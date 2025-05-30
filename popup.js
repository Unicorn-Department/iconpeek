document.addEventListener("DOMContentLoaded", function () {
  loadIcons();

  document.getElementById("refreshBtn").addEventListener("click", function () {
    loadIcons();
  });
});

async function loadIcons() {
  const content = document.getElementById("content");
  const siteTitle = document.getElementById("siteTitle");
  const siteUrl = document.getElementById("siteUrl");

  // Show loading state
  content.innerHTML =
    '<div class="loading"><p>Scanning page for icons...</p></div>';

  try {
    // Get current tab
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const currentTab = tabs[0];

    // Update header with site info
    siteTitle.textContent = currentTab.title || "Unknown Site";
    siteUrl.textContent = currentTab.url;

    // Get icons from content script
    const response = await browser.tabs.sendMessage(currentTab.id, {
      action: "getIcons",
    });

    if (response && response.icons) {
      displayIcons(response.icons);
    } else {
      content.innerHTML =
        '<div class="no-icons"><p>No icons found on this page</p></div>';
    }
  } catch (error) {
    console.error("Error loading icons:", error);
    content.innerHTML = `
            <div class="error">
                <p>Error loading icons: ${error.message}</p>
                <p>Try refreshing the page and opening the extension again.</p>
            </div>
        `;
  }
}

function displayIcons(icons) {
  const content = document.getElementById("content");

  if (!icons || icons.length === 0) {
    content.innerHTML =
      '<div class="no-icons"><p>No icons found on this page</p></div>';
    return;
  }

  // Group icons by type
  const groupedIcons = {
    "Standard Favicons": [],
    "Apple Touch Icons": [],
    "Microsoft Tiles": [],
    "Other Icons": [],
  };

  icons.forEach((icon) => {
    if (icon.rel.includes("apple-touch-icon")) {
      groupedIcons["Apple Touch Icons"].push(icon);
    } else if (icon.rel.includes("ms-application") || icon.metaName) {
      groupedIcons["Microsoft Tiles"].push(icon);
    } else if (icon.rel.includes("icon") || icon.rel.includes("shortcut")) {
      groupedIcons["Standard Favicons"].push(icon);
    } else {
      groupedIcons["Other Icons"].push(icon);
    }
  });

  let html = "";

  Object.keys(groupedIcons).forEach((category) => {
    const categoryIcons = groupedIcons[category];
    if (categoryIcons.length > 0) {
      html += `
                <div class="section">
                    <div class="section-title">${category} (${categoryIcons.length})</div>
                    <div class="icon-grid">
            `;

      categoryIcons.forEach((icon) => {
        const sizeDisplay = icon.sizes.join(", ") || "Unknown";
        const typeDisplay = icon.type.replace("image/", "") || "Unknown";
        const fileName = icon.url.split("/").pop().split("?")[0];

        html += `
                    <div class="icon-item">
                        <img class="icon-image"
                             src="${icon.url}"
                             alt="Icon"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                             loading="lazy">
                        <div style="display:none; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 10px;">
                            Failed to load
                        </div>
                        <div class="icon-info">
                            <div class="icon-size">${sizeDisplay}</div>
                            <div class="icon-type">${typeDisplay}</div>
                            <div class="icon-url" title="${icon.url}">${fileName}</div>
                        </div>
                    </div>
                `;
      });

      html += "</div></div>";
    }
  });

  if (html === "") {
    content.innerHTML =
      '<div class="no-icons"><p>No icons found on this page</p></div>';
  } else {
    content.innerHTML = html;
  }
}

// Handle image loading errors globally
document.addEventListener(
  "error",
  function (e) {
    if (
      e.target.tagName === "IMG" &&
      e.target.classList.contains("icon-image")
    ) {
      e.target.style.display = "none";
      const errorDiv = e.target.nextElementSibling;
      if (errorDiv) {
        errorDiv.style.display = "block";
      }
    }
  },
  true,
);
