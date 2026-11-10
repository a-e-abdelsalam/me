// ==========================================================================
// MAIN PORTFOLIO CONTROLLER & INTERACTION HUB
// Filtering, Search, Bilingual i18n, Interactive WhatsApp Quote Engine
// ==========================================================================

// ==========================================================================
// CONFIG NORMALIZATION
// Forged configurations may carry a Drive link in any shape (share URL,
// preview URL, or bare ID). Normalize every record and forge the missing
// stream / thumbnail fields so the gallery and player just work.
// ==========================================================================
function extractDriveId(raw) {
  if (!raw) return '';
  raw = String(raw).trim();
  if (/^[A-Za-z0-9_-]{25,}$/.test(raw)) return raw;
  const patterns = [
    /\/file\/d\/([A-Za-z0-9_-]{10,})/,
    /\/d\/([A-Za-z0-9_-]{10,})/,
    /[?&]id=([A-Za-z0-9_-]{10,})/
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m && m[1]) return m[1];
  }
  return '';
}

function normalizeProjects(arr) {
  return arr.map((raw, idx) => {
    const p = Object.assign({}, raw);
    p.id       = Number(p.id) || idx + 1;
    p.folder   = p.folder || '';
    p.name     = p.name || p.title_ar || p.title_en || `Video ${p.id}`;
    p.file     = p.file || '';
    p.sizeMB   = Number(p.sizeMB) || 0;
    p.category = p.category || 'ads';
    p.aspect   = p.aspect || '9:16';
    p.client   = p.client || '';
    p.title_ar = p.title_ar || p.title_en || p.name;
    p.title_en = p.title_en || p.title_ar;
    p.desc_ar  = p.desc_ar || '';
    p.desc_en  = p.desc_en || '';
    p.tags     = Array.isArray(p.tags) ? p.tags : [];
    p.featured = !!p.featured;

    const id = p.drive_id || extractDriveId(p.embed_url) || extractDriveId(p.drive_url);
    if (id) {
      p.drive_id      = id;
      p.drive_url     = p.drive_url || `https://drive.google.com/file/d/${id}/view?usp=sharing`;
      p.embed_url     = p.embed_url || `https://drive.google.com/file/d/${id}/preview`;
      p.thumbnail_url = p.thumbnail_url || `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1280`;
    } else {
      p.drive_id = p.drive_id || '';
      p.drive_url = p.drive_url || '';
      p.embed_url = p.embed_url || '';
      p.thumbnail_url = p.thumbnail_url || '';
    }
    return p;
  });
}

// ==========================================================================
// REMOTE CONFIGURATION LOADER (Google Drive workflow)
// On a host, projects.json is the forged configuration carrying the
// Drive links — loading it over HTTP means videos never touch the host.
// Locally (file://), the bundled js/data.js remains the source of truth.
// ==========================================================================
async function loadProjectsJsonIfHosted() {
  if (!location.protocol.startsWith('http')) {
    applyAdminLiveData();
    return;
  }
  try {
    const res = await fetch('projects.json', { cache: 'no-store' });
    if (!res.ok) {
      applyAdminLiveData();
      return;
    }
    const cfg = await res.json();
    const arr = Array.isArray(cfg) ? cfg
      : (Array.isArray(cfg.projects) ? cfg.projects : null);
    if (arr && arr.length) {
      // Replace bundled data in place (PROJECTS_DATA is a const array)
      PROJECTS_DATA.splice(0, PROJECTS_DATA.length, ...normalizeProjects(arr));
      console.log(`[Config] Loaded ${arr.length} projects from projects.json`);
    }
  } catch (e) {
    console.warn('[Config] projects.json unavailable — using bundled data:', e.message);
  }
  // Admin Studio "Save & Live Apply" data wins so freshly forged links
  // can be previewed in the same browser without redeploying anything.
  applyAdminLiveData();
}

