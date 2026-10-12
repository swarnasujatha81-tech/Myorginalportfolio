(() => {
  const STORAGE_KEY = "swarna-portfolio-content";
  const AUTH_KEY = "swarna-portfolio-editor";
  const VISIT_KEY = "swarna-portfolio-visits";
  const VISITED_SESSION_KEY = "swarna-portfolio-visited-session";
  const app = document.querySelector("#app");
  const bundledData = window.PORTFOLIO_DATA;
  let data = structuredClone(bundledData);
  let editorCategory = "profile";
  let editingId = null;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const savedData = JSON.parse(saved);
      data = {
        ...data,
        ...savedData,
        profile: { ...data.profile, ...savedData.profile }
      };
      if (!Array.isArray(savedData.steps) && Array.isArray(savedData.achievements)) {
        data.steps = savedData.achievements;
        data.achievements = [];
      }
    }
  } catch (error) {
    console.error("Could not load locally saved portfolio edits.", error);
  }

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  const safeUrl = (value = "") => {
    if (/^(?:\.\/)?assets\/[a-zA-Z0-9._/-]+$/.test(value)) return value;
    if (/^data:image\/(?:jpeg|png|webp|gif);base64,[\w+/]+=*$/i.test(value)) return value;
    try {
      const url = new URL(value, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const icon = (name) => {
    const paths = {
      arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
      external: '<path d="M14 3h7v7M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      close: '<path d="m18 6-12 12M6 6l12 12"/>',
      play: '<path d="m8 5 12 7-12 7z"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  };

  const media = (src, alt, className = "", loading = "lazy") => {
    const url = safeUrl(src);
    return url
      ? `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="${loading}" onerror="${className.includes("portrait-image") ? "this.remove();this.parentElement.classList.add('portrait-missing')" : "this.remove()"}"${loading === "eager" ? ' fetchpriority="high"' : ""}>`
      : "";
  };

  const saveEditorData = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      const status = app.querySelector("#editor-status");
      if (status) status.textContent = "Saved in this browser";
    } catch (error) {
      console.error("Could not save portfolio edits.", error);
      alert("Could not save. The browser may be out of storage space. Try using image URLs instead of uploaded images.");
      throw error;
    }
  };

  const renderEditor = () => {
    document.title = "Site editor | Swarna Mohan Chowdhary";
    if (sessionStorage.getItem(AUTH_KEY) !== "true") {
      app.innerHTML = `
        <main class="admin-page">
          <header class="admin-top"><a class="wordmark" href="#">SMC<span>.</span></a><a class="back-link" href="#">View portfolio ${icon("arrow")}</a></header>
          <section class="login-panel">
            <span class="admin-label">SITE EDITOR</span>
            <h1>Edit your<br><em>portfolio.</em></h1>
            <p>Sign in to update your profile, milestones, projects, and current work.</p>
            <form id="login-form" class="admin-form">
              <label>Username<input name="username" autocomplete="username" required></label>
              <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
              <p id="login-error" class="form-error" role="alert"></p>
              <button class="button button-primary" type="submit">Open editor ${icon("arrow")}</button>
            </form>
            <p class="security-note">This browser-only editor is not secure. Its sign-in details are included in the website code. Changes are saved in this browser and are not published automatically.</p>
          </section>
        </main>`;
      app.querySelector(".back-link").addEventListener("click", (event) => {
        event.preventDefault();
        window.location.href = window.location.pathname;
      });
      app.querySelector("#login-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (form.get("username") === "mohan@2007" && form.get("password") === "mohan@2007") {
          sessionStorage.setItem(AUTH_KEY, "true");
          renderEditor();
          return;
        }
        app.querySelector("#login-error").textContent = "Username or password is incorrect.";
      });
      return;
    }

    app.innerHTML = `
      <main class="admin-page">
        <header class="admin-top"><a class="wordmark" href="#">SMC<span>.</span></a><a class="back-link" href="#">View portfolio ${icon("arrow")}</a></header>
        <section class="editor-layout">
          <aside class="editor-sidebar">
            <span class="admin-label">SITE EDITOR</span>
            <h1>Your site,<br><em>your story.</em></h1>
            <nav class="editor-nav" aria-label="Edit portfolio">
              <button class="editor-tab" data-category="profile">Your details</button>
              <button class="editor-tab" data-category="steps">Every step <span>${(data.steps || []).length}</span></button>
              <button class="editor-tab" data-category="achievements">Achievements <span>${(data.achievements || []).length}</span></button>
              <button class="editor-tab" data-category="projects">Projects <span>${data.projects.length}</span></button>
              <button class="editor-tab" data-category="current">Right now <span>${data.current.length}</span></button>
              <button class="editor-tab" data-category="participation">Participation <span>${(data.participation || []).length}</span></button>
            </nav>
            <button class="editor-logout" id="editor-logout">Sign out</button>
          </aside>
          <div class="editor-main">
            <div class="editor-toolbar">
              <span id="editor-status">Changes save in this browser</span>
              <div><button class="button button-outline" id="export-data">Export site data ${icon("arrow")}</button></div>
            </div>
            <div id="editor-content"></div>
            <aside class="publish-note"><strong>To publish your changes</strong><p>Export the site data, replace <code>portfolio-data.js</code> with the downloaded file, and upload the updated site. Browser edits alone do not change the live website.</p></aside>
          </div>
        </section>
      </main>`;

    app.querySelector(".back-link").addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = window.location.pathname;
    });
    app.querySelector("#editor-logout").addEventListener("click", () => {
      sessionStorage.removeItem(AUTH_KEY);
      renderEditor();
    });
    app.querySelector("#export-data").addEventListener("click", exportEditorData);
    app.querySelectorAll(".editor-tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.category === editorCategory);
      tab.addEventListener("click", () => {
        editorCategory = tab.dataset.category;
        app.querySelectorAll(".editor-tab").forEach((button) => button.classList.toggle("is-active", button === tab));
        renderEditorContent();
      });
    });
    renderEditorContent();
  };

  const renderEditorContent = () => {
    const target = app.querySelector("#editor-content");
    if (editorCategory === "profile") {
      target.innerHTML = `
        <div class="editor-heading"><div><span class="admin-label">PROFILE</span><h2>Your details</h2><p>Update the text and contact details displayed on your portfolio.</p></div></div>
        <form id="profile-form" class="content-form">
          <label>Full name<input name="name" value="${escapeHtml(data.profile.name)}" required></label>
          <label>Location<input name="location" value="${escapeHtml(data.profile.location)}"></label>
          <label>Role<input name="role" value="${escapeHtml(data.profile.role)}"></label>
          <label>College<input name="college" value="${escapeHtml(data.profile.college)}"></label>
          <label>Year of study<input name="year" value="${escapeHtml(data.profile.year)}"></label>
          <label>Email<input name="email" type="email" value="${escapeHtml(data.profile.email)}"></label>
          <label>Phone<input name="phone" value="${escapeHtml(data.profile.phone)}"></label>
          <label>YouTube channel URL<input name="youtube" type="url" value="${escapeHtml(data.profile.youtube)}"></label>
          <label>YouTube subscribers<input name="subscribers" value="${escapeHtml(data.profile.subscribers)}"></label>
          <label class="field-wide">Portrait image URL<input name="photo" value="${escapeHtml(data.profile.photo)}"></label>
          <label class="field-wide">Upload a portrait<input name="photoFile" type="file" accept="image/*"></label>
          <label class="field-wide">Short introduction<textarea name="intro" rows="3">${escapeHtml(data.profile.intro)}</textarea></label>
          <label class="field-wide">Your story<textarea name="story" rows="6">${escapeHtml(data.profile.story)}</textarea></label>
          <button class="button button-primary" type="submit">Save profile ${icon("arrow")}</button>
        </form>`;
      target.querySelector("#profile-form").addEventListener("submit", saveProfile);
      return;
    }

    const label = editorCategory === "current" ? "Current work" : editorCategory === "projects" ? "Projects" : editorCategory === "participation" ? "Participation" : editorCategory === "steps" ? "Every step counts" : "Achievements";
    const entries = data[editorCategory];
    target.innerHTML = `
      <div class="editor-heading"><div><span class="admin-label">${label.toUpperCase()}</span><h2>${label}</h2><p>Add, edit, or remove items shown on the public site.</p></div><button class="button button-primary" id="add-entry">+ Add item</button></div>
      <div class="entry-list">${entries.length ? entries.map((item) => `
        <article class="editor-entry"><div><span>${escapeHtml(item.category || label)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div><div class="entry-actions"><button type="button" data-edit="${escapeHtml(item.id)}">Edit</button><button type="button" data-delete="${escapeHtml(item.id)}">Delete</button></div></article>`).join("") : `<p class="editor-empty">No items yet. Add one when you are ready.</p>`}</div>
      <div id="entry-form-wrap"></div>`;
    target.querySelector("#add-entry").addEventListener("click", () => showEntryForm());
    target.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => showEntryForm(button.dataset.edit)));
    target.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteEntry(button.dataset.delete)));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const profile = { ...data.profile };
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") profile[key] = value.trim();
      }
      const image = form.get("photoFile");
      if (image instanceof File && image.size) profile.photo = await readImage(image);
      data.profile = profile;
      saveEditorData();
    } catch (error) {
      console.error("Could not update profile.", error);
      alert("Could not save the profile. Check the selected image and try again.");
    }
  };

  const showEntryForm = (id = null) => {
    editingId = id;
    const current = id ? data[editorCategory].find((entry) => entry.id === id) || {} : {};
    const isProject = editorCategory === "projects";
    const fields = [
      ["title", "Title", true],
      ["category", "Category", false],
      ...(["achievements", "steps"].includes(editorCategory) ? [["year", "Year or stage", false]] : []),
      ...(editorCategory === "achievements" ? [["certificate", "Certificate or source link", false]] : []),
      ...(editorCategory === "participation" ? [["organizer", "Organiser", false], ["date", "Date or year", false], ["certificate", "Certificate or event link", false]] : []),
      ["description", "Description", true],
      ...(isProject ? [["problem", "Problem addressed", false], ["solution", "Your approach", false], ["video", "YouTube video URL", false], ["github", "GitHub URL", false], ["images", "Photo URLs (one per line)", false]] : []),
      ...(editorCategory !== "achievements" ? [["image", "Image URL", false]] : [])
    ];
    const wrap = app.querySelector("#entry-form-wrap");
    wrap.innerHTML = `
      <form id="entry-form" class="content-form entry-form">
        <div class="entry-form-heading"><h3>${id ? "Edit item" : "Add item"}</h3><button type="button" id="cancel-entry" aria-label="Cancel">×</button></div>
        ${fields.map(([key, name, required]) => `<label class="${["description", "problem", "solution", "images"].includes(key) ? "field-wide" : ""}">${editorCategory === "participation" && key === "image" ? "Certificate image URL" : name}${["description", "problem", "solution", "images"].includes(key) ? `<textarea name="${key}" rows="3" ${required ? "required" : ""}>${escapeHtml(Array.isArray(current[key]) ? current[key].join("\n") : current[key] || "")}</textarea>` : `<input name="${key}" ${["video", "github", "certificate"].includes(key) ? 'type="url"' : "type=\"text\""} value="${escapeHtml(current[key] || "")}" ${required ? "required" : ""}>`}</label>`).join("")}
        <label class="field-wide">${editorCategory === "participation" ? "Upload certificate image" : "Upload photos"}<input type="file" name="imageFiles" accept="image/*" multiple></label>
        <div class="form-actions"><button class="button button-primary" type="submit">${id ? "Save changes" : "Add to site"} ${icon("arrow")}</button><button class="button button-outline" id="cancel-entry-secondary" type="button">Cancel</button></div>
      </form>`;
    wrap.querySelectorAll("#cancel-entry, #cancel-entry-secondary").forEach((button) => button.addEventListener("click", () => { wrap.innerHTML = ""; }));
    wrap.querySelector("#entry-form").addEventListener("submit", saveEntry);
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const item = {};
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") item[key] = value.trim();
      }
      if (item.images) item.images = item.images.split(/[\n,]+/).map((url) => url.trim()).filter(Boolean);
      else item.images = editingId ? (data[editorCategory].find((entry) => entry.id === editingId)?.images || []) : [];
      const files = [...form.getAll("imageFiles")].filter((file) => file instanceof File && file.size);
      if (files.length) {
        const uploadedImages = await Promise.all(files.map(readImage));
        if (["projects", "achievements"].includes(editorCategory)) item.images.push(...uploadedImages);
        else item.image = uploadedImages[0];
      }
      if (!item.image && item.images.length) item.image = item.images[0];
      item.id = editingId || `${editorCategory}-${Date.now().toString(36)}`;
      const entries = data[editorCategory];
      const currentIndex = entries.findIndex((entry) => entry.id === editingId);
      if (currentIndex < 0) entries.push(item);
      else entries[currentIndex] = { ...entries[currentIndex], ...item };
      saveEditorData();
      renderEditor();
    } catch (error) {
      console.error("Could not save portfolio item.", error);
      alert("Could not save this item. Try a smaller image or use an image URL.");
    }
  };

  const deleteEntry = (id) => {
    const entry = data[editorCategory].find((item) => item.id === id);
    if (!entry || !confirm(`Delete "${entry.title}"?`)) return;
    data[editorCategory] = data[editorCategory].filter((item) => item.id !== id);
    saveEditorData();
    renderEditor();
  };

  const readImage = (file) => new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load the image."));
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  const exportEditorData = () => {
    const blob = new Blob([`window.PORTFOLIO_DATA = ${JSON.stringify(data, null, 2)};\n`], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "portfolio-data.js";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (window.location.hash === "#admin") {
    renderEditor();
    return;
  }

  try {
    if (sessionStorage.getItem(VISITED_SESSION_KEY) !== "true") {
      localStorage.setItem(VISIT_KEY, String((Number(localStorage.getItem(VISIT_KEY)) || 0) + 1));
      sessionStorage.setItem(VISITED_SESSION_KEY, "true");
    }
  } catch (error) {
    console.warn("Visit count is unavailable in this browser.", error);
  }
  let visitCount = 1;
  try { visitCount = Number(localStorage.getItem(VISIT_KEY)) || 1; } catch {}

  const profile = data.profile;
  const sections = [
    { href: "#story", label: "My story" },
    { href: "#steps", label: "Every step" },
    ...(data.achievements.length ? [{ href: "#achievements", label: "Achievements" }] : []),
    ...(data.projects.length ? [{ href: "#projects", label: "Projects" }] : []),
    ...(data.current.length ? [{ href: "#now", label: "Right now" }] : [])
  ];

  const renderAchievement = (item, index) => `
    <article class="milestone-card reveal" style="--card-index:${index}">
      <div class="milestone-art">
        ${item.image
          ? media(item.image, item.title)
          : `<span class="milestone-mark" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>`}
        <span class="milestone-year">${escapeHtml(item.year)}</span>
      </div>
      <div class="milestone-info">
        <span class="item-category">${escapeHtml(item.category)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
    </article>`;

  const renderProject = (item, index) => `
    <button class="project-row reveal" type="button" data-project="${escapeHtml(item.id)}">
      <span class="project-number">${String(index + 1).padStart(2, "0")}</span>
      ${(item.image || item.images?.[0]) ? `<span class="project-image">${media(item.image || item.images[0], item.title)}</span>` : ""}
      <span class="project-name">
        <span>${escapeHtml(item.category || "Project")}</span>
        <strong>${escapeHtml(item.title)}</strong>
      </span>
      <span class="project-arrow">${icon("arrow")}</span>
    </button>`;

  const renderContactLinks = () => [
    profile.email ? `<a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)} ${icon("arrow")}</a>` : "",
    profile.phone ? `<a href="tel:${escapeHtml(profile.phone)}">${escapeHtml(profile.phone)} ${icon("arrow")}</a>` : ""
  ].filter(Boolean).join("");

  document.title = `${profile.name} | Mechanical Engineering Student`;
  app.innerHTML = `
    <header class="site-header">
      <a class="wordmark" href="#" aria-label="${escapeHtml(profile.name)} home">SMC<span>.</span></a>
      <nav class="main-nav" aria-label="Main navigation">
        ${sections.map((section) => `<a href="${section.href}">${section.label}</a>`).join("")}
      </nav>
      ${profile.email || profile.phone
        ? `<a class="nav-contact" href="#contact">Say hello ${icon("arrow")}</a>`
        : ""}
    </header>

    <main>
      <section class="hero section-shell">
        <div class="hero-copy">
          <p class="eyebrow reveal">MECHANICAL ENGINEERING · JNTUH</p>
          <h1 class="reveal">A long way<br><span>from ordinary.</span></h1>
          <p class="hero-intro reveal">${escapeHtml(profile.intro)}</p>
          <div class="hero-links reveal">
            ${data.projects.length
              ? `<a class="button button-primary" href="#projects">Explore my work ${icon("arrow")}</a>`
              : ""}
            <a class="text-link" href="#story">A little about me</a>
          </div>
          <div class="hero-aside"><span class="hero-rule"></span><span>Curiosity first.<br>Then make it real.</span></div>
        </div>
        <figure class="hero-portrait reveal">
          ${media(profile.photo, `${profile.name} at a cricket stadium`, "portrait-image", "eager")}
          <figcaption><span>${escapeHtml(profile.location)}</span><span>Engineering student · Cricket player</span></figcaption>
        </figure>
      </section>

      <section class="story-section section-shell" id="story">
        <div class="section-kicker"><span>THE PERSON BEHIND THE WORK</span></div>
        <div class="story-layout">
          <h2 class="reveal">Where I began is<br>part of <em>who I am.</em></h2>
          <div class="story-copy reveal">
            <p>${escapeHtml(profile.story)}</p>
            <dl class="education-list">
              <div><dt>School</dt><dd>Government school, Ameerpet <span>90%</span></dd></div>
              <div><dt>Intermediate</dt><dd>MPC <span>98%</span></dd></div>
              <div><dt>Now</dt><dd>${escapeHtml(profile.year)} · ${escapeHtml(profile.college)}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      ${data.steps?.length ? `
        <section class="milestones-section section-shell" id="steps">
          <div class="section-kicker"><span>MY JOURNEY SO FAR</span></div>
          <div class="section-heading">
            <h2>Every step<br>counts.</h2>
            <p>Each achievement is a reminder to keep learning and moving forward.</p>
          </div>
          <div class="milestone-track" aria-label="Achievements">
            ${data.steps.map(renderAchievement).join("")}
          </div>
        </section>` : ""}

      ${data.achievements?.length ? `
        <section class="achievements-section section-shell" id="achievements">
          <div class="section-kicker"><span>ACHIEVEMENTS</span></div>
          <div class="section-heading">
            <h2>Achievements</h2>
            <p>Certificates, recognition, and milestones I have earned along the way.</p>
          </div>
          <div class="achievement-grid">
            ${data.achievements.map((item, index) => {
              const photos = [...new Set([...(item.images || []), item.image].filter(Boolean))];
              const certificateUrl = safeUrl(item.certificate);
              return `<article class="achievement-card reveal" style="--card-index:${index}">
                ${photos.length ? `<div class="achievement-photo-grid">${photos.map((photo, photoIndex) => `<a class="achievement-photo" href="${escapeHtml(safeUrl(photo))}" target="_blank" rel="noreferrer" aria-label="Open photo ${photoIndex + 1} for ${escapeHtml(item.title)}">${media(photo, `${item.title} photo ${photoIndex + 1}`)}</a>`).join("")}</div>` : `<div class="achievement-photo-placeholder"><span>${String(index + 1).padStart(2, "0")}</span></div>`}
                <div class="achievement-copy">
                  <span class="item-category">${escapeHtml(item.category || "Achievement")}${item.year ? ` - ${escapeHtml(item.year)}` : ""}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.description)}</p>
                  ${certificateUrl ? `<a class="certificate-link" href="${escapeHtml(certificateUrl)}" target="_blank" rel="noreferrer">View certificate or details ${icon("external")}</a>` : ""}
                </div>
              </article>`;
            }).join("")}
          </div>
        </section>` : ""}

      <section class="creator-section section-shell" id="creator">
        <div class="section-kicker"><span>BEYOND THE CLASSROOM</span></div>
        <div class="creator-note">
          <strong class="creator-number">${escapeHtml(profile.subscribers || "7,000+")}</strong>
          <p>YouTube subscribers built alongside my mechanical engineering journey. I also play cricket and bring that same team spirit to everything I do.</p>
          ${profile.youtube && safeUrl(profile.youtube) ? `<a href="${escapeHtml(safeUrl(profile.youtube))}" target="_blank" rel="noreferrer">Visit my channel ${icon("external")}</a>` : ""}
        </div>
      </section>

      ${data.projects.length ? `
        <section class="projects-section section-shell" id="projects">
          <div class="section-kicker"><span>MADE WITH A REASON</span></div>
          <div class="section-heading">
            <h2>Ideas, put<br>to work.</h2>
            <p>Selected engineering projects and the thinking behind them.</p>
          </div>
          <div class="project-list">${data.projects.map(renderProject).join("")}</div>
        </section>` : ""}

      ${data.current.length ? `
        <section class="now-section section-shell" id="now">
          <div class="section-kicker"><span>IN PROGRESS</span></div>
          <div class="now-heading">
            <h2>What I am<br>working on.</h2>
            <p>Current learning and projects.</p>
          </div>
          <div class="now-list">
            ${data.current.map((item, index) => `
              <article class="now-item reveal">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>
                <span class="now-tag">${escapeHtml(item.category || "In progress")}</span>
              </article>`).join("")}
          </div>
        </section>` : ""}

      ${profile.email || profile.phone ? `
        <section class="contact-section section-shell" id="contact">
          <div class="section-kicker"><span>GET IN TOUCH</span></div>
          <div class="contact-body">
            <h2>Have something<br>in mind?</h2>
            <p>For projects, ideas, or a conversation about engineering, I would be glad to hear from you.</p>
            <div class="contact-links">${renderContactLinks()}</div>
          </div>
        </section>` : ""}

      ${data.participation?.length ? `
        <section class="participation-section section-shell" id="participation">
          <div class="section-kicker"><span>SHOWING UP AND TAKING PART</span></div>
          <div class="section-heading">
            <h2>Where I have<br><em>participated.</em></h2>
            <p>Events, competitions, and experiences that have shaped my journey.</p>
          </div>
          <div class="participation-grid">
            ${data.participation.map((item, index) => {
              const certUrl = safeUrl(item.certificate);
              const certImage = item.image || item.images?.[0] || "";
              const isPdf = certUrl && (/\.(?:pdf)(?:$|[?#])/i.test(certUrl) || certUrl.startsWith("data:application/pdf;base64,"));
              const certificate = isPdf
                ? `<a class="certificate-link" href="${escapeHtml(certUrl)}" target="_blank" rel="noreferrer">View certificate ${icon("external")}</a>`
                : certImage
                  ? `<a class="certificate-preview" href="${escapeHtml(certUrl || safeUrl(certImage))}" target="_blank" rel="noreferrer">${media(certImage, `${item.title} certificate`)}<span>View certificate ${icon("external")}</span></a>`
                  : certUrl ? `<a class="certificate-link" href="${escapeHtml(certUrl)}" target="_blank" rel="noreferrer">View event or certificate ${icon("external")}</a>` : "";
              return `<article class="participation-card reveal" style="--card-index:${index}">
                <span class="participation-number">${String(index + 1).padStart(2, "0")}</span>
                <span class="item-category">${escapeHtml(item.category || "Participation")}</span>
                <h3>${escapeHtml(item.title)}</h3>
                ${(item.organizer || item.date) ? `<p class="participation-meta">${[item.organizer, item.date].filter(Boolean).map(escapeHtml).join(" | ")}</p>` : ""}
                <p>${escapeHtml(item.description)}</p>
                ${certificate}
              </article>`;
            }).join("")}
          </div>
        </section>` : ""}
    </main>

    <footer class="site-footer">
      <a class="wordmark" href="#" aria-label="${escapeHtml(profile.name)} home">SMC<span>.</span></a>
      <span class="visit-count">${visitCount} visits on this browser</span>
      <span>© ${new Date().getFullYear()} ${escapeHtml(profile.name)}</span>
      <a class="editor-link" href="#admin">Edit site</a>
    </footer>

    ${data.projects.length ? `
      <dialog class="project-dialog" id="project-dialog" aria-labelledby="dialog-title">
        <button class="dialog-close" type="button" aria-label="Close project details">${icon("close")}</button>
        <div id="dialog-content"></div>
      </dialog>` : ""}`;

  const observeReveals = () => {
    const elements = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    }), { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
  };

  const openProject = (id) => {
    const item = data.projects.find((project) => project.id === id);
    if (!item) return;
    const links = [
      item.video && safeUrl(item.video)
        ? `<a href="${escapeHtml(safeUrl(item.video))}" target="_blank" rel="noreferrer">${icon("play")} Watch video</a>`
        : "",
      item.github && safeUrl(item.github)
        ? `<a href="${escapeHtml(safeUrl(item.github))}" target="_blank" rel="noreferrer">${icon("external")} View source</a>`
        : ""
    ].filter(Boolean).join("");

    app.querySelector("#dialog-content").innerHTML = `
      ${(() => { const gallery = [...new Set([...(item.images || []), item.image].filter(Boolean))]; return gallery.length ? `<div class="dialog-gallery">${gallery.map((src) => media(src, item.title)).join("")}</div>` : ""; })()}
      <span class="item-category">${escapeHtml(item.category || "Project")}</span>
      <h2 id="dialog-title">${escapeHtml(item.title)}</h2>
      <p class="dialog-description">${escapeHtml(item.description)}</p>
      ${item.problem ? `<h3>The problem</h3><p>${escapeHtml(item.problem)}</p>` : ""}
      ${item.solution ? `<h3>My approach</h3><p>${escapeHtml(item.solution)}</p>` : ""}
      ${(() => { const videoId = item.video?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)?.[1]; return videoId ? `<div class="dialog-video"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="${escapeHtml(item.title)} video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>` : ""; })()}
      ${links ? `<div class="dialog-links">${links}</div>` : ""}`;
    app.querySelector("#project-dialog").showModal();
  };

  if (data.projects.length) {
    app.querySelectorAll("[data-project]").forEach((button) => {
      button.addEventListener("click", () => openProject(button.dataset.project));
    });
    app.querySelector(".dialog-close").addEventListener("click", () => {
      app.querySelector("#project-dialog").close();
    });
    app.querySelector("#project-dialog").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
  }

  observeReveals();
  window.addEventListener("hashchange", () => window.location.reload());
})();

