const appStatusEl = document.querySelector("#app-status");
const dbStatusEl = document.querySelector("#db-status");
const latencyEl = document.querySelector("#latency");
const checkedAtEl = document.querySelector("#checked-at");
const errorEl = document.querySelector("#error");
const refreshBtn = document.querySelector("#refresh-btn");
const connectionsListEl = document.querySelector("#connections-list");

function setStatus(element, value, isUp) {
  element.textContent = value;
  element.classList.remove("up", "down", "degraded");
  element.classList.add(isUp ? "up" : "down");
  if (value.toLowerCase() === "degraded") {
    element.classList.remove("down");
    element.classList.add("degraded");
  }
}

function formatConnectionName(key, label) {
  return label ? `${key} (${label})` : key;
}

function renderConnections(connections) {
  if (!connections || Object.keys(connections).length === 0) {
    connectionsListEl.innerHTML = '<p class="muted">No connection details returned.</p>';
    return;
  }

  const rows = Object.entries(connections).map(([key, info]) => {
    const status = info?.status || "unknown";
    const statusClass = ["up", "down", "degraded"].includes(status) ? status : "down";
    const name = formatConnectionName(key, info?.label);
    const error = info?.error
      ? `<div class="connection-error">${info.error}</div>`
      : "";

    return `
      <article class="connection-row">
        <div class="connection-main">
          <span>${name}</span>
          <strong class="${statusClass}">${status}</strong>
        </div>
        ${error}
      </article>
    `;
  });

  connectionsListEl.innerHTML = rows.join("");
}

async function refreshStatus() {
  refreshBtn.disabled = true;
  errorEl.classList.add("hidden");
  errorEl.textContent = "";

  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    const data = await response.json();

    setStatus(appStatusEl, data.app || "unknown", data.app === "up");
    setStatus(dbStatusEl, data.db || "unknown", data.db === "up");
    renderConnections(data.connections);
    latencyEl.textContent = `${data.latencyMs ?? "-"} ms`;
    checkedAtEl.textContent = new Date(data.timestamp).toLocaleString();

    if (!response.ok && data.error) {
      errorEl.textContent = data.error;
      errorEl.classList.remove("hidden");
    }
  } catch (error) {
    setStatus(appStatusEl, "down", false);
    setStatus(dbStatusEl, "down", false);
    renderConnections({});
    latencyEl.textContent = "-";
    checkedAtEl.textContent = new Date().toLocaleString();
    errorEl.textContent = error.message;
    errorEl.classList.remove("hidden");
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", refreshStatus);
refreshStatus();
