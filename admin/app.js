(() => {
  const $ = selector => document.querySelector(selector);
  const state = { collection: "news", items: [], selectedId: null, csrf: "", dirty: false };
  const config = {
    news: { title: "News", kicker: "PUBLISHING / NEWS", description: "Share what's happening inside PIXFOX.", fields: [
      ["title","Title","text",true],["date","Publication date","date",false],["category","Category","text",false],
      ["image","Cover image URL","url",true],["excerpt","Short description","textarea",true],["body","Full story","textarea",true]
    ]},
    games: { title: "Games", kicker: "STUDIO / PROJECTS", description: "Manage the games presented on the studio website.", fields: [
      ["title","Game title","text",true],["status","Development status","text",false],["platform","Platforms","text",false],
      ["image","Cover image URL","url",true],["description","Game description","textarea",true],["storeUrl","Store page URL","url",true]
    ]}
  };
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function id() {
    return (crypto.randomUUID ? crypto.randomUUID() : "item-" + Date.now() + "-" + Math.random().toString(36).slice(2)).replace(/-/g,"").slice(0,24);
  }
  function message(text, error) {
    const node = $("#status-message"); node.textContent = text; node.classList.toggle("error", !!error);
  }
  async function api(path, options) {
    const response = await fetch(path, Object.assign({ credentials: "same-origin" }, options || {}));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || ("Request failed (" + response.status + ")"));
    return data;
  }
  async function boot() {
    try {
      const me = await api("/api/me");
      state.csrf = me.csrf;
      $("#user-login").textContent = me.login;
      $("#login-view").classList.add("hidden");
      $("#app-view").classList.remove("hidden");
      $("#logout").classList.remove("hidden");
      await load("news");
    } catch {
      $("#login-view").classList.remove("hidden");
      $("#app-view").classList.add("hidden");
    }
  }
  async function load(collection) {
    state.collection = collection; state.selectedId = null; state.dirty = false;
    document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.collection === collection));
    $("#section-kicker").textContent = config[collection].kicker;
    $("#section-title").innerHTML = config[collection].title + " <em>room.</em>";
    $("#section-description").textContent = config[collection].description;
    $("#editor-heading").textContent = collection === "news" ? "NEWS EDITOR" : "GAME EDITOR";
    $("#items-list").innerHTML = '<div class="empty-state">Loading content…</div>'; clearEditor();
    try {
      const data = await api("/api/data?collection=" + collection);
      state.items = Array.isArray(data.items) ? data.items : [];
      renderList(); updateCounts();
    } catch (error) { $("#items-list").innerHTML = '<div class="empty-state">' + esc(error.message) + '</div>'; message(error.message, true); }
  }
  function updateCounts() {
    $("#item-count").textContent = state.items.length + " ITEMS";
    if (state.collection === "news") $("#news-count").textContent = state.items.length;
    if (state.collection === "games") $("#games-count").textContent = state.items.length;
  }
  function renderList() {
    updateCounts();
    if (!state.items.length) { $("#items-list").innerHTML = '<div class="empty-state">Nothing here yet.<br>Press “New item” to add the first one.</div>'; return; }
    $("#items-list").innerHTML = state.items.map(item => {
      const thumb = item.image ? '<img src="' + esc(item.image) + '" alt="" loading="lazy">' : "✦";
      return '<button class="item-row ' + (item.id === state.selectedId ? "selected" : "") + '" type="button" data-id="' + esc(item.id) + '">' +
        '<span class="item-thumb">' + thumb + '</span><span class="item-info"><strong>' + esc(item.title) + '</strong><small>' +
        esc(item.date || item.status || item.category || "PIXFOX") + '</small></span><span class="item-arrow">↗</span></button>';
    }).join("");
    document.querySelectorAll(".item-row").forEach(button => button.addEventListener("click", () => select(button.dataset.id)));
  }
  function clearEditor() {
    $("#editor-fields").innerHTML = '<div class="empty-editor"><span>✳</span><strong>Select an item</strong><p>Choose something from the library or create a new entry.</p></div>';
    $("#save-item").disabled = true; $("#delete-item").classList.add("hidden");
  }
  function select(itemId) {
    state.selectedId = itemId; state.dirty = false;
    const item = state.items.find(entry => entry.id === itemId);
    if (!item) return;
    renderList(); renderEditor(item);
  }
  function renderEditor(item) {
    $("#editor-fields").innerHTML = config[state.collection].fields.map(field => {
      const key = field[0], label = field[1], type = field[2], full = field[3];
      const value = esc(item[key] || "");
      const cls = full ? "field full" : "field";
      if (type === "textarea") return '<div class="' + cls + '"><label for="field-' + key + '">' + label + '</label><textarea id="field-' + key + '" name="' + key + '" rows="' + (key === "body" ? 7 : 3) + '">' + value + '</textarea></div>';
      return '<div class="' + cls + '"><label for="field-' + key + '">' + label + '</label><input id="field-' + key + '" name="' + key + '" type="' + type + '" value="' + value + '"></div>';
    }).join("");
    $("#save-item").disabled = false; $("#delete-item").classList.remove("hidden");
    $("#editor-fields").querySelectorAll("input,textarea,select").forEach(input => input.addEventListener("input", () => { state.dirty = true; message("Unsaved changes"); }));
  }
  function addItem() {
    const now = new Date(), date = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
    const item = state.collection === "news"
      ? { id: id(), title: "", date, category: "Studio news", image: "", excerpt: "", body: "" }
      : { id: id(), title: "", status: "In development", platform: "Coming soon", image: "", description: "", storeUrl: "" };
    state.items.unshift(item); state.selectedId = item.id; renderList(); renderEditor(item);
    $("#editor-fields input[name=title]").focus(); message("New draft. Save it to publish to the website.");
  }
  function collect() {
    const item = Object.assign({}, state.items.find(entry => entry.id === state.selectedId));
    config[state.collection].fields.forEach(field => {
      const node = $('#editor-fields [name="' + field[0] + '"]');
      if (node) item[field[0]] = node.value.trim();
    });
    return item;
  }
  async function save() {
    if (!state.selectedId) return;
    const item = collect();
    if (!item.title) { message("Add a title before saving.", true); return; }
    const next = state.items.map(entry => entry.id === state.selectedId ? item : entry);
    $("#save-item").disabled = true; message("Saving to GitHub…");
    try {
      await api("/api/save", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": state.csrf }, body: JSON.stringify({ collection: state.collection, items: next }) });
      state.items = next; state.dirty = false; renderList(); renderEditor(item); updateCounts();
      message("Saved. GitHub Pages will publish the update in a moment.");
    } catch (error) { message(error.message, true); }
    finally { $("#save-item").disabled = false; }
  }
  function removeItem() {
    if (!state.selectedId) return;
    const item = state.items.find(entry => entry.id === state.selectedId);
    if (!confirm('Delete "' + (item ? item.title : "this item") + '"? Save changes to publish the deletion.')) return;
    state.items = state.items.filter(entry => entry.id !== state.selectedId); state.selectedId = null;
    clearEditor(); renderList(); updateCounts(); $("#save-item").disabled = false;
    message("Item removed from the editor. Press Save changes to publish the deletion.");
  }
  $("#editor-form").addEventListener("submit", event => { event.preventDefault(); save(); });
  $("#add-item").addEventListener("click", addItem);
  $("#delete-item").addEventListener("click", removeItem);
  document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => load(button.dataset.collection)));
  $("#logout").addEventListener("click", async () => {
    try { await api("/api/logout", { method: "POST", headers: { "X-CSRF-Token": state.csrf } }); } catch {}
    location.href = "/";
  });
  window.addEventListener("beforeunload", event => { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
  boot();
})();