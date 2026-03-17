const grid    = document.getElementById("grid");
const search  = document.getElementById("search");
const panel   = document.getElementById("panel");
const overlay = document.getElementById("overlay");
const close   = document.getElementById("panel-close");
const content = document.getElementById("panel-content");

let allChampions = [];

// ── Bootstrap ──────────────────────────────────────────────────────────────

async function init() {
  grid.innerHTML = `<p class="state-message">Loading champions…</p>`;

  try {
    const res = await fetch("/api/champions");
    allChampions = await res.json();
    renderGrid(allChampions);
  } catch {
    grid.innerHTML = `<p class="state-message">Failed to load champions.</p>`;
  }
}

// ── Render champion grid ───────────────────────────────────────────────────

function renderGrid(champions) {
  if (!champions.length) {
    grid.innerHTML = `<p class="state-message">No champions found.</p>`;
    return;
  }

  grid.innerHTML = champions.map((c) => `
    <div class="champion-card" data-id="${c.id}" title="${c.name}">
      <img src="${c.iconUrl}" alt="${c.name}" loading="lazy" />
      <span>${c.name}</span>
    </div>
  `).join("");

  grid.querySelectorAll(".champion-card").forEach((card) => {
    card.addEventListener("click", () => openPanel(card.dataset.id));
  });
}

// ── Search ─────────────────────────────────────────────────────────────────

search.addEventListener("input", () => {
  const q = search.value.trim().toLowerCase();
  renderGrid(
    q ? allChampions.filter((c) => c.name.toLowerCase().includes(q)) : allChampions
  );
});

// ── Detail panel ───────────────────────────────────────────────────────────

async function openPanel(championId) {
  panel.hidden = false;
  overlay.hidden = false;
  content.innerHTML = `<p class="state-message">Loading…</p>`;

  try {
    const res = await fetch(`/api/champions/${championId}`);
    const c = await res.json();
    content.innerHTML = renderDetail(c);
  } catch {
    content.innerHTML = `<p class="state-message">Failed to load champion.</p>`;
  }
}

function closePanel() {
  panel.hidden = true;
  overlay.hidden = true;
}

close.addEventListener("click", closePanel);
overlay.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

function renderDetail(c) {
  const tags = c.tags.map((t) => `<span class="tag">${t}</span>`).join("");

  const abilities = c.abilities.map((a) => `
    <div class="ability">
      <div class="ability-icon-wrap">
        <img src="${a.iconUrl}" alt="${a.name}" />
        <span class="ability-key">${a.key}</span>
      </div>
      <div class="ability-info">
        <h4>${a.name}</h4>
        <p>${a.description}</p>
      </div>
    </div>
  `).join("");

  return `
    <div class="panel-header">
      <img src="${c.iconUrl}" alt="${c.name}" />
      <div class="panel-header-text">
        <h2>${c.name}</h2>
        <p>${c.title}</p>
        <div class="tags">${tags}</div>
      </div>
    </div>

    <p class="abilities-title">Abilities</p>
    ${abilities}

    <p class="lore">${c.lore}</p>
  `;
}

init();
