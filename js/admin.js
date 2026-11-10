// ==========================================================================
// ADMIN STUDIO — GOOGLE DRIVE JSON FORGE
// Craft / edit / export the portfolio video configuration (projects.json).
// Videos live on Google Drive; nothing gets uploaded to the host directly.
// ==========================================================================

const AdminApp = (function() {

  // ========================================================================
  // CONSTANTS & STATE
  // ========================================================================
  const STORAGE_KEY  = 'portfolio_admin_data_v1';
  const LANG_KEY     = 'portfolio_admin_lang';

  let projects    = [];      // working copy of the configuration
  let dirty       = false;   // changes not yet saved to browser memory
  let editingId   = null;    // project id currently open in the modal
  let concernsLang= 'ar';

  let adminSearchQuery  = '';
  let adminCategoryFilter = 'all';
  let adminDriveFilter    = 'all';

  let benchCurrentId = '';   // last Drive ID forged in the bench tool

  // Admin UI dictionary (AR / EN)
  const TI = {
    ar: {
      save_live: 'حفظ وتطبيق فوري', download_json: 'تحميل projects.json',
      download_js: 'تحميل data.js', copy_json: 'نسخ JSON', import_json: 'استيراد JSON',
      restore: 'استعادة الأصل', view_site: 'عرض الموقع ↗',
      kpi_total: 'إجمالي المشاريع', kpi_drive: 'مربوطة بـ Google Drive',
      kpi_local: 'ملفات محلية / غير مربوطة', kpi_featured: 'مشاريع مميزة (Featured)',
      bench_title: '⚡ أداة تحويل وفحص روابط Google Drive المباشرة',
      bench_badge: 'Zero Storage • High Performance',
      bench_desc: 'ضع أي رابط من Google Drive (رابط مشاركة، رابط تشغيل، أو الـ ID فقط) وسيتم استخراج معرّف الفيديو وتوليد رابط المشاهدة السلس ورابط الصورة المصغرة بأعلى جودة.',
      bench_placeholder: 'ألصق رابط Google Drive هنا (مثال: https://drive.google.com/file/d/1XyZ.../view?usp=sharing)...',
      bench_extract: 'استخراج وفحص البث', bench_stream: '● بث تجريبي مباشر من Google Drive',
      bench_close: '✕ إغلاق المعاينة', bench_assign: 'تعيين هذا الرابط لمشروع:',
      bench_apply: 'تطبيق على المشروع المحدد ✓', bench_pick: '— اختر مشروعاً —',
      search_ph: 'ابحث بالعنوان، العميل، أو الكلمات الدلالية...',
      cat_all: 'كل التصنيفات (All Categories)', cat_ads: 'إعلانات تجارية (Commercials)',
      cat_ugc: 'حملات UGC (UGC Campaigns)', cat_medical: 'فيديوهات طبية وتجميل (Medical & Clinics)',
      cat_podcast: 'بودكاست ومقابلات (Podcasts & Interviews)', cat_animation: 'موشن وريسكاب (Motion & Recap)',
      src_all: 'كل الحالات (All Sources)', src_drive: 'مربوطة بـ Google Drive فقط',
      src_local: 'ملفات محلية / بحاجة لرابط Drive',
      add_new: 'إضافة مشروع جديد',
      tab_table: '📋 جدول سريع (Bulk Table)', tab_cards: '🎴 بطاقات بصرية (Cards)',
      tab_json: '💻 محرر JSON (Code)',
      th_index: '#', th_preview: 'المعاينة', th_name: 'اسم المشروع والعميل',
      th_cat: 'التصنيف', th_aspect: 'الأبعاد', th_drive: 'رابط Google Drive (لصق سريع)',
      th_stream: 'حالة البث', th_feat: 'مميز؟', th_actions: 'إجراءات',
      json_title: 'محرر الـ JSON المباشر',
      json_sub: 'يمكنك تعديل أي بيانات هنا مباشرة، والضغط على "تطبيق الـ JSON" لتحديث الجدول والموقع.',
      json_format: 'تنسيق (Format)', json_apply: 'تطبيق الـ JSON (Apply)',
      modal_title_edit: 'تعديل بيانات المشروع', modal_title_add: 'إضافة مشروع جديد',
      modal_sub: 'تعديل بيانات الفيديو، الروابط، والنصوص باللغتين العربية والإنجليزية.',
      f_title_ar: 'عنوان الفيديو بالعربية *', f_title_en: 'Video Title (English) *',
      f_cat: 'التصنيف (Category) *', f_aspect: 'أبعاد الفيديو (Aspect Ratio) *',
      f_client: 'اسم العميل / البراند *', f_feat: '⭐ تمييز في الواجهة الرئيسية (Featured)',
      f_drive: 'رابط أو معرف Google Drive (Streaming Video Link or ID)',
      f_drive_ph: 'ألصق رابط المشاركة من Google Drive هنا وسيقوم النظام بتوليد رابط البث والصورة تلقائياً...',
      f_parse: 'تحليل الرابط ⚡', f_drive_id: 'Drive File ID', f_embed: 'Embed Stream URL',
      f_thumb: 'رابط الصورة المصغرة (Thumbnail URL)',
      f_local: 'مسار الملف المحلي (Local Fallback File)',
      f_size: 'حجم الملف بالـ MB التقريبي', f_tags: 'الكلمات الدلالية (Tags - مفصولة بفواصل)',
      f_desc_ar: 'وصف المشروع بالعربية', f_desc_en: 'Project Description (English)',
      m_cancel: 'إلغاء', m_save: 'حفظ التغييرات ✓',
      st_drive: 'Drive ✓', st_local: 'محلي',
      drive_short: 'ألصق رابط Drive أو الـ ID فقط...',
      del_title: 'تأكيد الحذف', del_msg: 'هل تريد حذف هذا المشروع من الإعدادات؟',
      t_save_ok: 'تم الحفظ في ذاكرة المتصفح — افتح الموقع لمعاينة التغييرات مباشرة',
      t_json_ok: 'تم تحميل الملف بنجاح ✓', t_copy_ok: 'تم نسخ الـ JSON إلى الحافظة ✓',
      t_import_ok: 'تم استيراد الإعدادات — راجع البيانات ثم اضغط "حفظ وتطبيق فوري"',
      t_import_err: 'ملف JSON غير صالح — تأكد أنه مصفوفة مشاريع صحيحة',
      t_apply_ok: 'تم تطبيق الـ JSON على الواجهة ✓', t_apply_err: 'صيغة JSON غير صحيحة — راجع الأخطاء',
      t_format_err: 'لا يمكن التنسيق — يوجد خطأ في صيغة الـ JSON',
      t_restore: 'تمت استعادة البيانات الأصلية من js/data.js',
      t_lost: 'تنبيه: تغييرات غير محفوظة!', t_unsaved: 'حفظ',
      no_thumb: 'لا صورة', no_desc: 'لا يوجد وصف.'
    },
    en: {
      save_live: 'Save & Live Apply', download_json: 'Download projects.json',
      download_js: 'Download data.js', copy_json: 'Copy JSON', import_json: 'Import JSON',
      restore: 'Restore Original', view_site: 'View Site ↗',
      kpi_total: 'Total Projects', kpi_drive: 'Linked to Google Drive',
      kpi_local: 'Local files / Not linked', kpi_featured: 'Featured Projects',
      bench_title: '⚡ Google Drive Link Converter & Stream Tester',
      bench_badge: 'Zero Storage • High Performance',
      bench_desc: 'Drop any Google Drive link (share, playback, or just the ID) and the tool extracts the file ID, forging a smooth embed stream URL and an HD thumbnail.',
      bench_placeholder: 'Paste a Google Drive link here (e.g. https://drive.google.com/file/d/1XyZ.../view?usp=sharing)...',
      bench_extract: 'Extract & Test Stream', bench_stream: '● Live Drive Stream Test',
      bench_close: '✕ Close Preview', bench_assign: 'Assign this link to project:',
      bench_apply: 'Apply to Selected Project ✓', bench_pick: '— Pick a project —',
      search_ph: 'Search by title, client, or keywords...',
      cat_all: 'All Categories', cat_ads: 'Commercials', cat_ugc: 'UGC Campaigns',
      cat_medical: 'Medical & Clinics', cat_podcast: 'Podcasts & Interviews',
      cat_animation: 'Motion & Recap',
      src_all: 'All Sources', src_drive: 'Google Drive only', src_local: 'Local files / Need Drive link',
      add_new: 'Add New Project',
      tab_table: '📋 Bulk Table', tab_cards: '🎴 Cards', tab_json: '💻 JSON Editor',
      th_index: '#', th_preview: 'Preview', th_name: 'Project & Client',
      th_cat: 'Category', th_aspect: 'Aspect', th_drive: 'Google Drive Link (Quick Paste)',
      th_stream: 'Stream Status', th_feat: 'Featured?', th_actions: 'Actions',
      json_title: 'Live JSON Editor',
      json_sub: 'Edit any data directly here, then hit "Apply" to refresh the table and the site.',
      json_format: 'Format', json_apply: 'Apply',
      modal_title_edit: 'Edit Project Data', modal_title_add: 'Add New Project',
      modal_sub: 'Edit video data, links, and both Arabic & English texts.',
      f_title_ar: 'Video Title (Arabic) *', f_title_en: 'Video Title (English) *',
      f_cat: 'Category *', f_aspect: 'Aspect Ratio *',
      f_client: 'Client / Brand *', f_feat: '⭐ Feature on Homepage (Featured)',
      f_drive: 'Google Drive Link or ID (Streaming Video)',
      f_drive_ph: 'Paste the Drive share link and the system forges the stream & thumbnail URLs automatically...',
      f_parse: 'Parse Link ⚡', f_drive_id: 'Drive File ID', f_embed: 'Embed Stream URL',
      f_thumb: 'Thumbnail URL', f_local: 'Local Fallback File Path',
      f_size: 'Approx. File Size (MB)', f_tags: 'Tags (comma separated)',
      f_desc_ar: 'Project Description (Arabic)', f_desc_en: 'Project Description (English)',
      m_cancel: 'Cancel', m_save: 'Save Changes ✓',
      st_drive: 'Drive ✓', st_local: 'Local',
      drive_short: 'Paste Drive link or the raw ID...',
      del_msg: 'Delete this project from the configuration?',
      t_save_ok: 'Saved to browser memory — open the site to preview changes instantly',
      t_json_ok: 'File downloaded successfully ✓', t_copy_ok: 'JSON copied to clipboard ✓',
      t_import_ok: 'Configuration imported — review data then press "Save & Live Apply"',
      t_import_err: 'Invalid JSON file — make sure it is a valid projects array',
      t_apply_ok: 'JSON applied to the workspace ✓', t_apply_err: 'Invalid JSON syntax — check for errors',
      t_format_err: 'Cannot format — the JSON contains syntax errors',
      t_restore: 'Original data restored from js/data.js',
      no_thumb: 'No image', no_desc: 'No description.'
    }
  };

  // ========================================================================
  // GOOGLE DRIVE URL FORGING ENGINE
  // ========================================================================
  function extractDriveId(raw) {
    if (!raw) return '';
    raw = String(raw).trim();

    // Raw ID pasted directly (Google IDs are 28–44 chars of URL-safe chars)
    if (/^[A-Za-z0-9_-]{25,}$/.test(raw)) return raw;

    const patterns = [
      /\/file\/d\/([A-Za-z0-9_-]{10,})/,     // .../file/d/ID/view
      /\/d\/([A-Za-z0-9_-]{10,})/,           // .../d/ID/...
      /[?&]id=([A-Za-z0-9_-]{10,})/,         // ?id=ID / &id=ID
      /open\?id=([A-Za-z0-9_-]{10,})/,       // open?id=ID
      /uc\?(?:export=download&)?id=([A-Za-z0-9_-]{10,})/,
      /thumbnail\?id=([A-Za-z0-9_-]{10,})/
    ];
    for (const p of patterns) {
      const m = raw.match(p);
      if (m && m[1]) return m[1];
    }
    return '';
  }

  function forgeDriveFields(id) {
    return {
      drive_id:      id,
      drive_url:     `https://drive.google.com/file/d/${id}/view?usp=sharing`,
      embed_url:     `https://drive.google.com/file/d/${id}/preview`,
      thumbnail_url: `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1280`
    };
  }

  function isDriveLinked(p) {
    return !!(p.drive_id || p.embed_url || p.drive_url);
  }

  function getEmbedUrl(p) {
    return p.embed_url || (p.drive_id ? `https://drive.google.com/file/d/${p.drive_id}/preview` : '');
  }

  function getThumbUrl(p) {
    if (p.thumbnail_url) return p.thumbnail_url;
    if (p.drive_id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(p.drive_id)}&sz=w1280`;
    return '';
  }

  function applyDriveLink(item, rawLink) {
    const id = extractDriveId(rawLink);
    if (!id) return false;
    Object.assign(item, forgeDriveFields(id));
    return true;
  }

  // ========================================================================
  // DATA LOADING / PERSISTENCE (Live Apply = browser memory)
  // ========================================================================
  function loadProjects() {
    // 1) Live browser-memory version wins (crafted by this admin page)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length) return arr;
      } catch (e) { /* corrupt → fall through */ }
    }
    // 2) Fall back to the bundled js/data.js database
    if (typeof PROJECTS_DATA !== 'undefined') {
      return JSON.parse(JSON.stringify(PROJECTS_DATA));
    }
    return [];
  }

  function saveLive(silent) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    dirty = false;
    updateDirtyIndicator();
    if (!silent) toast('✓', TI[concernsLang].t_save_ok, 'success');
  }

  function updateDirtyIndicator() {
    const saveTxt = document.querySelector('#btnSaveLive span span#txtSaveLive')
      || document.getElementById('txtSaveLive');
    if (saveTxt) {
      const base = TI[concernsLang].save_live;
      saveTxt.textContent = dirty ? `${base} •` : base;
    }
  }

  // ========================================================================
  // KPI STATS
  // ========================================================================
  function updateKpis() {
    const total    = projects.length;
    const drive    = projects.filter(isDriveLinked).length;
    const featured = projects.filter(p => p.featured).length;

    setText('kpiTotal', total);
    setText('kpiDrive', drive);
    setText('kpiLocal', total - drive);
    setText('kpiFeatured', featured);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ========================================================================
  // TOASTS
  // ========================================================================
  let toastTimer = null;
  function toast(icon, msg, type = 'success') {
    const box  = document.getElementById('adminToast');
    const iconEl = document.getElementById('adminToastIcon');
    const msgEl  = document.getElementById('adminToastMsg');
    if (!box || !iconEl || !msgEl) return;

    const accent = (type === 'error')   ? '#ef4444'
                 : (type === 'warning') ? '#f59e0b'
                 : (type === 'info')    ? '#60a5fa' : '#22c55e';

    iconEl.textContent = icon;
    msgEl.textContent  = msg;
    box.className = 'admin-toast active';
    box.style.background   = accent;
    box.style.color        = '#07080b';
    box.style.boxShadow    = `0 10px 30px ${accent}66`;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.className = 'admin-toast'; }, 3400);
  }

  // ========================================================================
  // FILTERS
  // ========================================================================
  function activeFilters(p) {
    // Category
    if (adminCategoryFilter !== 'all' && p.category !== adminCategoryFilter) return false;

    // Drive source
    const linked = isDriveLinked(p);
    if (adminDriveFilter === 'drive' && !linked) return false;
    if (adminDriveFilter === 'local' && linked) return false;

    // Search
    const q = adminSearchQuery.trim().toLowerCase();
    if (q) {
      const hay = [
        p.title_ar, p.title_en, p.client, p.category, p.name, p.file, p.drive_url, p.drive_id,
        ...(Array.isArray(p.tags) ? p.tags : [])
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  // ========================================================================
  // VIEW 1 — BULK TABLE
  // ========================================================================
  function renderTable() {
    const tbody = document.getElementById('projectsTableBody');
    if (!tbody) return;

    const L   = TI[concernsLang];
    const isAr = document.documentElement.getAttribute('dir') !== 'ltr';
    const rows = projects.filter(activeFilters);

    tbody.innerHTML = '';

    rows.forEach((p, i) => {
      const linked = isDriveLinked(p);
      const driveVal = p.drive_url || p.drive_id || p.embed_url || '';
      const tr = document.createElement('tr');

      // ---- Index cell (matches the "#" header column)
      const tdIndex = document.createElement('td');
      tdIndex.style.cssText = 'color:var(--text-muted); font-size:0.8rem; font-weight:700;';
      tdIndex.textContent = p.id;

      // ---- Preview cell
      const tdPrev = document.createElement('td');
      const thumbUrl = getThumbUrl(p);
      tdPrev.innerHTML = thumbUrl
        ? `<img class="table-thumb" src="${escapeAttr(thumbUrl)}" alt="thumb" loading="lazy"
             onerror="this.outerHTML='<div class=&quot;table-thumb table-thumb-empty&quot;>🎬</div>'">`
        : (p.file
          ? `<video class="table-thumb" src="${encodeURI(p.file)}" preload="metadata" muted playsinline></video>`
          : `<div class="table-thumb table-thumb-empty">🎬</div>`);

      // ---- Name cell
      const tdName = document.createElement('td');
      const title  = isAr ? (p.title_ar || p.name) : (p.title_en || p.title_ar || p.name);
      tdName.innerHTML = `
        <div style="color:#fff; font-weight:700; font-size:0.92rem; margin-bottom:0.15rem;">${escapeHtml(title)}</div>
        <div style="color:var(--text-muted); font-size:0.78rem;">${escapeHtml(p.client || '-')} • ${p.sizeMB || 0} MB</div>`;

      // ---- Category cell
      const tdCat = document.createElement('td');
      tdCat.innerHTML = `<span class="tbl-cat ${escapeAttr(p.category)}">${escapeHtml(p.category || '-')}</span>`;

      // ---- Aspect cell
      const tdAspect = document.createElement('td');
      tdAspect.innerHTML = `<span class="tbl-aspect">${escapeHtml(p.aspect || '-')}</span>`;

      // ---- Drive quick-paste cell
      const tdDrive = document.createElement('td');
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'table-drive-input';
      inp.placeholder = TI[concernsLang].drive_short;
      inp.value = driveVal;
      inp.addEventListener('change', function() {
        handleQuickDriveLink(p, inp.value);
      });
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') inp.blur();
      });
      tdDrive.appendChild(inp);

      // ---- Status badge
      const tdStatus = document.createElement('td');
      tdStatus.innerHTML = `<span class="badge-drive-status ${linked ? 'active' : 'local'}">
        ${linked ? L.st_drive : L.st_local}</span>`;

      // ---- Featured toggle
      const tdFeat = document.createElement('td');
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!p.featured;
      chk.style.cssText = 'width:19px; height:19px; accent-color:var(--admin-gold); cursor:pointer;';
      chk.addEventListener('change', function() {
        p.featured = chk.checked;
        markDirty(); updateKpis();
      });
      tdFeat.appendChild(chk);

      // ---- Actions
      const tdAct = document.createElement('td');
      tdAct.innerHTML = `
        <div class="table-actions">
          <button class="tbl-btn edit" title="Edit">✎</button>
          ${linked ? '<button class="tbl-btn test" title="Test Stream">▶</button>' : ''}
          <button class="tbl-btn delete" title="Delete">🗑</button>
        </div>`;
      tdAct.querySelector('.edit').addEventListener('click', () => openModal(p.id));
      const testBtn = tdAct.querySelector('.test');
      if (testBtn) testBtn.addEventListener('click', () => testStream(getEmbedUrl(p)));
      tdAct.querySelector('.delete').addEventListener('click', () => deleteProject(p.id));

      tr.appendChild(tdIndex); tr.appendChild(tdPrev); tr.appendChild(tdName); tr.appendChild(tdCat);
      tr.appendChild(tdAspect); tr.appendChild(tdDrive); tr.appendChild(tdStatus);
      tr.appendChild(tdFeat); tr.appendChild(tdAct);

      tbody.appendChild(tr);
    });

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:2.5rem; color:var(--text-muted);">🎬 0 / ${projects.length}</td></tr>`;
    }
  }

  function handleQuickDriveLink(item, rawValue) {
    if (!rawValue.trim()) {
      // Clearing the field removes the drive bindings
      item.drive_id = item.drive_url = item.embed_url = item.thumbnail_url = '';
      markDirty(); updateKpis(); renderAll();
      toast('ℹ', concernsLang === 'ar' ? 'تم فصل رابط Google Drive من هذا المشروع' : 'Drive link detached from this project', 'warning');
      return;
    }
    if (applyDriveLink(item, rawValue)) {
      markDirty(); updateKpis(); renderAll();
      toast('✓', concernsLang === 'ar'
        ? `تم توليد رابط البث والصورة تلقائياً ✓ (${item.drive_id.slice(0, 10)}...)`
        : `Stream & thumbnail URLs forged automatically ✓ (${item.drive_id.slice(0, 10)}...)`);
    } else {
      renderAll();
      toast('⚠', concernsLang === 'ar'
        ? 'لم نتمكن من استخراج معرف Google Drive من هذا النص'
        : 'Could not extract a Google Drive ID from this text', 'error');
    }
  }

  function markDirty() {
    dirty = true;
    updateDirtyIndicator();
  }

  // ========================================================================
  // VIEW 2 — VISUAL CARDS
  // ========================================================================
  function renderCards() {
    const wrap = document.getElementById('viewCardsWrapper');
    if (!wrap) return;

    const rows = projects.filter(activeFilters);
    wrap.innerHTML = '';

    rows.forEach(p => {
      const linked   = isDriveLinked(p);
      const thumbUrl = getThumbUrl(p);
      const card = document.createElement('div');
      card.className = 'admin-card';

      const mediaHtml = thumbUrl
        ? `<img src="${escapeAttr(thumbUrl)}" alt="" loading="lazy"
             onerror="this.outerHTML='<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;opacity:0.4&quot;>🎬</div>'">`
        : (p.file ? `<video src="${encodeURI(p.file)}" preload="metadata" muted playsinline></video>`
                  : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;opacity:0.4;">🎬</div>`);

      card.innerHTML = `
        <div class="admin-card-media ${p.aspect === '16:9' ? 'ratio-horizontal' : 'ratio-vertical'}">
          ${mediaHtml}
          <span class="admin-card-id">#${p.id}</span>
          ${p.featured ? '<span class="feature-star" title="Featured">⭐</span>' : ''}
          <div class="admin-card-badges">
            <span class="tbl-cat ${escapeAttr(p.category)}">${escapeHtml(p.category || '-')}</span>
            <span class="badge-drive-status ${linked ? 'active' : 'local'}">${linked ? TI[concernsLang].st_drive : TI[concernsLang].st_local}</span>
            <span class="tbl-aspect">${escapeHtml(p.aspect || '-')}</span>
          </div>
        </div>
        <div class="admin-card-body">
          <h3 class="admin-card-title">${escapeHtml(p.title_ar || p.name || '—')}</h3>
          <span class="admin-card-client">${escapeHtml(p.client || '-')} • ${p.sizeMB || 0} MB</span>
          <div class="admin-card-drive-box">
            <label>🔗 Google Drive</label>
            <input type="text" class="table-drive-input" value="${escapeAttr(p.drive_url || '')}"
              placeholder="https://drive.google.com/file/d/.../view?usp=sharing">
          </div>
          <div class="admin-card-actions">
            <button class="tbl-btn edit" title="Edit">✎ تعديل</button>
            ${linked ? '<button class="tbl-btn test" title="Test Stream">▶ بث</button>' : ''}
            <button class="tbl-btn delete" title="Delete">🗑</button>
          </div>
        </div>`;

      card.querySelector('.admin-card-drive-box input').addEventListener('change', function(e) {
        handleQuickDriveLink(p, e.target.value);
      });
      card.querySelector('.edit').addEventListener('click', () => openModal(p.id));
      const testBtn = card.querySelector('.test');
      if (testBtn) testBtn.addEventListener('click', () => testStream(getEmbedUrl(p)));
      card.querySelector('.delete').addEventListener('click', () => deleteProject(p.id));

      wrap.appendChild(card);
    });
  }

  // ========================================================================
  // VIEW 3 — RAW JSON EDITOR
  // ========================================================================
  function syncJsonView() {
    const ta = document.getElementById('rawJsonTextarea');
    if (!taUnlessViewing(ta)) return;
    if (!ta.dataset.editing) ta.value = JSON.stringify(projects, null, 4);
  }

  // Only touch the textarea while the Code tab is active
  function taUnlessViewing(ta) {
    const wrap = document.getElementById('viewJsonWrapper');
    return ta && wrap && wrap.style.display !== 'none' ? ta : null;
  }

  function formatJson() {
    const ta = document.getElementById('rawJsonTextarea');
    if (!ta) return;
    try {
      const parsed = JSON.parse(ta.value);
      ta.value = JSON.stringify(parsed, null, 4);
    } catch (e) {
      toast('⚠', TI[concernsLang].t_format_err, 'error');
    }
  }

  function applyRawJson() {
    const ta = document.getElementById('rawJsonTextarea');
    if (!ta) return;
    try {
      const parsed = JSON.parse(ta.value);
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.projects) ? parsed.projects : null);
      if (!arr) throw new Error('bad shape');
      projects = arr.map(sanitizeProject);
      ta.dataset.editing = '';
      markDirty(); updateKpis(); renderAll();
      toast('✓', TI[concernsLang].t_apply_ok);
    } catch (e) {
      toast('⚠', TI[concernsLang].t_apply_err, 'error');
    }
  }

  function sanitizeProject(p, idx) {
    return {
      id:            Number(p.id) || idx + 1,
      folder:        p.folder || '',
      name:          p.name || '',
      file:          p.file || '',
      sizeMB:        Number(p.sizeMB) || 0,
      category:      p.category || 'ads',
      aspect:        p.aspect || '9:16',
      client:        p.client || '',
      title_ar:      p.title_ar || '',
      title_en:      p.title_en || '',
      desc_ar:       p.desc_ar || '',
      desc_en:       p.desc_en || '',
      tags:          Array.isArray(p.tags) ? p.tags : [],
      featured:      !!p.featured,
      drive_id:      p.drive_id || '',
      drive_url:     p.drive_url || '',
      embed_url:     p.embed_url || '',
      thumbnail_url: p.thumbnail_url || ''
    };
  }

  // ========================================================================
  // DRIVE BENCH TOOL (Convert + Stream Test + Quick Apply)
  // ========================================================================
  function extractFromBench() {
    const input = document.getElementById('benchDriveInput');
    const id = extractDriveId(input.value);

    if (!id) {
      document.getElementById('benchResults').style.display = 'none';
      toast('⚠',
        concernsLang === 'ar' ? 'لم يتمكن المحرك من استخراج معرف من هذا النص' :
        'Could not extract an ID from this text', 'error');
      return;
    }

    benchCurrentId = id;
    const forged = forgeDriveFields(id);
    setText('benchResId', id);
    setText('benchResEmbed', forged.embed_url);
    setText('benchResThumb', forged.thumbnail_url);
    document.getElementById('benchResults').style.display = 'grid';
    document.getElementById('benchAssignRow').style.display = 'flex';

    testStream(forged.embed_url);
  }

  function applyBenchToProject() {
    if (!benchCurrentId) return;
    const sel = document.getElementById('benchProjectSelect');
    const pid = Number(sel.value);
    const item = projects.find(p => p.id === pid);
    if (!item) {
      toast('⚠', concernsLang === 'ar' ? 'اختر مشروعاً أولاً' : 'Pick a project first', 'warning');
      return;
    }
    Object.assign(item, forgeDriveFields(benchCurrentId));
    markDirty(); updateKpis(); renderAll();
    refreshBenchSelect();
    toast('✓', concernsLang === 'ar'
      ? `تم ربط "${item.title_ar || item.name}" بـ Google Drive ✓`
      : `Linked "${item.title_en || item.name}" to Google Drive ✓`);
  }

  function refreshBenchSelect() {
    const sel = document.getElementById('benchProjectSelect');
    if (!sel) return;
    const prev = sel.value;
    const L = TI[concernsLang];
    sel.innerHTML = `<option value="">${L.bench_pick}</option>` + projects.map(p =>
      `<option value="${p.id}">#${p.id} — ${escapeHtml((p.title_ar || p.name || '').slice(0, 40))}</option>`
    ).join('');
    if (prev && projects.some(p => String(p.id) === prev)) sel.value = prev;
  }

  function testStream(embedUrl) {
    const container = document.getElementById('benchStreamContainer');
    const iframe = document.getElementById('benchStreamIframe');
    if (!container || !iframe || !embedUrl) return;
    iframe.src = embedUrl;
    container.classList.add('active');
  }

  function closeStreamTest() {
    const container = document.getElementById('benchStreamContainer');
    const iframe = document.getElementById('benchStreamIframe');
    if (container) container.classList.remove('active');
    if (iframe) iframe.src = '';
  }

  // ========================================================================
  // PROJECT MODAL (ADD / EDIT)
  // ========================================================================
  function openModal(id = null) {
    editingId = id;
    const modal = document.getElementById('projectModal');
    const isAdd = id === null;
    const L = TI[concernsLang];

    setText('modalCardTitle', isAdd ? L.modal_title_add : L.modal_title_edit);

    const p = isAdd
      ? blankProject()
      : projects.find(x => x.id === id);
    if (!p) return;

    setVal('formProjectId', isAdd ? '' : p.id);
    setVal('formTitleAr', p.title_ar);
    setVal('formTitleEn', p.title_en);
    setVal('formCategory', p.category || 'ads');
    setVal('formAspect', p.aspect || '9:16');
    setVal('formClient', p.client);
    setChecked('formFeatured', !!p.featured);
    setVal('formDriveUrl', p.drive_url || '');
    setVal('formDriveId', p.drive_id || '');
    setVal('formEmbedUrl', getEmbedUrl(p));
    setVal('formThumbnailUrl', p.thumbnail_url || '');
    setVal('formLocalFile', p.file || '');
    setVal('formSizeMB', p.sizeMB || '');
    setVal('formTags', (Array.isArray(p.tags) ? p.tags : []).join(', '));
    setVal('formDescAr', p.desc_ar);
    setVal('formDescEn', p.desc_en);

    modal.classList.add('active');
  }

  function blankProject() {
    const nextId = projects.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
    return sanitizeProject({
      id: nextId, name: '', folder: '', file: '', client: '', sizeMB: 0,
      title_ar: '', title_en: '', desc_ar: '', desc_en: '', tags: [], featured: false
    }, 0);
  }

  function parseModalDrive() {
    const input = document.getElementById('formDriveUrl');
    if (!input) return;
    const id = extractDriveId(input.value);
    if (!id) {
      toast('⚠', concernsLang === 'ar' ? 'لم نتمكن من تحليل الرابط' : 'Could not parse the link', 'error');
      return;
    }
    const f = forgeDriveFields(id);
    setVal('formDriveId', f.drive_id);
    setVal('formEmbedUrl', f.embed_url);
    setVal('formThumbnailUrl', f.thumbnail_url);
    input.value = f.drive_url;
    toast('✓', concernsLang === 'ar' ? 'تم توليد الروابط تلقائياً ✓' : 'URLs forged automatically ✓');
  }

  function saveModal() {
    const driveId = getVal('formDriveId').trim();
    const embedUrl = getVal('formEmbedUrl').trim();
    const driveUrl = getVal('formDriveUrl').trim();
    const thumbUrl = getVal('formThumbnailUrl').trim();

    // Fallback: if user pasted a link but skipped the parse button
    let finalDrive = { drive_id: driveId, embed_url: embedUrl, drive_url: driveUrl, thumbnail_url: thumbUrl };
    if (!driveId && driveUrl) {
      const id = extractDriveId(driveUrl);
      if (id) finalDrive = forgeDriveFields(id);
    }

    const data = {
      title_ar:      getVal('formTitleAr').trim(),
      title_en:      getVal('formTitleEn').trim(),
      category:      getVal('formCategory'),
      aspect:        getVal('formAspect'),
      client:        getVal('formClient').trim(),
      featured:      getChecked('formFeatured'),
      file:          getVal('formLocalFile').trim(),
      sizeMB:        Number(getVal('formSizeMB')) || 0,
      tags:          getVal('formTags').split(',').map(t => t.trim()).filter(Boolean),
      desc_ar:       getVal('formDescAr').trim(),
      desc_en:       getVal('formDescEn').trim(),
      drive_id:      finalDrive.drive_id,
      drive_url:     finalDrive.drive_url,
      embed_url:     finalDrive.embed_url,
      thumbnail_url: finalDrive.thumbnail_url
    };

    // Derive folder/name from local path for consistency
    if (data.file) {
      const parts = data.file.split('/');
      data.name = parts[parts.length - 1] || data.name;
      if (parts.length > 1) data.folder = parts[parts.length - 2];
    }
    if (!data.name) data.name = data.title_ar || data.title_en || 'Drive Video ' + Date.now();
    if (!data.folder) data.folder = data.drive_id ? 'gdrive' : 'unknown';

    if (editingId !== null) {
      const p = projects.find(x => x.id === editingId);
      if (p) Object.assign(p, data);
    } else {
      const np = blankProject();
      Object.assign(np, data);
      np.id = projects.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
      projects.push(np);
    }

    markDirty(); updateKpis(); refreshBenchSelect(); renderAll();
    closeModal();
    toast('✓', concernsLang === 'ar' ? 'تم حفظ بيانات المشروع في مساحة العمل ✓' : 'Project data saved to the workspace ✓');
  }

  function closeModal() {
    const modal = document.getElementById('projectModal');
    if (modal) modal.classList.remove('active');
    editingId = null;
  }

  function deleteProject(id) {
    const L = TI[concernsLang];
    if (!confirm(L.del_msg)) return;
    projects = projects.filter(p => p.id !== id);
    markDirty(); updateKpis(); renderAll(); refreshBenchSelect();
    toast('ℹ', concernsLang === 'ar' ? 'تم حذف المشروع من مساحة العمل' : 'Project removed from the workspace', 'warning');
  }

  // ========================================================================
  // EXPORT / IMPORT
  // ========================================================================
  function downloadBlob(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  function buildDataJs() {
    const i18nObj = (typeof I18N !== 'undefined') ? I18N : {};
    return '// ============================================================\n'
      + '// PORTFOLIO DATABASE & LOCALIZATION\n'
      + '// ' + projects.length + ' High-Impact Video Projects (Supports Google Drive & Local Files)\n'
      + '// FORGED BY: admin.html — paste this whole file over js/data.js\n'
      + '// ============================================================\n\n'
      + 'const PROJECTS_DATA = ' + JSON.stringify(projects, null, 4) + ';\n\n\n'
      + 'const I18N = ' + JSON.stringify(i18nObj, null, 4) + ';\n';
  }

  function downloadJson()      { downloadBlob('projects.json', JSON.stringify(projects, null, 4)); toast('✓', TI[concernsLang].t_json_ok); }
  function downloadDataJs()    { downloadBlob('data.js', buildDataJs(), 'text/javascript;charset=utf-8'); toast('✓', TI[concernsLang].t_json_ok); }
  async function copyJson() {
    const text = JSON.stringify(projects, null, 4);
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('✓', TI[concernsLang].t_copy_ok);
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = function() {
      try {
        const parsed = JSON.parse(reader.result);
        const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.projects) ? parsed.projects : null);
        if (!arr || !arr.length) throw new Error('bad shape');
        projects = arr.map(sanitizeProject);
        markDirty(); updateKpis(); renderAll(); refreshBenchSelect();
        toast('✓', TI[concernsLang].t_import_ok);
      } catch (e) {
        toast('⚠', TI[concernsLang].t_import_err, 'error');
      }
    };
    reader.readAsText(file);
  }

  function restoreFromSource() {
    if (typeof PROJECTS_DATA === 'undefined') return;
    if (!confirm(restoreAreYouSure())) return;
    localStorage.removeItem(STORAGE_KEY);
    projects = JSON.parse(JSON.stringify(PROJECTS_DATA));
    dirty = false;
    updateDirtyIndicator(); updateKpis(); renderAll(); refreshBenchSelect();
    toast('✓', TI[concernsLang].t_restore);
  }

  // ========================================================================
  // ADMIN PAGE LANGUAGE
  // ========================================================================
  function toggleAdminLang() {
    concernsLang = concernsLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem(LANG_KEY, concernsLang);
    applyAdminLang();
  }

  function applyAdminLang() {
    const L  = TI[concernsLang];
    const isAr = concernsLang === 'ar';
    document.documentElement.setAttribute('lang', concernsLang);
    document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');

    // Toggle button face
    const tl = document.getElementById('btnToggleAdminLang');
    if (tl) {
      tl.innerHTML = isAr
        ? '<span>🇬🇧</span><span>English</span>'
        : '<span>🇸🇦</span><span>عربي</span>';
    }

    // Header buttons
    setSpanText('btnSaveLive', L.save_live);
    setSpanText('btnDownloadJson', L.download_json);
    setSpanText('btnDownloadJs', L.download_js);
    setSpanText('btnCopyJson', L.copy_json);
    setLabelSpanText('fileImportInput', L.import_json);
    setSpanText('btnRestoreBase', L.restore);
    setSpanText('btnViewSite', L.view_site);

    // KPIs
    setText('kpiTotalLabel', L.kpi_total);
    setText('kpiDriveLabel', L.kpi_drive);
    setText('kpiLocalLabel', L.kpi_local);
    setText('kpiFeaturedLabel', L.kpi_featured);


    // Bench
    setText('benchTitle', L.bench_title);
    setText('benchBadge', L.bench_badge);
    setText('benchDesc', L.bench_desc);
    setAttr('benchDriveInput', 'placeholder', L.bench_placeholder);
    setSpanText('benchBtnExtract', L.bench_extract);
    setText('benchStreamLabel', L.bench_stream);
    setText('benchCloseStream', L.bench_close);
    setText('benchAssignLabel', L.bench_assign);
    setSpanText('benchBtnApplyToProject', L.bench_apply);
    refreshBenchSelect();

    // Toolbar
    setAttr('adminSearchInput', 'placeholder', L.search_ph);
    fillSelect('adminCategorySelect', [
      ['all', L.cat_all], ['ads', L.cat_ads], ['ugc', L.cat_ugc],
      ['medical', L.cat_medical], ['podcast', L.cat_podcast], ['animation', L.cat_animation]
    ]);
    document.getElementById('adminCategorySelect').value = adminCategoryFilter;
    fillSelect('adminDriveFilterSelect', [
      ['all', L.src_all], ['drive', L.src_drive], ['local', L.src_local]
    ]);
    document.getElementById('adminDriveFilterSelect').value = adminDriveFilter;
    setSpanText('btnAddNewProject', L.add_new);

    // Modal selects keep their current value through the translation
    const catSel = document.getElementById('formCategory');
    if (catSel) {
      const v = catSel.value || 'ads';
      fillSelect('formCategory', [
        ['ads', L.cat_ads], ['ugc', L.cat_ugc], ['medical', L.cat_medical],
        ['podcast', L.cat_podcast], ['animation', L.cat_animation]
      ]);
      catSel.value = v;
    }
    const aspSel = document.getElementById('formAspect');
    if (aspSel) {
      const v = aspSel.value || '9:16';
      fillSelect('formAspect', [
        ['9:16', isAr ? '📱 عمودي 9:16 (Vertical Reels / TikTok)' : '📱 Vertical 9:16 (Reels / TikTok)'],
        ['16:9', isAr ? '🖥️ أفقي 16:9 (إعلانات وشاشات)' : '🖥️ Landscape 16:9 (Commercials / TV)']
      ]);
      aspSel.value = v;
    }

    setText('tabModeTable', L.tab_table);
    setText('tabModeCards', L.tab_cards);
    setText('tabModeJson', L.tab_json);

    // Table headers
    const ths = document.querySelectorAll('#viewTableWrapper th');
    if (ths.length >= 9) {
      const order = [L.th_index, L.th_preview, L.th_name, L.th_cat, L.th_aspect, L.th_drive, L.th_stream, L.th_feat, L.th_actions];
      ths.forEach((th, i) => { th.textContent = order[i]; });
    }

    // JSON editor
    setText('jsonTitle', L.json_title);
    setText('jsonSub', L.json_sub);
    setText('btnFormatJson', L.json_format);
    setText('btnApplyRawJson', L.json_apply);

    // Modal
    setText('modalCardTitle', editingId !== null ? L.modal_title_edit : L.modal_title_add);
    setText('modalSub', L.modal_sub);
    setLabelByText('formTitleAr', L.f_title_ar); setLabelByText('formTitleEn', L.f_title_en);
    setLabelByText('formCategory', L.f_cat);     setLabelByText('formAspect', L.f_aspect);
    setLabelByText('formClient', L.f_client);
    setText('lblFeatured', L.f_feat);
    setLabelByText('formDriveUrl', L.f_drive);
    setAttr('formDriveUrl', 'placeholder', L.f_drive_ph);
    setSpanText('btnModalAutoDrive', L.f_parse);
    setLabelByText('formDriveId', L.f_drive_id); setLabelByText('formEmbedUrl', L.f_embed);
    setLabelByText('formThumbnailUrl', L.f_thumb); setLabelByText('formLocalFile', L.f_local);
    setLabelByText('formSizeMB', L.f_size);        setLabelByText('formTags', L.f_tags);
    setLabelByText('formDescAr', L.f_desc_ar);     setLabelByText('formDescEn', L.f_desc_en);
    setText('btnModalCancel', L.m_cancel);
    setText('btnModalSave', L.m_save);
    setAttr('formTitleAr', 'placeholder', isAr ? 'مثال: برومو المعرض الدولي' : 'e.g. International Exhibition Promo');
    setAttr('formTitleEn', 'placeholder', isAr ? 'مثال إنجليزي: International Exhibition Promo' : 'e.g. International Exhibition Promo');
    document.querySelectorAll('#projectEditForm textarea').forEach(ta => {
      if (ta.id === 'formDescAr') {
        ta.setAttribute('placeholder', isAr ? 'اكتب نبذة عن أسلوب المونتاج والمؤثرات المستخدمة...' : 'Describe the editing style and techniques...');
      } else if (ta.id === 'formDescEn') {
        ta.setAttribute('placeholder', isAr ? 'وصف مختصر بالإنجليزية...' : 'Brief explanation of the creative editing approach...');
      }
    });

    updateDirtyIndicator();
    renderAll();
  }

  function restoreAreYouSure() {
    return concernsLang === 'ar'
      ? 'سيتم التراجع عن كل التغييرات المحلية والعودة للبيانات المدمجة في js/data.js. هل أنت متأكد؟'
      : 'All local changes will be reverted to the data bundled in js/data.js. Are you sure?';
  }

  function setSpanText(id, text) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const span = btn.querySelector('span:last-child') || btn;
    span.textContent = text;
  }

  function setLabelSpanText(forId, text) {
    const input = document.getElementById(forId);
    if (!input || !input.parentElement) return;
    const spans = input.parentElement.querySelectorAll('span');
    if (spans.length) spans[spans.length - 1].textContent = text;
  }

  function setLabelByText(forId, text) {
    const label = document.querySelector(`label[for="${forId}"]`);
    if (label) label.textContent = text;
  }

  function fillSelect(id, pairs) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = pairs.map(([v, t]) =>
      `<option value="${v}">${t}</option>`).join('');
  }

  // ========================================================================
  // RENDER PIPELINE
  // ========================================================================
  function renderAll() {
    updateKpis();
    renderTable();
    renderCards();
    syncJsonView();
  }

  // ========================================================================
  // EVENTS
  // ========================================================================
  function bindEvents() {
    // Header actions
    on('btnSaveLive', 'click', () => saveLive());
    on('btnDownloadJson', 'click', downloadJson);
    on('btnDownloadJs', 'click', downloadDataJs);
    on('btnCopyJson', 'click', copyJson);
    on('btnRestoreBase', 'click', restoreFromSource);
    on('fileImportInput', 'change', function(e) {
      if (e.target.files && e.target.files[0]) importJsonFile(e.target.files[0]);
      e.target.value = '';
    });
    on('btnToggleAdminLang', 'click', toggleAdminLang);

    // Bench
    on('benchBtnExtract', 'click', extractFromBench);
    on('benchDriveInput', 'keydown', e => { if (e.key === 'Enter') extractFromBench(); });
    on('benchBtnApplyToProject', 'click', applyBenchToProject);
    on('benchCloseStream', 'click', closeStreamTest);

    // Toolbar
    on('adminSearchInput', 'input', e => {
      adminSearchQuery = e.target.value;
      renderTable(); renderCards();
    });
    on('adminCategorySelect', 'change', e => {
      adminCategoryFilter = e.target.value;
      renderTable(); renderCards();
    });
    on('adminDriveFilterSelect', 'change', e => {
      adminDriveFilter = e.target.value;
      renderTable(); renderCards();
    });
    on('btnAddNewProject', 'click', () => openModal(null));

    // View tabs
    on('tabModeTable', 'click', () => switchTab('table'));
    on('tabModeCards', 'click', () => switchTab('cards'));
    on('tabModeJson',  'click', () => switchTab('json'));

    // JSON editor actions
    on('btnFormatJson', 'click', formatJson);
    on('btnApplyRawJson', 'click', applyRawJson);

    // JSON editor live-edit tracking
    const ta = document.getElementById('rawJsonTextarea');
    if (ta) {
      ta.addEventListener('input', () => { ta.dataset.editing = '1'; });
      ta.addEventListener('blur', function() {
        // push structured edits back into the working copy
        try {
          const arr = JSON.parse(ta.value);
          const parsed = Array.isArray(arr) ? arr : (Array.isArray(arr.projects) ? arr.projects : null);
          if (parsed && !isDataEquivalent(parsed, projects)) {
            projects = parsed.map(sanitizeProject);
            markDirty(); updateKpis(); renderAll();
          }
          ta.dataset.editing = '';
        } catch (err) { /* user still typing; the Apply button validates */ }
      });
    }

    // Modal
    on('btnModalClose', 'click', closeModal);
    on('btnModalCancel', 'click', closeModal);
    on('btnModalSave', 'click', saveModal);
    on('btnModalAutoDrive', 'click', parseModalDrive);
    on('projectModal', 'click', e => { if (e.target.id === 'projectModal') closeModal(); });

    // Warn before leaving with unsaved work
    window.addEventListener('beforeunload', e => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Ctrl+S = Save & Live Apply
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveLive();
      }
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  function switchTab(mode) {
    const wrappers = {
      table: document.getElementById('viewTableWrapper'),
      cards: document.getElementById('viewCardsWrapper'),
      json:  document.getElementById('viewJsonWrapper')
    };
    const tabs = {
      table: document.getElementById('tabModeTable'),
      cards: document.getElementById('tabModeCards'),
      json:  document.getElementById('tabModeJson')
    };
    Object.keys(wrappers).forEach(k => {
      if (wrappers[k]) wrappers[k].style.display = (k === mode) ? (k === 'json' ? 'block' : '') : 'none';
      if (tabs[k]) tabs[k].classList.toggle('active', k === mode);
    });
    if (mode === 'json') syncJsonView(true);
    if (mode === 'table') renderTable();
    if (mode === 'cards') renderCards();
  }

  function isDataEquivalent(a, b) {
    return JSON.stringify(a.map(p => sanitizeProject(p, 0).id)) === JSON.stringify(b.map(p => p.id))
      && JSON.stringify(a) === JSON.stringify(b);
  }

  // Small helpers
  function on(id, ev, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
  }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v ?? ''; }
  function getChecked(id) { const el = document.getElementById(id); return el ? !!el.checked : false; }
  function setChecked(id, v) { const el = document.getElementById(id); if (el) el.checked = !!v; }
  function setAttr(id, attr, v) { const el = document.getElementById(id); if (el) el.setAttribute(attr, v); }
  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // ========================================================================
  // BOOT
  // ========================================================================
  function init() {
    projects = loadProjects();
    concernsLang = localStorage.getItem(LANG_KEY) || 'ar';
    bindEvents();
    applyAdminLang();
    console.log(`[Admin Forge] Loaded ${projects.length} projects from localStorage/js data.`);
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init, loadProjects, extractDriveId, forgeDriveFields };
})();
