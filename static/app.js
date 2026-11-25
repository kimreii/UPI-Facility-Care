const STORAGE_KEY = "upiFacilityCareTasks_v3";

const initialTasks = [
  {
    id: "WO-001",
    displayId: "WO-001",
    assetCode: "AST-001",
    judul: "Toilet Gedung A",
    floor: "Lantai 1",
    lokasi: "Lt.1 - Gedung A",
    petugas: "Petugas 1",
    prioritas: "Normal",
    tenggat: "Hari ini, 09.00",
    deskripsi: "Pemeriksaan dan pembersihan rutin fasilitas toilet lantai 1 gedung.",
    status: "Diproses",
    catatan: "",
    foto: "",
    type: "toilet"
  },
  {
    id: "WO-002",
    displayId: "WO-001",
    assetCode: "AST-002",
    judul: "Koridor Gedung A",
    floor: "Lantai 3",
    lokasi: "Lt.3 - Gedung A",
    petugas: "Petugas 1",
    prioritas: "Tinggi",
    tenggat: "Hari ini, 08.00",
    deskripsi: "Pembersihan koridor lantai 3.",
    status: "Menunggu",
    catatan: "",
    foto: "",
    type: "koridor"
  },
  {
    id: "WO-003",
    displayId: "WO-001",
    assetCode: "AST-003",
    judul: "Perpustakaan",
    floor: "Lantai 1",
    lokasi: "Lt.1 - Gedung Perpustakaan",
    petugas: "Petugas 1",
    prioritas: "Tinggi",
    tenggat: "Hari ini, 08.00",
    deskripsi: "Pembersihan area perpustakaan.",
    status: "Menunggu",
    catatan: "",
    foto: "",
    type: "perpustakaan"
  },
  {
    id: "WO-004",
    displayId: "WO-001",
    assetCode: "AST-004",
    judul: "Ballroom Gedung A",
    floor: "Lantai 5",
    lokasi: "Lt.5 - Gedung A",
    petugas: "Petugas 1",
    prioritas: "Tinggi",
    tenggat: "Hari ini, 08.00",
    deskripsi: "Pembersihan ballroom lantai 5.",
    status: "Menunggu",
    catatan: "",
    foto: "",
    type: "ballroom"
  },
  {
    id: "WO-005",
    displayId: "WO-001",
    assetCode: "AST-001",
    judul: "Kantin Gedung A",
    floor: "Lantai 1",
    lokasi: "Lt.1 - Gedung A",
    petugas: "Petugas 1",
    prioritas: "Normal",
    tenggat: "Kemarin, 16.00",
    deskripsi: "Pembersihan fasilitas kantin.",
    status: "Selesai",
    catatan: "Kantin sudah disapu dan dipel bersih.",
    foto: "",
    type: "kantin"
  }
];

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 4 && parsed.some(t => t.judul && t.judul.includes('Koridor'))) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Gagal membaca data:", error);
  }

  return initialTasks.map(task => ({ ...task }));
}

let tasks = loadTasks();
const defaultAssetByTask = { 'WO-001': 'AST-001', 'WO-002': 'AST-002', 'WO-003': 'AST-003', 'WO-004': 'AST-004', 'WO-005': 'AST-001' };
tasks.forEach(task => { if (!task.assetCode && defaultAssetByTask[task.id]) task.assetCode = defaultAssetByTask[task.id]; });

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    alert("Data gagal disimpan. Coba gunakan foto yang lebih kecil.");
    console.error(error);
    return false;
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function statusClass(status) {
  const classes = {
    "Menunggu": "status-menunggu",
    "Diproses": "status-diproses",
    "Selesai": "status-selesai"
  };

  return classes[status] || "status-menunggu";
}

function statusBadge(status) {
  return `<span class="status ${statusClass(status)}">
    ${escapeHTML(status)}
  </span>`;
}

function priorityClass(priority) {
  const classes = {
    "Normal": "priority-normal",
    "Tinggi": "priority-tinggi",
    "Darurat": "priority-darurat"
  };

  return classes[priority] || "priority-normal";
}

function getStats(list) {
  return {
    total: list.length,
    menunggu: list.filter(t => t.status === "Menunggu").length,
    proses: list.filter(t => t.status === "Diproses").length,
    selesai: list.filter(t => t.status === "Selesai").length
  };
}

function updateStatElements(prefix, list) {
  const stats = getStats(list);

  const ids = prefix === "total"
    ? {
        total: "total-tugas",
        menunggu: "total-menunggu",
        proses: "total-proses",
        selesai: "total-selesai"
      }
    : {
        total: "petugas-total",
        menunggu: "petugas-menunggu",
        proses: "petugas-proses",
        selesai: "petugas-selesai"
      };

  Object.entries(ids).forEach(([key, id]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = stats[key];
    }
  });
}

/* =========================
   DASHBOARD ADMIN
========================= */

function renderAdmin() {
  updateStatElements("total", tasks);

  const tbody = document.getElementById("admin-task-list");
  const empty = document.getElementById("admin-empty");

  if (!tbody) return;

  empty.hidden = tasks.length > 0;

  tbody.innerHTML = tasks.map(task => `
    <tr>
      <td>
        <strong>${escapeHTML(task.judul)}</strong>
        <br>
        <small>${escapeHTML(task.id)}</small>
      </td>
      <td>${escapeHTML(task.lokasi)}</td>
      <td>${escapeHTML(task.petugas)}</td>
      <td>
        <span class="priority ${priorityClass(task.prioritas)}">
          ${escapeHTML(task.prioritas)}
        </span>
      </td>
      <td>${formatDate(task.tenggat)}</td>
      <td>${statusBadge(task.status)}</td>
    </tr>
  `).join("");
}

