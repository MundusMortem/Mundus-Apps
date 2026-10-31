const apps = [
  { name: "Coming Soon", tagline: "Your next great app", description: "Add your first PWA to this card list and make the store your own.", type: "PWA", icon: "✦", accent: "#a882ff", url: "#", featured: true },
  { name: "Daily Notes", tagline: "Capture the moment", description: "A calm, focused place for thoughts, ideas, and tiny victories.", type: "PWA", icon: "✎", accent: "#ff8e6f", url: "#", category: "Productivity" },
  { name: "Focus Flow", tagline: "Do less, better", description: "A timer and task companion for uninterrupted deep work.", type: "PWA", icon: "◒", accent: "#63d8b4", url: "#", category: "Productivity" }
];

const grid = document.querySelector("#appGrid");
const filters = document.querySelector("#filters");
const categories = ["All", ...new Set(apps.map(app => app.category || "New"))];
let activeFilter = "All";

function render() {
  const shown = apps.filter(app => activeFilter === "All" || (app.category || "New") === activeFilter);
  grid.innerHTML = shown.map(app => `<article class="app-card" style="--accent:${app.accent}">
    <div class="app-top"><div class="app-icon">${app.icon}</div>${app.featured ? '<span class="badge">FEATURED</span>' : ""}</div>
    <h3>${app.name}</h3><p>${app.description}</p>
    <div class="card-bottom"><span class="card-type">${app.type} · ${app.tagline}</span><a class="open-link" href="${app.url}" aria-label="Open ${app.name}" ${app.url.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>↗</a></div>
  </article>`).join("");
  document.querySelector("#appCount").textContent = `${shown.length} APP${shown.length === 1 ? "" : "S"}`;
  filters.innerHTML = categories.map(name => `<button class="filter ${name === activeFilter ? "active" : ""}" data-filter="${name}">${name}</button>`).join("");
  filters.querySelectorAll("button").forEach(button => button.addEventListener("click", () => { activeFilter = button.dataset.filter; render(); }));
}
render();
document.querySelector("#year").textContent = new Date().getFullYear();

let deferredPrompt;
const installButton = document.querySelector("#installButton");
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredPrompt = event; installButton.hidden = false; });
installButton.addEventListener("click", async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installButton.hidden = true; });
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