// Projects crafted by admin.html are stored in browser memory — prefer
// them over the shipped files so changes preview instantly.
function applyAdminLiveData() {
  try {
    const saved = localStorage.getItem('portfolio_admin_data_v1');
    if (!saved) return false;
    const arr = JSON.parse(saved);
    if (!Array.isArray(arr) || !arr.length) return false;
    PROJECTS_DATA.splice(0, PROJECTS_DATA.length, ...normalizeProjects(arr));
    console.log(`[Config] Using Admin Studio live data (${arr.length} projects)`);
    return true;
  } catch (e) {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  // Pull the forged projects.json first (hosting workflow), so the
  // gallery renders with the latest Drive configuration.
  await loadProjectsJsonIfHosted();

  // State
  let currentLang = localStorage.getItem('portfolio_lang') || 'ar';
  let activeCategory = 'all';
  let activeAspect = 'all';
  let searchQuery = '';
  let filteredProjects = [...PROJECTS_DATA];

  // DOM Elements
  const projectsGrid = document.getElementById('projectsGrid');
  const featuredGrid = document.getElementById('featuredGrid');
  const searchInput = document.getElementById('searchInput');
  const categoryChips = document.querySelectorAll('.chip-btn');
  const formatButtons = document.querySelectorAll('.btn-format');
  const langToggleBtn = document.getElementById('langToggleBtn');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const showreelHeroBtn = document.getElementById('heroShowreelBtn');

  // WhatsApp Calculator DOM
  const calcService = document.getElementById('calcService');
  const calcQty = document.getElementById('calcQty');
  const calcUrgency = document.getElementById('calcUrgency');
  const calcPreview = document.getElementById('calcSummaryPreview');
  const calcSubmitBtn = document.getElementById('calcSubmitBtn');

  // Initialize
  initLanguage();
  PlayerEngine.init();
  updateCategoryCounts();
  renderFeaturedShowcase();
  applyFiltersAndRender();
  initWhatsAppCalculator();
  bindGlobalEvents();

  // ========================================================================
  // BILINGUAL & LOCALIZATION SYSTEM (AR / EN)
  // ========================================================================
  function initLanguage() {
    applyLanguage(currentLang);
    langToggleBtn.addEventListener('click', function() {
      currentLang = currentLang === 'ar' ? 'en' : 'ar';
      localStorage.setItem('portfolio_lang', currentLang);
      applyLanguage(currentLang);
      renderFeaturedShowcase();
      applyFiltersAndRender();
      updateCalcSummary();
    });
  }

  function applyLanguage(lang) {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    
    // Update Toggle Button Text
    langToggleBtn.innerHTML = lang === 'ar' 
      ? `<span>🇬🇧</span><span>English</span>`
      : `<span>🇸🇦</span><span>عربي</span>`;

    const dict = I18N[lang];
    if (!dict) return;

    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    document.title = dict['site_title'] || document.title;
  }

  // ========================================================================
  // FEATURED SHOWCASE RENDERING
  // ========================================================================
  function renderFeaturedShowcase() {
    if (!featuredGrid) return;
    const isAr = currentLang === 'ar';
    const featuredItems = PROJECTS_DATA.filter(p => p.featured).slice(0, 3);
    
    featuredGrid.innerHTML = '';
    featuredItems.forEach(item => {
      const card = createVideoCardElement(item, isAr, true);
      featuredGrid.appendChild(card);
    });
  }

  // ========================================================================
  // MAIN GALLERY RENDERING & FILTERING
  // ========================================================================
  function updateCategoryCounts() {
    const counts = {
      all: PROJECTS_DATA.length,
      ads: PROJECTS_DATA.filter(p => p.category === 'ads').length,
      ugc: PROJECTS_DATA.filter(p => p.category === 'ugc').length,
      medical: PROJECTS_DATA.filter(p => p.category === 'medical').length,
      podcast: PROJECTS_DATA.filter(p => p.category === 'podcast').length,
      animation: PROJECTS_DATA.filter(p => p.category === 'animation').length
    };

    document.querySelectorAll('.chip-btn').forEach(btn => {
      const cat = btn.getAttribute('data-category');
      const countBadge = btn.querySelector('.chip-count');
      if (countBadge && counts[cat] !== undefined) {
        countBadge.textContent = counts[cat];
      }
    });
  }

  function applyFiltersAndRender() {
    const isAr = currentLang === 'ar';
    const q = searchQuery.trim().toLowerCase();

    filteredProjects = PROJECTS_DATA.filter(item => {
      // Category Match
      const matchesCategory = (activeCategory === 'all' || item.category === activeCategory);

      // Aspect Ratio Match
      const matchesAspect = (activeAspect === 'all' || item.aspect === activeAspect);

      // Search Query Match (Title AR/EN, Client, Category, Tags)
      const matchesSearch = !q || (
        item.title_ar.toLowerCase().includes(q) ||
        item.title_en.toLowerCase().includes(q) ||
        item.client.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );

      return matchesCategory && matchesAspect && matchesSearch;
    });

    // Update Player Playlist with current filtered items
    PlayerEngine.updateActivePlaylist(filteredProjects);

    // Render cards
    projectsGrid.innerHTML = '';

    if (filteredProjects.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-gallery';
      emptyDiv.innerHTML = `
        <div class="empty-icon">🎬</div>
        <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; color: #fff;">
          ${isAr ? I18N.ar.empty_results : I18N.en.empty_results}
        </h3>
        <button id="resetFiltersEmptyBtn" class="btn-primary" style="margin-top: 1rem; padding: 0.6rem 1.4rem;">
          ${isAr ? I18N.ar.btn_clear_filters : I18N.en.btn_clear_filters}
        </button>
      `;
      projectsGrid.appendChild(emptyDiv);

      document.getElementById('resetFiltersEmptyBtn').addEventListener('click', resetFilters);
      return;
    }

    filteredProjects.forEach(item => {
      const card = createVideoCardElement(item, isAr, false);
      projectsGrid.appendChild(card);
    });
  }

  function createVideoCardElement(item, isAr, isFeaturedShowcase) {
    const card = document.createElement('div');
    const ratioClass = item.aspect === '16:9' ? 'ratio-horizontal' : 'ratio-vertical';
    card.className = `video-card ${ratioClass}`;
    card.setAttribute('data-id', item.id);

    const title = isAr ? item.title_ar : item.title_en;
    const desc = isAr ? item.desc_ar : item.desc_en;
    const categoryLabel = item.category.toUpperCase();

    // ---- Source resolution:
    // Hosted (http/https): Drive-linked projects stream from Google — the
    // host never stores the video, so show the Drive thumbnail.
    // Local (file://): the bundled asset wins for instant hover previews.
    const isHosted = location.protocol.startsWith('http');
    const driveLinked = !!(item.drive_id || item.embed_url);
    const driveThumb = item.thumbnail_url
      || (item.drive_id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(item.drive_id)}&sz=w1280` : '');
    const useLocalVideo = !!item.file && (!isHosted || !driveLinked);
    let mediaHtml;
    if (useLocalVideo) {
      mediaHtml = `
        <video 
          class="video-thumb" 
          src="${encodeURI(item.file)}" 
          preload="metadata" 
          muted 
          playsinline 
          loop>
        </video>`;
    } else if (driveThumb) {
      mediaHtml = `
        <img class="video-thumb drive-thumb" 
          src="${driveThumb}" 
          alt="${title.replace(/"/g, '&quot;')}" 
          loading="lazy"
          onerror="this.outerHTML='<div class=&quot;video-thumb drive-thumb video-thumb-empty&quot;>🎬</div>'">`;
    } else {
      mediaHtml = `
        <div class="video-thumb drive-thumb video-thumb-empty">🎬</div>`;
    }
    const sizeLabel = (driveLinked && isHosted) ? '☁️ Drive' : (item.sizeMB ? `${item.sizeMB} MB` : '☁️ Drive');

    // HTML Structure
    card.innerHTML = `
      <div class="video-media-wrapper">
        ${mediaHtml}

        <div class="card-badge-top">
          <span class="badge-tag ${item.category}">${categoryLabel}</span>
          <span class="badge-aspect">${item.aspect || '9:16'}</span>
        </div>

        ${item.featured ? `
          <div class="card-featured-star" title="Featured Project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </div>
        ` : ''}

        ${!useLocalVideo && driveLinked ? `
          <div class="card-drive-badge">☁️ Google Drive</div>
        ` : ''}

        <div class="play-overlay">
          <div class="play-btn-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        <div class="card-progress-bar">
          <div class="card-progress-fill"></div>
        </div>
      </div>

      <div class="card-info">
        <div class="card-client-row">
          <span>${item.client}</span>
          <span style="opacity: 0.7; font-size: 0.75rem;">${sizeLabel}</span>
        </div>
        <h3 class="card-title">${title}</h3>
        <p class="card-desc">${desc}</p>
        <div class="card-tags">
          ${item.tags.map(t => `<span class="tag-pill">#${t}</span>`).join('')}
        </div>
      </div>
    `;

    const videoEl = card.querySelector('video');
    if (videoEl) {
      PlayerEngine.attachCardHoverListeners(card, videoEl, item);
    } else {
      // Drive-only project: there is no local file to hover-preview.
      // Clicking still opens the Cinema modal streaming from Drive.
      card.addEventListener('click', function(e) {
        if (e.target.closest('.no-modal-trigger')) return;
        PlayerEngine.openCinema(item, filteredProjects);
      });
    }

    return card;
  }

  function resetFilters() {
    activeCategory = 'all';
    activeAspect = 'all';
    searchQuery = '';
    if (searchInput) searchInput.value = '';

    categoryChips.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-category') === 'all');
    });
    formatButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-aspect') === 'all');
    });

    applyFiltersAndRender();
  }

  // ========================================================================
  // CATEGORY & SEARCH EVENT BINDINGS
  // ========================================================================
  categoryChips.forEach(btn => {
    btn.addEventListener('click', function() {
      categoryChips.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-category');
      applyFiltersAndRender();
    });
  });

  formatButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      formatButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeAspect = btn.getAttribute('data-aspect');
      applyFiltersAndRender();
    });
  });

  if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value;
        applyFiltersAndRender();
      }, 150);
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', resetFilters);
  }

  // Hero Showreel Button - opens the flagship commercial
  if (showreelHeroBtn) {
    showreelHeroBtn.addEventListener('click', function() {
      // Pick the top commercial (e.g. R Store or Be Expo or Sunekos Master)
      const flagship = PROJECTS_DATA.find(p => p.name.includes('R Store - بالعكس أوفر')) 
                    || PROJECTS_DATA.find(p => p.featured) 
                    || PROJECTS_DATA[0];
      PlayerEngine.openCinema(flagship, PROJECTS_DATA.filter(p => p.featured));
    });
  }

  // ========================================================================
  // INTERACTIVE WHATSAPP QUOTE GENERATOR
  // ========================================================================
  function initWhatsAppCalculator() {
    if (!calcService || !calcQty || !calcUrgency || !calcSubmitBtn) return;

    [calcService, calcQty, calcUrgency].forEach(el => {
      el.addEventListener('change', updateCalcSummary);
    });

    updateCalcSummary();

    calcSubmitBtn.addEventListener('click', function() {
      const isAr = currentLang === 'ar';
      const targetPhone = "201113320114"; // Official WhatsApp

      const serviceText = calcService.options[calcService.selectedIndex].text;
      const qtyText = calcQty.options[calcQty.selectedIndex].text;
      const urgencyText = calcUrgency.options[calcUrgency.selectedIndex].text;

      let msg = "";
      if (isAr) {
        msg = `مرحباً أستاذ أحمد! أرغب في بدء مشروع مونتاج فيديو بالمواصفات التالية:
📌 نوع الخدمة: ${serviceText}
📊 عدد الفيديوهات: ${qtyText}
⚡ الجدول الزمني: ${urgencyText}
يرجى إفادتي بالتكلفة والموعد المتاح لبدء العمل.`;
      } else {
        msg = `Hello Ahmed! I would like to start a video editing project with the following details:
📌 Service Required: ${serviceText}
📊 Scope / Quantity: ${qtyText}
⚡ Turnaround: ${urgencyText}
Please let me know the availability and estimated quote.`;
      }

      const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    });
  }

  function updateCalcSummary() {
    if (!calcPreview) return;
    const isAr = currentLang === 'ar';
    const serviceText = calcService.options[calcService.selectedIndex].text;
    const qtyText = calcQty.options[calcQty.selectedIndex].text;
    const urgencyText = calcUrgency.options[calcUrgency.selectedIndex].text;

    if (isAr) {
      calcPreview.innerHTML = `
        🚀 <strong>ملخص طلبك:</strong> ${serviceText} | <strong>النطاق:</strong> ${qtyText} | <strong>التسليم:</strong> ${urgencyText}.
        <br><span style="font-size: 0.85rem; opacity: 0.8;">سيتم فتح محادثة واتساب فوري مع كافة التفاصيل جاهزة للإرسال بنقرة واحدة!</span>
      `;
    } else {
      calcPreview.innerHTML = `
        🚀 <strong>Project Summary:</strong> ${serviceText} | <strong>Scope:</strong> ${qtyText} | <strong>Delivery:</strong> ${urgencyText}.
        <br><span style="font-size: 0.85rem; opacity: 0.8;">Clicking below will open WhatsApp with all specifications pre-filled!</span>
      `;
    }
  }

  // ========================================================================
  // GLOBAL NAVIGATION & UI INTERACTIONS
  // ========================================================================
  function bindGlobalEvents() {
    // Header shadow on scroll
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', function() {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });

    // Smooth scroll for nav anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
});