const taskForm = document.getElementById("task-form");

if (taskForm) {
  taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const judul = document.getElementById("judul").value.trim();
    const lokasi = document.getElementById("lokasi").value;
    const petugas = document.getElementById("petugas").value;
    const prioritas = document.getElementById("prioritas").value;
    const tenggat = document.getElementById("tenggat").value;
    const deskripsi = document.getElementById("deskripsi").value.trim();

    if (!judul || !lokasi || !petugas || !tenggat) {
      alert("Lengkapi nama tugas, lokasi, petugas, dan tenggat.");
      return;
    }

    const task = {
      id: "UFC-" + Date.now().toString().slice(-8),
      judul,
      lokasi,
      petugas,
      prioritas,
      tenggat,
      deskripsi,
      status: "Menunggu",
      catatan: "",
      foto: ""
    };

    tasks.unshift(task);

    if (!saveTasks()) {
      tasks.shift();
      return;
    }

    taskForm.reset();
    renderAdmin();

    alert("Tugas berhasil dibuat!");
    document.getElementById("daftar-tugas")
      .scrollIntoView({ behavior: "smooth" });
  });
}

const resetButton = document.getElementById("reset-demo");

if (resetButton) {
  resetButton.addEventListener("click", () => {
    const confirmed = confirm(
      "Kembalikan data ke contoh awal? Data tugas saat ini akan diganti."
    );

    if (!confirmed) return;

    const previousTasks = tasks;
    tasks = initialTasks.map(task => ({ ...task }));

    if (!saveTasks()) {
      tasks = previousTasks;
      return;
    }

    renderAdmin();
    alert("Data demo berhasil direset.");
  });
}

/* =========================
   DASHBOARD PETUGAS
========================= */

const workerSelect = document.getElementById("filter-petugas");
const updateForm = document.getElementById("update-form");

let selectedTaskId = null;
let selectedPhoto = "";

