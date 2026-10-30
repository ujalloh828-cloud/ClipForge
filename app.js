(() => {
  const defaults = {
    pricing: {
      monthly: 5,
      monthlyCredits: 700,
      annual: 48,
      unlimited: 39.99,
    },
    plan: "free",
    projectName: "Voyage — version finale",
    timeline: [
      { id: "track-video", name: "Vidéo", kind: "video", clips: [{ id: "clip-coast", label: "Côte sauvage.mov", start: 0, width: 58, type: "video" }, { id: "clip-drone", label: "Drone.mp4", start: 60, width: 35, type: "image" }] },
      { id: "track-text", name: "Texte", kind: "text", clips: [{ id: "clip-title", label: "Au rythme de la mer", start: 18, width: 35, type: "text" }] },
      { id: "track-audio", name: "Audio", kind: "audio", clips: [{ id: "clip-audio", label: "Ocean Drive — licence incluse", start: 0, width: 90, type: "audio" }] },
    ],
  };

  const saved = readStorage("clipforge-state");
  const state = {
    ...defaults,
    ...saved,
    pricing: { ...defaults.pricing, ...(saved?.pricing || {}) },
    timeline: saved?.timeline?.length ? saved.timeline : defaults.timeline,
    credits: saved?.plan === "free" ? 20 : saved?.plan === "unlimited" ? Infinity : (saved?.pricing?.monthlyCredits || defaults.pricing.monthlyCredits),
    selectedClip: "clip-coast",
    inspector: "video",
    selectedAsset: null,
    assets: [],
    checkoutPlan: "monthly",
  };

  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const esc = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
  const isPremium = () => state.plan !== "free";
  const money = (value) => Number(value).toLocaleString("fr-FR", { minimumFractionDigits: Number(value) % 1 ? 2 : 0, maximumFractionDigits: 2 });

  function readStorage(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
  }

  function persist() {
    const { credits, selectedClip, inspector, selectedAsset, assets, ...serializable } = state;
    localStorage.setItem("clipforge-state", JSON.stringify(serializable));
  }

  let toastTimer;
  function toast(message) {
    const element = qs("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 2800);
  }

  function setSaved(message = "Enregistré") {
    const saveState = qs("#save-state");
    saveState.textContent = message;
    clearTimeout(setSaved.timer);
    setSaved.timer = setTimeout(() => { saveState.textContent = "Enregistré"; }, 1300);
  }

  function showView(name) {
    qsa(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}-view`));
    qsa(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    qs(".sidebar").classList.remove("open");
    qs("#mobile-menu").setAttribute("aria-expanded", "false");
    if (name === "subscription") renderPlans();
    if (name === "projects") renderProjects();
    if (name === "admin") renderAdmin();
  }

  function getClipById(id) {
    for (const track of state.timeline) {
      const clip = track.clips.find((item) => item.id === id);
      if (clip) return { clip, track };
    }
    return null;
  }

  function renderTimeline() {
    const tracks = qs("#timeline-tracks");
    tracks.innerHTML = state.timeline.map((track) => `
      <div class="track" data-track="${esc(track.id)}">
        <span class="track-label">${esc(track.name)}</span>
        <div class="track-lane">
          ${track.clips.map((clip) => `<button class="clip ${esc(clip.type)} ${clip.id === state.selectedClip ? "selected" : ""}" data-clip="${esc(clip.id)}" type="button" style="left:${clip.start}%;width:${clip.width}%">${esc(clip.label)}</button>`).join("")}
        </div>
      </div>`).join("");
    qsa("[data-clip]").forEach((button) => button.addEventListener("click", () => selectClip(button.dataset.clip)));
  }

  function selectClip(id) {
    const found = getClipById(id);
    if (!found) return;
    state.selectedClip = id;
    qs("#inspector-name").textContent = found.clip.label;
    qs("#inspector-type").textContent = clipDescription(found.clip.type);
    renderTimeline();
    renderInspector();
  }

  function clipDescription(type) {
    return ({ video: "Vidéo · 4K · 25 i/s", image: "Visuel · 2K", text: "Titre animé · 4 secondes", audio: "Audio · Stéréo · 48 kHz" }[type] || "Élément de montage");
  }

  function renderInspector() {
    const pane = qs("#settings-pane");
    const type = state.inspector;
    if (type === "video") {
      pane.innerHTML = settingsMarkup(["Position", "Échelle", "Opacité"], [50, 72, 100]) + switchesMarkup(["Réduction du bruit", "Stabilisation"]);
    } else if (type === "audio") {
      pane.innerHTML = settingsMarkup(["Volume", "Fondu entrant", "Fondu sortant"], [78, 14, 16]) + switchesMarkup(["Amélioration vocale", "Normaliser le volume"]);
    } else {
      pane.innerHTML = settingsMarkup(["Exposition", "Contraste", "Saturation"], [55, 60, 63]) + switchesMarkup(["LUT cinématographique", "Vignettage"]);
    }
    qsa("input[type=range]", pane).forEach((input) => input.addEventListener("input", () => {
      input.previousElementSibling.querySelector("output").textContent = `${input.value}${input.dataset.unit || "%"}`;
    }));
  }

  function settingsMarkup(names, values) {
    return names.map((name, index) => `<div class="setting"><div class="setting-label"><span>${name}</span><output>${values[index]}%</output></div><input type="range" min="0" max="100" value="${values[index]}" aria-label="${name}" /></div>`).join("");
  }

  function switchesMarkup(names) {
    return names.map((name) => `<div class="setting-divider"><span>${name}</span><span class="status-check">● Activé</span></div>`).join("");
  }

  function renderCredits() {
    const isUnlimited = state.credits === Infinity;
    qs("#credits-count").textContent = isUnlimited ? "∞" : state.credits;
    qs(".credit-limit").textContent = isUnlimited ? "utilisation raisonnable" : `/ ${state.plan === "free" ? 20 : state.pricing.monthlyCredits} disponibles`;
    qs("#plan-label").textContent = planName(state.plan);
  }

  function planName(plan) {
    return ({ free: "Plan gratuit", monthly: "Premium mensuel", annual: "Premium annuel", unlimited: "Premium Illimité" }[plan] || "Plan gratuit");
  }

  function selectedPaymentMethod() {
    return qs('input[name="payment-method"]:checked')?.value || "Carte bancaire";
  }

  function updateCheckoutCopy() {
    const plan = state.checkoutPlan;
    const details = {
      monthly: { amount: state.pricing.monthly, suffix: "/ mois", label: "Premium mensuel" },
      annual: { amount: state.pricing.annual, suffix: "/ an", label: "Premium annuel" },
      unlimited: { amount: state.pricing.unlimited, suffix: "/ mois", label: "Premium Illimité" },
    }[plan];
    qs("#modal-price").innerHTML = `${money(details.amount)} $ <span>${details.suffix}</span>`;
    qs("#modal-subscribe").textContent = `Continuer avec ${selectedPaymentMethod()} · ${details.label}`;
  }

  function premiumDialog(plan = "monthly") {
    state.checkoutPlan = plan;
    updateCheckoutCopy();
    const dialog = qs("#premium-dialog");
    if (!dialog.open) dialog.showModal();
  }

  function buildAssets() {
    const script = qs("#script-input").value.trim();
    const wantImages = qs("#generate-image").checked;
    const wantVideo = qs("#generate-video").checked;
    const wantAudio = qs("#generate-audio").checked;
    const wantsPremiumFormat = qs("#aspect-ratio").value.includes("Premium");
    if (!script) { toast("Ajoutez une description de scène avant de générer."); return; }
    if ((wantVideo || wantsPremiumFormat) && !isPremium()) { premiumDialog(); return; }
    if (!wantImages && !wantVideo && !wantAudio) { toast("Sélectionnez au moins un type de ressource."); return; }
    const cost = (wantImages ? 3 : 0) + (wantVideo ? 8 : 0) + (wantAudio ? 1 : 0);
    if (state.credits !== Infinity && state.credits < cost) { premiumDialog(); toast("Vos crédits IA sont insuffisants."); return; }
    if (state.credits !== Infinity) state.credits -= cost;
    const text = script.replace(/\s+/g, " ").slice(0, 34);
    const assets = [];
    if (wantImages) ["image-1", "image-2", "image-3"].forEach((variant, index) => assets.push({ id: `asset-${Date.now()}-${index}`, type: "image", variant, label: `Visuel ${String.fromCharCode(65 + index)} · ${text}` }));
    if (wantVideo) assets.push({ id: `asset-${Date.now()}-video`, type: "video", variant: "video", label: `Plan vidéo · ${qs("#video-duration").value}` });
    if (wantAudio) assets.push({ id: `asset-${Date.now()}-audio`, type: "audio", variant: "audio", label: `Voix et ambiance · ${qs("#voice-style").value}` });
    state.assets = assets;
    state.selectedAsset = null;
    renderAssets();
    renderCredits();
    persist();
    qs("#generation-status").textContent = "Lot prêt à examiner";
    toast(`${assets.length} ressources préparées.`);
  }

  function renderAssets() {
    const results = qs("#asset-results");
    const insertButton = qs("#insert-assets");
    if (!state.assets.length) {
      results.innerHTML = `<div class="empty-assets">Vos propositions IA apparaîtront ici.<br />Décrivez une scène puis lancez la génération.</div>`;
      qs("#result-meta").textContent = "Aucun rendu";
      qs("#selected-asset-label").textContent = "Sélectionnez une ressource";
      insertButton.disabled = true;
      return;
    }
    qs("#result-meta").textContent = `${state.assets.length} ressources générées`;
    results.innerHTML = state.assets.map((asset) => `<button class="generated-asset ${asset.id === state.selectedAsset ? "selected" : ""}" data-asset="${esc(asset.id)}" type="button"><span class="generated-thumb ${esc(asset.variant)}"><span>${asset.type === "image" ? "Image générée" : asset.type === "video" ? "Plan IA" : "Audio IA"}</span></span><small>${esc(asset.label)}</small></button>`).join("");
    qsa("[data-asset]").forEach((button) => button.addEventListener("click", () => {
      state.selectedAsset = button.dataset.asset;
      renderAssets();
    }));
    const selected = state.assets.find((asset) => asset.id === state.selectedAsset);
    qs("#selected-asset-label").textContent = selected ? selected.label : "Sélectionnez une ressource";
    insertButton.disabled = !selected;
  }

  function insertSelectedAsset() {
    const asset = state.assets.find((item) => item.id === state.selectedAsset);
    if (!asset) return;
    const trackKind = asset.type === "image" || asset.type === "video" ? "video" : asset.type;
    let track = state.timeline.find((item) => item.kind === trackKind);
    if (!track) {
      track = { id: `track-${trackKind}-${Date.now()}`, name: trackKind === "audio" ? "Audio" : "Visuels", kind: trackKind, clips: [] };
      state.timeline.push(track);
    }
    const start = Math.min(76, 7 + track.clips.length * 18);
    const clip = { id: `clip-${Date.now()}`, label: asset.label.slice(0, 23), start, width: asset.type === "audio" ? 38 : 29, type: asset.type === "video" ? "video" : asset.type };
    track.clips.push(clip);
    selectClip(clip.id);
    persist();
    toast("Ressource ajoutée à la timeline.");
    showView("editor");
  }

  function addManualTrack() {
    const id = `track-custom-${Date.now()}`;
    state.timeline.push({ id, name: `Piste ${state.timeline.length + 1}`, kind: "video", clips: [] });
    renderTimeline();
    persist();
    toast("Nouvelle piste ajoutée.");
  }

  function handleRailTool(tool) {
    if (tool === "media") { qs("#media-upload").click(); return; }
    if (tool === "text") {
      const track = state.timeline.find((item) => item.kind === "text");
      const clip = { id: `clip-text-${Date.now()}`, label: "Nouveau titre", start: 55, width: 20, type: "text" };
      track.clips.push(clip); selectClip(clip.id); persist(); toast("Titre ajouté à la timeline."); return;
    }
    if (tool === "audio") { showView("ai"); toast("Générez une voix ou une ambiance depuis le Studio IA."); return; }
    toast(`${({ transitions: "Transitions", effects: "Effets", templates: "Modèles" }[tool])} : bibliothèque à connecter.`);
  }

  function handleUpload(file) {
    if (!file) return;
    const kind = file.type.startsWith("audio") ? "audio" : file.type.startsWith("image") ? "image" : "video";
    let track = state.timeline.find((item) => item.kind === (kind === "image" ? "video" : kind));
    if (!track) { track = { id: `track-${kind}-${Date.now()}`, name: kind === "audio" ? "Audio" : "Visuels", kind, clips: [] }; state.timeline.push(track); }
    const clip = { id: `upload-${Date.now()}`, label: file.name, start: Math.min(73, track.clips.length * 17), width: 28, type: kind };
    track.clips.push(clip);
    if (file.type.startsWith("video")) {
      const video = qs("#preview-video");
      video.src = URL.createObjectURL(file);
      video.hidden = false;
      qs("#preview-art").hidden = true;
    }
    selectClip(clip.id); persist(); toast(`${file.name} importé.`);
  }

  function renderPlans() {
    const monthly = state.pricing.monthly;
    const annual = state.pricing.annual;
    const saving = Math.round((1 - annual / (monthly * 12)) * 100);
    qs("#plan-grid").innerHTML = [
      { id: "monthly", title: "Premium mensuel", description: "La liberté de créer, sans engagement long.", price: `${money(monthly)} $`, frequency: "/ mois", features: [`${state.pricing.monthlyCredits} crédits IA / mois`, "Vidéo IA et images 4K", "Export 4K sans filigrane"], button: "Choisir mensuel" },
      { id: "annual", title: "Premium annuel", description: "Le meilleur rapport qualité-prix pour créer toute l’année.", price: `${money(annual)} $`, frequency: "/ an", savings: `${money(annual / 12)} $/mois · économisez ${saving} %`, features: [`${state.pricing.monthlyCredits} crédits IA / mois`, "Vidéo IA et images 4K", "Export 4K sans filigrane"], button: "Choisir annuel", featured: true },
      { id: "unlimited", title: "Premium Illimité", description: "Pour les créateurs qui produisent chaque jour.", price: `${money(state.pricing.unlimited)} $`, frequency: "/ mois", features: ["Générations sans plafond quotidien*", "Priorité de traitement", "Stockage et exports étendus"], button: "Choisir Illimité" },
    ].map((plan) => `<article class="plan-card ${plan.featured ? "featured" : ""}">${plan.featured ? '<span class="plan-ribbon">MEILLEUR CHOIX</span>' : ""}<h2>${plan.title}</h2><p>${plan.description}</p><div class="plan-price">${plan.price} <span>${plan.frequency}</span></div><div class="plan-savings">${plan.savings || ""}</div><ul>${plan.features.map((feature) => `<li>${feature}</li>`).join("")}</ul><button class="${plan.featured ? "primary-button" : "secondary-button"}" data-subscribe="${plan.id}" type="button">${plan.button}</button></article>`).join("");
    qsa("[data-subscribe]").forEach((button) => button.addEventListener("click", () => premiumDialog(button.dataset.subscribe)));
  }

  function subscribe(plan, paymentMethod = "Carte bancaire") {
    state.plan = plan;
    state.credits = plan === "unlimited" ? Infinity : state.pricing.monthlyCredits;
    renderCredits(); persist();
    qs("#premium-dialog").close();
    toast(`${planName(plan)} sélectionné avec ${paymentMethod}. Intégrez un prestataire de paiement pour encaisser un paiement réel.`);
  }

  function renderProjects() {
    const name = state.projectName;
    qs("#project-grid").innerHTML = [
      { title: name, date: "Modifié à l’instant", duration: "00:48:04" },
      { title: "Teaser — Côte sauvage", date: "Modifié hier", duration: "00:15:00" },
      { title: "Bande-annonce", date: "Modifié le 12 oct.", duration: "01:02:00" },
    ].map((project, index) => `<article class="project-card"><div class="project-cover"><span>${project.duration}</span></div><div class="project-card-body"><h2>${esc(project.title)}</h2><p>${project.date}</p><div class="project-card-actions"><button data-open-project="${index}" type="button">Ouvrir</button><button data-duplicate-project="${index}" type="button">⧉</button></div></div></article>`).join("");
    qsa("[data-open-project]").forEach((button) => button.addEventListener("click", () => { showView("editor"); toast("Projet ouvert."); }));
    qsa("[data-duplicate-project]").forEach((button) => button.addEventListener("click", () => toast("Copie du projet créée.")));
  }

  function renderAdmin() {
    qs("#monthly-price").value = state.pricing.monthly;
    qs("#monthly-credits").value = state.pricing.monthlyCredits;
    qs("#annual-price").value = state.pricing.annual;
    qs("#unlimited-price").value = state.pricing.unlimited;
    qs("#annual-monthly-display").textContent = `${money(state.pricing.annual / 12)} $`;
  }

  function applyPricing(event) {
    event.preventDefault();
    state.pricing.monthly = Number(qs("#monthly-price").value);
    state.pricing.monthlyCredits = Number(qs("#monthly-credits").value);
    state.pricing.annual = Number(qs("#annual-price").value);
    state.pricing.unlimited = Number(qs("#unlimited-price").value);
    if (state.plan !== "free" && state.plan !== "unlimited") state.credits = state.pricing.monthlyCredits;
    renderAdmin(); renderPlans(); renderCredits(); persist(); toast("Tarifs enregistrés localement.");
  }

  function resetPricing() {
    state.pricing = { ...defaults.pricing };
    renderAdmin(); renderPlans(); persist(); toast("Tarifs initiaux rétablis.");
  }

  function prepareExport() {
    const quality = qs("#export-quality").value;
    if (quality.includes("Premium") && !isPremium()) { qs("#export-dialog").close(); premiumDialog(); return; }
    qs("#export-message").textContent = "Démo : l’export serait envoyé au service de rendu. Connectez un moteur de rendu ou une file de tâches pour produire le fichier final.";
  }

  function init() {
    qs("#project-name").value = state.projectName;
    renderTimeline(); renderInspector(); renderCredits(); renderAssets(); renderPlans(); renderProjects(); renderAdmin();

    qsa(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    qs("#mobile-menu").addEventListener("click", () => {
      const sidebar = qs(".sidebar"); const open = !sidebar.classList.contains("open"); sidebar.classList.toggle("open", open); qs("#mobile-menu").setAttribute("aria-expanded", String(open));
    });
    qs("#project-name").addEventListener("input", (event) => { state.projectName = event.target.value || "Sans titre"; persist(); setSaved("Sauvegarde…"); });
    qsa(".rail-item").forEach((button) => button.addEventListener("click", () => { qsa(".rail-item").forEach((item) => item.classList.toggle("active", item === button)); handleRailTool(button.dataset.tool); }));
    qsa(".inspector-tab").forEach((button) => button.addEventListener("click", () => { state.inspector = button.dataset.inspector; qsa(".inspector-tab").forEach((item) => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-selected", String(active)); }); renderInspector(); }));
    qsa("[data-edit-tool]").forEach((button) => button.addEventListener("click", () => { qsa("[data-edit-tool]").forEach((item) => { const active = item === button; item.classList.toggle("selected", active); item.setAttribute("aria-pressed", String(active)); }); toast(`${button.textContent.trim()} activé.`); }));
    qs("#add-track").addEventListener("click", addManualTrack);
    qs("#media-upload").addEventListener("change", (event) => handleUpload(event.target.files[0]));
    qs("#generate-video").addEventListener("change", (event) => { if (event.target.checked && !isPremium()) { event.target.checked = false; premiumDialog(); } });
    qs("#generate-assets").addEventListener("click", buildAssets);
    qs("#insert-assets").addEventListener("click", insertSelectedAsset);
    qs("#new-project").addEventListener("click", () => { state.projectName = "Nouveau projet"; qs("#project-name").value = state.projectName; showView("editor"); toast("Nouveau projet créé."); });
    qs("#pricing-form").addEventListener("submit", applyPricing);
    qs("#restore-prices").addEventListener("click", resetPricing);
    qsa("[data-action=open-subscription]").forEach((button) => button.addEventListener("click", premiumDialog));
    qsa('input[name="payment-method"]').forEach((input) => input.addEventListener("change", updateCheckoutCopy));
    qs("#modal-subscribe").addEventListener("click", () => subscribe(state.checkoutPlan, selectedPaymentMethod()));
    qs("#modal-see-plans").addEventListener("click", () => { qs("#premium-dialog").close(); showView("subscription"); });
    qs("#export-video").addEventListener("click", () => qs("#export-dialog").showModal());
    qs("#confirm-export").addEventListener("click", prepareExport);
    qs("#play-preview").addEventListener("click", () => {
      const video = qs("#preview-video");
      if (!video.hidden) { video.paused ? video.play() : video.pause(); return; }
      const button = qs("#play-preview"); button.textContent = button.textContent === "▶" ? "Ⅱ" : "▶"; toast("Aperçu de démonstration lancé.");
    });
    qs("#fullscreen-preview").addEventListener("click", () => qs("#preview-frame").requestFullscreen?.());
    qs("#undo").addEventListener("click", () => toast("Historique d’annulation prêt à connecter."));
    qs("#redo").addEventListener("click", () => toast("Historique de rétablissement prêt à connecter."));
  }

  init();
})();
