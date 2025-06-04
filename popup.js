document.addEventListener("DOMContentLoaded", function () {
  loadIcons();

  document.getElementById("refreshBtn").addEventListener("click", function () {
    loadIcons();
  });

  document
    .getElementById("downloadAllBtn")
    .addEventListener("click", function () {
      downloadAllIcons();
    });

  // Add smooth scrolling for navigation links
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("nav-link")) {
      e.preventDefault();
      const targetId = e.target.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  });
});

async function loadIcons() {
  const content = document.getElementById("content");
  const siteTitle = document.getElementById("siteTitle");
  const siteUrl = document.getElementById("siteUrl");
  const downloadAllBtn = document.getElementById("downloadAllBtn");

  // Show loading state
  content.innerHTML =
    '<div class="loading"><p>Scanning page for icons...</p></div>';
  downloadAllBtn.disabled = true;

  try {
    // Get current tab
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const currentTab = tabs[0];

    // Get icons from content script
    const response = await browser.tabs.sendMessage(currentTab.id, {
      action: "getIcons",
    });

    if (response && response.icons) {
      // Store icons globally for download all functionality
      window.allIcons = response.icons;
      displayIcons(response.icons);
      downloadAllBtn.disabled = response.icons.length === 0;
    } else {
      content.innerHTML =
        '<div class="no-icons"><p>No icons found on this page</p></div>';
      window.allIcons = [];
      downloadAllBtn.disabled = true;
    }
  } catch (error) {
    console.error("Error loading icons:", error);
    content.innerHTML = `
            <div class="error">
                <p>Error loading icons: ${error.message}</p>
                <p>Try refreshing the page and opening the extension again.</p>
            </div>
        `;
    window.allIcons = [];
    downloadAllBtn.disabled = true;
  }
}