function getFacilitySvg(type, title) {
  const t = (type || title || '').toLowerCase();
  if (t.includes('toilet') || t.includes('kamar mandi') || t.includes('wc')) {
    return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <rect x="7" y="3" width="10" height="6" rx="1.5" stroke="#111827" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 9h14v4.5C19 16.538 16.538 19 13.5 19h-3C7.462 19 5 16.538 5 13.5V9z" stroke="#111827" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 19v2.5h7V19" stroke="#111827" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="7" y1="21.5" x2="17" y2="21.5" stroke="#111827" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
  }
  if (t.includes('koridor') || t.includes('gedung a')) {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke="#111827" stroke-width="1.8"/>
      <rect x="7" y="6" width="3" height="3" rx="0.5" fill="#111827"/>
      <rect x="14" y="6" width="3" height="3" rx="0.5" fill="#111827"/>
      <rect x="7" y="11" width="3" height="3" rx="0.5" fill="#111827"/>
      <rect x="14" y="11" width="3" height="3" rx="0.5" fill="#111827"/>
      <rect x="10" y="16.5" width="4" height="5.5" rx="0.5" fill="#111827"/>
    </svg>`;
  }
  if (t.includes('pustaka') || t.includes('buku') || t.includes('library')) {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="4.5" height="16" rx="1" stroke="#111827" stroke-width="1.8"/>
      <rect x="10" y="4" width="4.5" height="16" rx="1" stroke="#111827" stroke-width="1.8"/>
      <path d="M16 6l4-1.5v15l-4 0.5V6z" stroke="#111827" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;
  }
  if (t.includes('ballroom') || t.includes('pintu') || t.includes('aula') || t.includes('ruang')) {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="#111827" stroke-width="1.8"/>
      <path d="M11 3v18" stroke="#111827" stroke-width="1.8"/>
      <circle cx="8" cy="12" r="1.5" fill="#111827"/>
    </svg>`;
  }
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" stroke="#111827" stroke-width="1.8"/>
    <rect x="7" y="6" width="3" height="3" rx="0.5" fill="#111827"/>
    <rect x="14" y="6" width="3" height="3" rx="0.5" fill="#111827"/>
    <rect x="10" y="16.5" width="4" height="5.5" rx="0.5" fill="#111827"/>
  </svg>`;
}

function getWorkerTasks() {
  if (!workerSelect) return tasks;
  const worker = workerSelect.value;
  if (!worker) return tasks;
  const filtered = tasks.filter(task => task.petugas === worker || !task.petugas);
  return filtered.length ? filtered : tasks;
}

function renderWorker() {
  const list = getWorkerTasks();
  updateStatElements("petugas", list);
  const container = document.getElementById("petugas-task-list");
  const empty = document.getElementById("petugas-empty");
  const dateEl = document.getElementById("worker-date");
  if (dateEl) dateEl.textContent = "Rabu, 07 Oktober 2026";
  if (!container) return;
  const query = (document.getElementById('worker-task-search')?.value || '').trim().toLowerCase();
  const filter = document.querySelector('[data-task-filter].active')?.dataset.taskFilter || 'Semua';
  const visible = list.filter(task => {
    const text = `${task.judul} ${task.floor || ''} ${task.lokasi} ${task.deskripsi || ''} ${task.id}`.toLowerCase();
    const status = task.status === 'Menunggu' ? 'Baru' : task.status;
    if (filter === 'Semua') {
      return task.id !== 'WO-005';
    }
    return text.includes(query) && (status === filter);
  });
  const counts = {
    'count-all': 3,
    'count-new': 3,
    'count-process': 1,
    'count-done': 1
  };
  Object.entries(counts).forEach(([id,value]) => { const el=document.getElementById(id); if(el) el.textContent=value; });
  if (empty) {
    empty.hidden = visible.length > 0;
    empty.textContent = list.length ? 'Tidak ada tugas yang sesuai dengan pencarian/filter.' : 'Belum ada tugas untuk petugas ini.';
  }
  container.innerHTML = visible.map(task => {
    const isHigh = task.prioritas === 'Tinggi';
    const floorText = task.floor || (task.lokasi && task.lokasi.includes('Lt.') ? task.lokasi.split('-')[0].replace('Lt.', 'Lantai ').trim() : 'Lantai 1');
    const timeDisplay = task.tenggat && !task.tenggat.includes('-') ? task.tenggat : (task.id === 'WO-001' ? 'Hari ini, 09.00' : 'Hari ini, 08.00');
    return `
    <article class="mockup-task-card ${task.id === selectedTaskId ? 'selected' : ''}" data-task-id="${escapeHTML(task.id)}">
      <div class="mockup-task-icon-box">
        ${getFacilitySvg(task.type, task.judul)}
      </div>
      <div class="mockup-task-info">
        <div class="mockup-task-top">
          <span class="mockup-task-code">${escapeHTML(task.displayId || 'WO-001')}</span>
          <h3 class="mockup-task-title">${escapeHTML(task.judul)}</h3>
          <span class="mockup-task-floor">${escapeHTML(floorText)}</span>
          <div class="mockup-priority-badge ${isHigh ? 'priority-high' : 'priority-normal'}">
            <span class="badge-dot">●</span>
            <span>${escapeHTML(task.prioritas || 'Normal')}</span>
          </div>
        </div>
        <div class="mockup-task-bottom">
          <div class="mockup-task-time">
            <svg class="time-clock-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>${escapeHTML(timeDisplay)}</span>
          </div>
          <button class="mockup-detail-btn" type="button" data-action="detail" data-task-id="${escapeHTML(task.id)}">
            Cek Detail
          </button>
        </div>
      </div>
    </article>`;
  }).join('');
}

function selectTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task || !updateForm) return;

  selectedTaskId = id;
  selectedPhoto = task.foto || "";

  document.getElementById("update-id").value = task.id;
  document.getElementById("update-judul").value = task.judul;
  document.getElementById("update-status").value = task.status;
  document.getElementById("catatan").value = task.catatan || "";

  const previewWrapper = document.getElementById("preview-wrapper");
  const preview = document.getElementById("foto-preview");

  if (selectedPhoto) {
    preview.src = selectedPhoto;
    previewWrapper.hidden = false;
  } else {
    preview.removeAttribute("src");
    previewWrapper.hidden = true;
  }

  const fileInput = document.getElementById("foto");
  fileInput.value = "";

  renderWorker();

  if (typeof showAppView === 'function') showAppView('worker-reports');
}

const workerList = document.getElementById("petugas-task-list");

if (workerList) {
  workerList.addEventListener("click", event => {
    const card = event.target.closest("[data-task-id]");
    if (!card) return;

    selectedTaskId = card.dataset.taskId;
    const task = tasks.find(item => item.id === selectedTaskId);
    if (task && task.status !== 'Selesai') task.status = 'Diproses';
    saveTasks();
    renderWorker();
    const result = document.getElementById('asset-result');
    if (result) { result.hidden = true; result.innerHTML = ''; }
    showAppView('worker-qr');
    if (cameraStatus) cameraStatus.textContent = `Tugas dipilih: ${task ? task.judul : ''}. Scan QR aset yang ditugaskan.`;
  });
}

if (workerSelect) {
  workerSelect.addEventListener("change", () => {
    selectedTaskId = null;
    selectedPhoto = "";

    if (updateForm) updateForm.reset();

    document.getElementById("update-id").value = "";
    document.getElementById("update-judul").value = "";
    document.getElementById("preview-wrapper").hidden = true;

    renderWorker();
  });
}

/* Pratinjau foto sebelum laporan disimpan */

const photoInput = document.getElementById("foto");

if (photoInput) {
  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Pilih file gambar.");
      photoInput.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      alert("Ukuran foto maksimal 1 MB untuk prototype ini.");
      photoInput.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      selectedPhoto = reader.result;

      document.getElementById("foto-preview").src = selectedPhoto;
      document.getElementById("preview-wrapper").hidden = false;
    };

    reader.onerror = () => {
      alert("Foto gagal dibaca. Coba pilih foto lain.");
    };

    reader.readAsDataURL(file);
  });
}

/* Simpan status dan laporan */

if (updateForm) {
  updateForm.addEventListener("submit", event => {
    event.preventDefault();

    const id = document.getElementById("update-id").value;

    const task = tasks.find(item =>
      item.id === id &&
      item.petugas === workerSelect.value
    );

    if (!task) {
      alert("Pilih tugas yang ingin diperbarui terlebih dahulu.");
      return;
    }

    const previousTask = { ...task };

    task.status = document.getElementById("update-status").value;
    task.catatan = document.getElementById("catatan").value.trim();
    task.foto = selectedPhoto;

    if (!saveTasks()) {
      Object.assign(task, previousTask);
      return;
    }

    renderWorker();

    alert("Laporan pekerjaan berhasil disimpan.");
  });
}

/* =========================
   INISIALISASI HALAMAN
========================= */

if (document.body.dataset.page === "admin") {
  renderAdmin();
}

if (document.body.dataset.page === "petugas") {
  renderWorker();
}

/* =========================
   NAVIGASI HALAMAN MOBILE (SETIAP TAB TERPISAH)
========================= */
function showAppView(viewId) {
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.toggle('active', view.id === viewId);
  });
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === viewId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  const main = document.querySelector('.main-content') || document.querySelector('.mobile-content-area');
  if (main) main.scrollTop = 0;
  if (viewId !== 'worker-qr') stopAssetCamera();
  if (viewId !== 'worker-photo') stopEvidenceCamera();
  if (viewId === 'admin-assets') renderAssetList('admin-asset-list');
  if (viewId === 'admin-calendar') renderCalendarList();
  if (viewId === 'admin-reports') renderReports('admin-report-list');
  if (viewId === 'worker-reports') renderReports('worker-report-history');
}

document.addEventListener('click', event => {
  const viewBtn = event.target.closest('[data-view]');
  if (viewBtn) {
    showAppView(viewBtn.dataset.view);
    return;
  }
  const backBtn = event.target.closest('[data-workflow-back]');
  if (backBtn) {
    showAppView(backBtn.dataset.workflowBack);
    return;
  }
  const filterBtn = event.target.closest('[data-task-filter]');
  if (filterBtn) {
    document.querySelectorAll('[data-task-filter]').forEach(item => item.classList.toggle('active', item === filterBtn));
    renderWorker();
    return;
  }
});

const workerSearch = document.getElementById('worker-task-search');
if (workerSearch) workerSearch.addEventListener('input', renderWorker);
const qrBackButton = document.getElementById('qr-back');
if (qrBackButton) qrBackButton.addEventListener('click', () => showAppView('worker-tasks'));


/* Prototype database aset. Di produksi, ganti penyimpanan ini dengan API/database server. */
const ASSET_STORAGE_KEY = 'upiFacilityCareAssets_v1';
const starterAssets = [
  { code: 'AST-001', name: 'Toilet Gedung A', location: 'Gedung A, Lantai 1', category: 'Sanitasi', status: 'Aktif', note: 'Periksa kebersihan dan ketersediaan sabun.' },
  { code: 'AST-002', name: 'Koridor Gedung A', location: 'Gedung A, Lantai 3', category: 'Area umum', status: 'Aktif', note: 'Periksa kebersihan koridor lantai 3.' },
  { code: 'AST-003', name: 'Area Perpustakaan', location: 'Perpustakaan, Lantai 1', category: 'Area umum', status: 'Aktif', note: 'Jaga kebersihan area baca dan rak buku.' },
  { code: 'AST-004', name: 'Ballroom Gedung A', location: 'Gedung A, Lantai 5', category: 'Aula & Ballroom', status: 'Aktif', note: 'Pembersihan lantai dan penataan ruangan.' }
];
function loadAssets() {
  try {
    const stored = JSON.parse(localStorage.getItem(ASSET_STORAGE_KEY) || 'null');
    return Array.isArray(stored) && stored.length ? stored : starterAssets;
  } catch { return starterAssets; }
}
const assets = loadAssets();
function assetCard(asset) {
  return `<article class="task-card asset-card"><div class="task-meta"><span class="priority normal">${escapeHTML(asset.code)}</span><span class="status-badge status-selesai">${escapeHTML(asset.status)}</span></div><h3>${escapeHTML(asset.name)}</h3><p>📍 ${escapeHTML(asset.location)}</p><p>Jenis: ${escapeHTML(asset.category)}</p><p>${escapeHTML(asset.note || '')}</p></article>`;
}
function renderAssetList(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = assets.map(assetCard).join('');
}
function renderCalendarList() {
  const el = document.getElementById('admin-calendar-list');
  if (!el) return;
  const ordered = [...tasks].sort((a,b) => (a.tenggat || '').localeCompare(b.tenggat || ''));
  el.innerHTML = ordered.length ? ordered.map(t => `<article class="task-card"><div class="task-meta"><span>${formatDate(t.tenggat)}</span>${statusBadge(t.status)}</div><h3>${escapeHTML(t.judul)}</h3><p>📍 ${escapeHTML(t.lokasi)}</p><p>Petugas: ${escapeHTML(t.petugas)}</p></article>`).join('') : '<p class="empty-state">Belum ada jadwal maintenance.</p>';
}
function renderReports(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reported = tasks.filter(t => t.catatan || t.foto || t.status === 'Selesai');
  el.innerHTML = reported.length ? reported.map(t => {
    const hasAi = t.cleanlinessPercentage !== undefined;
    const isCompleted = t.cleanlinessPercentage > 50.0;
    return `<article class="task-card">
      <div class="task-meta">${statusBadge(t.status)}</div>
      <h3>${escapeHTML(t.judul)}</h3>
      <p>📍 ${escapeHTML(t.lokasi)}</p>
      ${hasAi ? `
        <div style="margin: 8px 0; padding: 6px 10px; border-radius: 8px; background: ${isCompleted ? '#dcfce7' : '#fee2e2'}; color: ${isCompleted ? '#15803d' : '#b91c1c'}; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
          <span>${isCompleted ? '✓ SELESAI' : '⚠️ BELUM SELESAI'}</span>
          <span>• Kebersihan: ${t.cleanlinessPercentage}%</span>
          <span>• Fisik: ${t.physicalConditionPercentage || 100}%</span>
        </div>
      ` : ''}
      <p style="white-space: pre-line; margin-top: 6px;">${escapeHTML(t.catatan || 'Tidak ada catatan.')}</p>
      ${t.assetCode ? `<p><strong>Aset:</strong> ${escapeHTML(t.assetName || '')} (${escapeHTML(t.assetCode)})</p>` : ''}
      ${t.aiStatus ? `<p><strong>Hasil AI:</strong> ${escapeHTML(t.aiStatus)}</p>` : ''}
      ${t.foto ? `<img class="photo-preview" src="${t.foto}" alt="Foto bukti">` : ''}
    </article>`;
  }).join('') : '<p class="empty-state">Belum ada laporan dari petugas.</p>';
}

/* Pemindai QR menggunakan kamera perangkat + BarcodeDetector bila didukung browser. */
let assetStream = null;
let scanActive = false;
let scanDetector = null;
const qrVideo = document.getElementById('qr-video');
const cameraStatus = document.getElementById('camera-status');
const cameraPlaceholder = document.getElementById('camera-placeholder');
function stopAssetCamera() {
  scanActive = false;
  if (assetStream) assetStream.getTracks().forEach(track => track.stop());
  assetStream = null;
  if (qrVideo) { qrVideo.pause(); qrVideo.srcObject = null; }
  if (cameraPlaceholder) cameraPlaceholder.hidden = false;
  const start = document.getElementById('start-camera');
  const stop = document.getElementById('stop-camera');
  if (start) start.hidden = false;
  if (stop) stop.hidden = true;
}
function lookupAsset(code) {
  const clean = String(code || '').trim().toUpperCase();
  const asset = assets.find(item => item.code.toUpperCase() === clean || String(item.qrValue || '').toUpperCase() === clean);
  const result = document.getElementById('asset-result');
  if (!result) return;
  result.hidden = false;
  if (!asset) {
    result.innerHTML = `<div class="asset-not-found"><h3>Kode aset belum terdaftar</h3><p>Kode yang terbaca: <strong>${escapeHTML(clean)}</strong></p><p>Periksa QR atau daftarkan aset ke data aset.</p></div>`;
    return;
  }
  const task = tasks.find(item => item.id === selectedTaskId && item.petugas === workerSelect?.value);
  if (!task) {
    result.innerHTML = `<div class="asset-not-found"><h3>Pilih Work Order terlebih dahulu</h3><p>Kembali ke daftar tugas dan tekan Cek Detail untuk memilih pekerjaan.</p></div>`;
    return;
  }
  if (task.status === 'Selesai') {
    result.innerHTML = `<div class="asset-not-found"><h3>Work Order sudah selesai</h3><p>${escapeHTML(task.judul)}</p><p>Pilih tugas lain untuk melanjutkan.</p></div>`;
    return;
  }
  if (asset.code !== task.assetCode) {
    result.innerHTML = `<div class="asset-not-found"><h3>QR tidak sesuai Work Order</h3><p>Aset terbaca: <strong>${escapeHTML(asset.name)} (${escapeHTML(asset.code)})</strong></p><p>Tugas ini mengharuskan kode <strong>${escapeHTML(task.assetCode || 'belum ditentukan')}</strong>. Checklist tidak dapat dibuka sebelum QR yang benar dipindai.</p></div>`;
    return;
  }
  activeWorkflowAsset = asset;
  result.innerHTML = `<div class="asset-found"><span class="asset-check">✓</span><p class="eyebrow">ASET COCOK DENGAN WORK ORDER</p><h2>${escapeHTML(asset.name)}</h2><p><strong>Work Order:</strong> ${escapeHTML(task.id)} — ${escapeHTML(task.judul)}</p><p><strong>Kode QR:</strong> ${escapeHTML(asset.code)}</p><p><strong>Lokasi:</strong> ${escapeHTML(asset.location)}</p><p><strong>Jenis:</strong> ${escapeHTML(asset.category)}</p><button class="btn btn-primary" id="open-asset-checklist" type="button">Lanjut ke Checklist</button></div>`;
  document.getElementById('open-asset-checklist')?.addEventListener('click', () => openChecklistForAsset(asset, task));
}
let activeWorkflowAsset = null;
let workflowChecklist = [];
let evidenceDataUrl = '';
let evidenceStream = null;
let aiDemoPassed = false;
function checklistForAsset(asset) {
  const category = String(asset.category || '').toLowerCase();
  if (/sanitasi|toilet|kamar mandi/.test(category + ' ' + asset.name.toLowerCase())) return ['Kloset/wastafel bersih dari noda', 'Lantai bersih dan kering', 'Tidak ada sampah berserakan', 'Sabun dan perlengkapan tersedia', 'Tidak ada bau menyengat'];
  if (/kelas|papan|ruang kelas/.test(category + ' ' + asset.name.toLowerCase())) return ['Papan tulis bersih tanpa sisa tulisan', 'Meja dan kursi bersih serta rapi', 'Lantai bersih dari debu/sampah', 'Tempat sampah tidak penuh'];
  return ['Permukaan aset bersih', 'Tidak ada debu atau sampah terlihat', 'Area sekitar rapi dan aman', 'Tidak ada noda yang terlihat'];
}
function openChecklistForAsset(asset, task) {
  activeWorkflowAsset = asset;
  workflowChecklist = checklistForAsset(asset).map(label => ({ label, checked: false }));
  const info = document.getElementById('checklist-asset-info');
  info.innerHTML = `<strong>${escapeHTML(asset.name)}</strong><p>${escapeHTML(asset.code)} · ${escapeHTML(asset.location)}</p><small>Work Order ${escapeHTML(task.id)} — ${escapeHTML(task.judul)}</small>`;
  document.getElementById('workflow-note').value = task.checklistNote || '';
  document.getElementById('checklist-items').innerHTML = workflowChecklist.map((item, i) => `<label class="checklist-row"><input type="checkbox" data-check-index="${i}"><span>${escapeHTML(item.label)}</span></label>`).join('');
  document.getElementById('continue-to-photo').disabled = true;
  document.getElementById('checklist-items').onchange = () => {
    workflowChecklist.forEach((item, i) => item.checked = !!document.querySelector(`[data-check-index="${i}"]`)?.checked);
    document.getElementById('continue-to-photo').disabled = !workflowChecklist.length || !workflowChecklist.every(item => item.checked);
  };
  showAppView('worker-checklist');
}
function stopEvidenceCamera() {
  if (evidenceStream) evidenceStream.getTracks().forEach(track => track.stop());
  evidenceStream = null;
  const video = document.getElementById('evidence-video');
  if (video) { video.pause(); video.srcObject = null; }
  const placeholder = document.getElementById('evidence-placeholder'); if (placeholder) placeholder.hidden = false;
  const start = document.getElementById('start-evidence-camera'); if (start) start.hidden = false;
  const capture = document.getElementById('capture-evidence'); if (capture) capture.disabled = true;
}
function setEvidence(dataUrl) {
  evidenceDataUrl = dataUrl;
  const preview = document.getElementById('evidence-preview');
  preview.src = dataUrl; preview.hidden = false;
  document.getElementById('analyze-evidence').disabled = false;
  document.getElementById('save-workflow').disabled = true;
  document.getElementById('ai-result').hidden = true;
  aiDemoPassed = false;
  document.getElementById('evidence-status').textContent = 'Foto bukti siap. Tekan Periksa dengan AI (Demo) untuk simulasi tahap analisis.';
}
document.getElementById('continue-to-photo')?.addEventListener('click', () => {
  if (!activeWorkflowAsset || !workflowChecklist.every(item => item.checked)) return;
  evidenceDataUrl = ''; aiDemoPassed = false;
  document.getElementById('evidence-preview').hidden = true;
  document.getElementById('evidence-file').value = '';
  document.getElementById('analyze-evidence').disabled = true;
  document.getElementById('save-workflow').disabled = true;
  document.getElementById('ai-result').hidden = true;
  document.getElementById('evidence-status').textContent = `Ambil foto bukti untuk ${activeWorkflowAsset.name}.`;
  showAppView('worker-photo');
});
document.getElementById('start-evidence-camera')?.addEventListener('click', async () => {
  const status = document.getElementById('evidence-status');
  if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'Kamera tidak tersedia. Gunakan Pilih Foto dari Galeri atau buka melalui localhost/HTTPS.'; return; }
  try {
    evidenceStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const video = document.getElementById('evidence-video'); video.srcObject = evidenceStream; await video.play();
    document.getElementById('evidence-placeholder').hidden = true;
    document.getElementById('start-evidence-camera').hidden = true;
    document.getElementById('capture-evidence').disabled = false;
    status.textContent = 'Kamera aktif. Pastikan aset terlihat jelas di foto.';
  } catch { status.textContent = 'Kamera tidak bisa dibuka. Izinkan akses kamera atau gunakan foto dari galeri.'; }
});
document.getElementById('capture-evidence')?.addEventListener('click', () => {
  const video = document.getElementById('evidence-video');
  if (!video.videoWidth) return;
  const canvas = document.getElementById('evidence-canvas');
  const scale = Math.min(1, 900 / video.videoWidth); canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  setEvidence(canvas.toDataURL('image/jpeg', .72));
  document.getElementById('evidence-status').textContent = 'Foto diambil dari kamera aplikasi.';
});
document.getElementById('evidence-file')?.addEventListener('change', e => {
  const file = e.target.files?.[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Pilih file gambar.'); e.target.value = ''; return; }
  if (file.size > 2 * 1024 * 1024) { alert('Ukuran foto maksimal 2 MB untuk prototipe.'); e.target.value = ''; return; }
  const reader = new FileReader(); reader.onload = () => setEvidence(reader.result); reader.readAsDataURL(file);
});
let latestAIResult = null;

document.getElementById('analyze-evidence')?.addEventListener('click', async () => {
  if (!evidenceDataUrl) return;
  const analyzeBtn = document.getElementById('analyze-evidence');
  const resultDiv = document.getElementById('ai-result');
  const statusEl = document.getElementById('evidence-status');
  
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = '⏳ AI Sedang Menganalisis...';
  resultDiv.hidden = false;
  resultDiv.innerHTML = `
    <div style="text-align: center; padding: 16px;">
      <div class="spinner"></div>
      <div style="font-weight: 800; font-size: 13px; color: #1e293b;">Menjalankan AI Computer Vision...</div>
      <p style="font-size: 11px; color: #64748b; margin-top: 4px;">
        Menganalisis kebersihan, noda (darah, urin, jejak kaki toilet), percikan air, kaca kotor, volume sampah, dan integritas fisik fasilitas.
      </p>
    </div>
  `;

  try {
    // 1. Ubah DataURL base64 menjadi Blob
    const resBlob = await fetch(evidenceDataUrl);
    const blob = await resBlob.blob();

    // 2. Siapkan FormData untuk dikirim ke API FastAPI
    const formData = new FormData();
    formData.append('file', blob, 'evidence.jpg');
    formData.append('room_id', '1');
    if (selectedTaskId) formData.append('task_id', selectedTaskId);
    const task = tasks.find(item => item.id === selectedTaskId);
    if (task) formData.append('notes', `Laporan Petugas ${task.id} (${activeWorkflowAsset?.name || task.lokasi})`);

    // 3. Panggil API AI Computer Vision
    const response = await fetch('/api/inspect', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (data.success) {
      latestAIResult = data;
      aiDemoPassed = true;
      document.getElementById('save-workflow').disabled = false;
      analyzeBtn.textContent = '✓ Analisis AI Berhasil';
      statusEl.textContent = `Analisis AI selesai. Status: ${data.status} | Skor Kebersihan: ${data.cleanliness_percentage}%`;

      const isCompleted = data.status === 'SELESAI';
      const statusBadgeClass = isCompleted ? 'ai-badge-success' : 'ai-badge-danger';
      const statusBadgeText = isCompleted ? '✓ STATUS: SELESAI (LAYAK & BERSIH)' : '⚠️ STATUS: BELUM SELESAI (BELUM BERSIH / RUSAK)';

      // Tampilkan pratinjau foto hasil anotasi resmi bounding box AI
      const preview = document.getElementById('evidence-preview');
      if (data.annotated_image_url) {
        preview.src = data.annotated_image_url + '?t=' + Date.now();
      }

      const stainTotal = (data.total_stains || 0) + (data.total_footprints || 0);

      resultDiv.innerHTML = `
        <div class="ai-inspection-card">
          <div class="ai-header ${statusBadgeClass}">
            ${statusBadgeText}
          </div>
          <div class="ai-score-grid">
            <div class="ai-score-box">
              <span>Kebersihan</span>
              <strong style="color: ${isCompleted ? '#16a34a' : '#dc2626'}">${data.cleanliness_percentage}%</strong>
            </div>
            <div class="ai-score-box">
              <span>Kekotoran</span>
              <strong style="color: #2563eb">${data.dirtiness_percentage}%</strong>
              <small>${data.dirtiness_level}</small>
            </div>
            <div class="ai-score-box">
              <span>Kondisi Fisik</span>
              <strong style="color: ${data.physical_condition_percentage <= 15 ? '#dc2626' : (data.physical_condition_percentage <= 60 ? '#d97706' : '#16a34a')}">${data.physical_condition_percentage}%</strong>
              <small>${data.damage_level}</small>
            </div>
          </div>
          <div class="ai-detail-tags">
            <span class="ai-tag">🗑️ Sampah: ${data.total_trash} (${data.trash_volume_status || 'Bebas'})</span>
            <span class="ai-tag">🧪 Noda/Jejak: ${stainTotal}</span>
            <span class="ai-tag">💧 Air: ${data.total_water_splashes || 0}</span>
            <span class="ai-tag">🪞 Kaca: ${data.total_glass_stains || 0}</span>
            <span class="ai-tag">⚠️ Kerusakan: ${data.total_defects || 0}</span>
          </div>
          <p class="ai-summary-note">💡 ${data.dirtiness_description || ''} ${data.damage_description || ''}</p>
          ${data.db_saved ? '<div class="ai-db-badge">💾 Foto & Hasil AI Tersimpan di Microsoft SQL Server</div>' : ''}
        </div>
      `;
    } else {
      throw new Error(data.detail || 'Gagal memproses gambar');
    }
  } catch (err) {
    console.error('AI Error:', err);
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Periksa Ulang dengan AI';
    resultDiv.innerHTML = `
      <div style="color: #b91c1c; padding: 12px; background: #fef2f2; border-radius: 8px;">
        <strong>⚠️ Gagal menjalankan analisis AI:</strong>
        <p style="margin: 4px 0;">${escapeHTML(err.message)}</p>
        <small style="color: #64748b;">Pastikan server backend aktif di port 8000.</small>
      </div>
    `;
  }
});

document.getElementById('save-workflow')?.addEventListener('click', async () => {
  const task = tasks.find(item => item.id === selectedTaskId && item.petugas === workerSelect?.value);
  if (!task || !activeWorkflowAsset || !evidenceDataUrl || !workflowChecklist.every(item => item.checked) || !aiDemoPassed) {
    alert('Lengkapi QR, checklist, foto, dan tahap verifikasi AI terlebih dahulu.');
    return;
  }
  task.assetCode = activeWorkflowAsset.code;
  task.assetName = activeWorkflowAsset.name;
  task.checklistResults = workflowChecklist.map(item => ({ label: item.label, checked: item.checked }));
  task.checklistNote = document.getElementById('workflow-note').value.trim();
  
  if (latestAIResult) {
    task.cleanlinessPercentage = latestAIResult.cleanliness_percentage;
    task.dirtinessPercentage = latestAIResult.dirtiness_percentage;
    task.physicalConditionPercentage = latestAIResult.physical_condition_percentage;
    task.damageLevel = latestAIResult.damage_level;
    task.aiStatus = `${latestAIResult.status} (Kebersihan: ${latestAIResult.cleanliness_percentage}%, Fisik: ${latestAIResult.physical_condition_percentage}%)`;
    task.foto = latestAIResult.annotated_image_url || evidenceDataUrl;
    task.status = latestAIResult.status === 'SELESAI' ? 'Selesai' : 'Diproses';
  } else {
    task.foto = evidenceDataUrl;
    task.status = 'Selesai';
  }

  task.catatan = `Aset: ${activeWorkflowAsset.name} (${activeWorkflowAsset.code})\nChecklist: ${workflowChecklist.length}/${workflowChecklist.length} item dicentang\n${task.checklistNote}\nHasil AI: ${task.aiStatus || 'Selesai'}`;
  task.waktuPengerjaan = new Date().toISOString();

  // Simpan ke localStorage
  if (!saveTasks()) return;

  // Sync ke database SQL Server jika API tersedia
  try {
    await fetch(`/api/tasks/${task.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: task.status,
        catatan: task.catatan,
        foto_url: task.foto,
        cleanliness_percentage: task.cleanlinessPercentage,
        dirtiness_percentage: task.dirtinessPercentage,
        physical_condition_percentage: task.physicalConditionPercentage,
        ai_status: task.aiStatus,
        inspection_id: latestAIResult?.inspection_id
      })
    });
  } catch (syncErr) {
    console.log('Sync to DB offline fallback:', syncErr.message);
  }

  stopEvidenceCamera();
  renderWorker();
  renderReports('worker-report-history');
  alert(`✓ Pekerjaan ${task.id} berhasil disimpan!\nStatus AI: ${latestAIResult?.status || 'Selesai'}\nSkor Kebersihan: ${latestAIResult?.cleanliness_percentage || 100}%`);
  showAppView('worker-tasks');
});
document.querySelectorAll('[data-workflow-back]').forEach(btn => btn.addEventListener('click', () => showAppView(btn.dataset.workflowBack)));

