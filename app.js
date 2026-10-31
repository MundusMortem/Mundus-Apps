// Add an app here after you create it.
// Example: { name: "My App", description: "What it does", icon: "✦", accent: "#a882ff", url: "https://example.com" }
const apps = [];

const grid = document.querySelector("#appGrid");

function appCard(app) {
  const target = app.url?.startsWith("http") ? 'target="_blank" rel="noopener"' : "";
  return `<a class="app-card" style="--accent:${app.accent || "#a882ff"}" href="${app.url}" ${target}>
    <div class="app-icon">${app.icon || "✦"}</div>
    <h2>${app.name}</h2><p>${app.description || ""}</p>
  </a>`;
}

function render() {
  grid.innerHTML = apps.map(appCard).join("") + `<article class="app-card create-card" aria-label="Create new app">
    <span class="create-plus">+</span><h2>Create new</h2><p>New apps will appear here.</p>
  </article>`;
  document.querySelector("#appCount").textContent = `${apps.length} APP${apps.length === 1 ? "" : "S"}`;
}
render();

let deferredPrompt;
const installButton = document.querySelector("#installButton");
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredPrompt = event; installButton.hidden = false; });
installButton.addEventListener("click", async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installButton.hidden = true; });
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