function displayIcons(icons) {
  const content = document.getElementById("content");

  if (!icons || icons.length === 0) {
    content.innerHTML =
      '<div class="no-icons"><p>No icons found on this page</p></div>';
    hideAllNavLinks();
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
  const sectionsWithIcons = [];

  // Mapping for nav links
  const sectionMapping = {
    "Standard Favicons": { id: "standard", navId: "navStandard" },
    "Apple Touch Icons": { id: "apple", navId: "navApple" },
    "Microsoft Tiles": { id: "microsoft", navId: "navMicrosoft" },
    "Other Icons": { id: "other", navId: "navOther" },
  };

  Object.keys(groupedIcons).forEach((category) => {
    const categoryIcons = groupedIcons[category];
    if (categoryIcons.length > 0) {
      sectionsWithIcons.push(category);
      const sectionId = sectionMapping[category].id;

      html += `
                <div class="section" id="${sectionId}">
                    <div class="section-title">${category} (${categoryIcons.length})</div>
                    <div class="icon-grid">
            `;

      categoryIcons.forEach((icon) => {
        const sizeDisplay = icon.sizes.join(", ") || "Unknown";
        const typeDisplay = icon.type.replace("image/", "") || "Unknown";
        const fileName = icon.url.split("/").pop().split("?")[0];

        // Determine if this is a Microsoft tile icon
        const isMsTile = icon.rel.includes("ms-application") || icon.metaName;
        const msClass = isMsTile ? "ms-tile" : "";

        html += `
                    <div class="icon-item" data-icon-url="${icon.url}" data-filename="${fileName}">
                        <img class="icon-image ${msClass}"
                             src="${icon.url}"
                             alt="Icon"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                             loading="lazy">
                        <div style="display:none; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 10px;">
                            Failed to load
                        </div>
                        <div class="icon-actions">
                            <button class="action-btn download icon-download-btn">
                                ⬇
                            </button>
                            <button class="action-btn view icon-view-btn">
                                👁
                            </button>
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
    hideAllNavLinks();
  } else {
    content.innerHTML = html;
    updateNavLinks(sectionsWithIcons, sectionMapping);

    // Add event listeners for individual icon buttons
    setupIconButtonListeners();
  }
}

function hideAllNavLinks() {
  const navLinks = ["navStandard", "navApple", "navMicrosoft", "navOther"];
  navLinks.forEach((navId) => {
    const navElement = document.getElementById(navId);
    if (navElement) {
      navElement.classList.add("hidden");
    }
  });
}

function updateNavLinks(sectionsWithIcons, sectionMapping) {
  // Hide all nav links first
  hideAllNavLinks();

  // Show nav links for sections that have icons
  sectionsWithIcons.forEach((section) => {
    const navId = sectionMapping[section].navId;
    const navElement = document.getElementById(navId);
    if (navElement) {
      navElement.classList.remove("hidden");
    }
  });
}

// Function to setup event listeners for individual icon buttons
function setupIconButtonListeners() {
  // Add event listeners for download buttons
  document.querySelectorAll(".icon-download-btn").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const iconItem = this.closest(".icon-item");
      const iconUrl = iconItem.dataset.iconUrl;
      const fileName = iconItem.dataset.filename;

      downloadIcon(iconUrl, fileName);
    });
  });

  // Add event listeners for view buttons
  document.querySelectorAll(".icon-view-btn").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const iconItem = this.closest(".icon-item");
      const iconUrl = iconItem.dataset.iconUrl;

      viewIcon(iconUrl);
    });
  });
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

// Function to download an icon
function downloadIcon(iconUrl, fileName) {
  // Create a temporary anchor element to trigger download
  const link = document.createElement("a");
  link.href = iconUrl;
  link.download = fileName || "icon";
  link.target = "_blank";

  // For cross-origin images, we need to fetch and create a blob
  fetch(iconUrl)
    .then((response) => response.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    })
    .catch((error) => {
      console.error("Download failed:", error);
      // Fallback: try direct link
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}

// Function to view an icon in a new tab
function viewIcon(iconUrl) {
  browser.tabs.create({ url: iconUrl });
}

// Function to download all icons
async function downloadAllIcons() {
  if (!window.allIcons || window.allIcons.length === 0) {
    alert("No icons available to download");
    return;
  }

  const downloadAllBtn = document.getElementById("downloadAllBtn");
  const originalText = downloadAllBtn.textContent;

  try {
    // Disable button and show progress
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = "Downloading...";

    // Create a delay function for rate limiting
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < window.allIcons.length; i++) {
      const icon = window.allIcons[i];
      const fileName =
        icon.url.split("/").pop().split("?")[0] || `icon_${i + 1}`;

      // Update progress
      downloadAllBtn.textContent = `Downloading ${i + 1}/${window.allIcons.length}`;

      try {
        await downloadIconPromise(icon.url, fileName);
        successCount++;

        // Add delay between downloads to avoid overwhelming the browser
        if (i < window.allIcons.length - 1) {
          await delay(500); // 500ms delay between downloads
        }
      } catch (error) {
        console.error(`Failed to download ${fileName}:`, error);
        failCount++;
      }
    }

    // Show completion message
    if (failCount === 0) {
      downloadAllBtn.textContent = `✓ Downloaded ${successCount} icons`;
    } else {
      downloadAllBtn.textContent = `✓ ${successCount} downloaded, ${failCount} failed`;
    }

    // Reset button after 3 seconds
    setTimeout(() => {
      downloadAllBtn.textContent = originalText;
      downloadAllBtn.disabled = false;
    }, 3000);
  } catch (error) {
    console.error("Download all failed:", error);
    downloadAllBtn.textContent = "Download failed";

    setTimeout(() => {
      downloadAllBtn.textContent = originalText;
      downloadAllBtn.disabled = false;
    }, 3000);
  }
}

// Promise-based download function for batch downloading
function downloadIconPromise(iconUrl, fileName) {
  return new Promise((resolve, reject) => {
    fetch(iconUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        resolve();
      })
      .catch((error) => {
        // Fallback: try direct link
        try {
          const link = document.createElement("a");
          link.href = iconUrl;
          link.download = fileName;
          link.target = "_blank";

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          resolve();
        } catch (fallbackError) {
          reject(fallbackError);
        }
      });
  });
}