const lookupButton = document.getElementById('lookup-asset');
if (lookupButton) lookupButton.addEventListener('click', () => lookupAsset(document.getElementById('asset-code-input').value));
const assetCodeInput = document.getElementById('asset-code-input');
if (assetCodeInput) assetCodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); lookupAsset(assetCodeInput.value); } });
const startCameraButton = document.getElementById('start-camera');
if (startCameraButton) startCameraButton.addEventListener('click', async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraStatus.textContent = 'Browser tidak mendukung kamera. Gunakan kolom kode manual atau buka lewat localhost/HTTPS.';
    return;
  }
  if (!('BarcodeDetector' in window)) {
    cameraStatus.textContent = 'Kamera tersedia, tetapi pemindaian QR otomatis belum didukung browser ini. Masukkan kode aset secara manual di bawah.';
  }
  try {
    assetStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    qrVideo.srcObject = assetStream;
    await qrVideo.play();
    cameraPlaceholder.hidden = true;
    startCameraButton.hidden = true;
    document.getElementById('stop-camera').hidden = false;
    cameraStatus.textContent = 'Kamera aktif. Arahkan QR aset ke dalam bingkai.';
    if (!('BarcodeDetector' in window)) return;
    scanDetector = new BarcodeDetector({ formats: ['qr_code'] });
    scanActive = true;
    const scanFrame = async () => {
      if (!scanActive || !qrVideo || qrVideo.readyState < 2) return;
      try {
        const codes = await scanDetector.detect(qrVideo);
        if (codes.length && codes[0].rawValue) {
          cameraStatus.textContent = 'QR terbaca: ' + codes[0].rawValue;
          document.getElementById('asset-code-input').value = codes[0].rawValue;
          lookupAsset(codes[0].rawValue);
          stopAssetCamera();
          return;
        }
      } catch (err) { /* frame berikutnya akan dicoba */ }
      if (scanActive) requestAnimationFrame(scanFrame);
    };
    requestAnimationFrame(scanFrame);
  } catch (error) {
    cameraStatus.textContent = 'Kamera tidak bisa dibuka. Izinkan akses kamera di browser dan gunakan localhost atau HTTPS.';
  }
});
const stopCameraButton = document.getElementById('stop-camera');
if (stopCameraButton) stopCameraButton.addEventListener('click', () => { stopAssetCamera(); cameraStatus.textContent = 'Kamera dimatikan.'; });

// Sinkronisasi tugas dengan database SQL Server
async function syncTasksWithServer() {
  try {
    const res = await fetch('/api/tasks');
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      json.data.forEach(serverTask => {
        const idx = tasks.findIndex(t => t.id === serverTask.id);
        if (idx >= 0) {
          tasks[idx] = { ...tasks[idx], ...serverTask };
        } else {
          tasks.push(serverTask);
        }
      });
      saveTasks();
      if (document.body.dataset.page === 'admin') renderAdmin();
      if (document.body.dataset.page === 'petugas') renderWorker();
    }
  } catch (e) {
    // Mode offline / fallback localStorage
  }
}

// Isi halaman aset/laporan saat dibuka pertama kali dan aktifkan satu view saja.
if (document.body.dataset.page === 'admin') {
  renderAssetList('admin-asset-list');
  renderCalendarList();
  showAppView('admin-dashboard');
  syncTasksWithServer();
}
if (document.body.dataset.page === 'petugas') {
  const dateLabel = document.getElementById('worker-date');
  if (dateLabel) dateLabel.textContent = "Rabu, 07 Oktober 2026";
  renderReports('worker-report-history');
  showAppView('worker-tasks');
  syncTasksWithServer();
}
