let currentData = [];

const dataHandler = {
    onDataChanged(data) {
        currentData = data;
        renderLoans(data);
        updateStats(data);
    }
};

// Simple localStorage-based SDK fallback
(function ensureDataSdk() {
    const LOCAL_KEY = "peminjaman_alat_data_v1";

    const simpleSdk = {
        data: [],
        handler: null,
        async init(handler) {
            this.handler = handler;
            try {
                this.data = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
            } catch (err) {
                this.data = [];
            }
            this.handler.onDataChanged(this.data);
        },
        async create(item) {
            item.id = Date.now().toString();
            this.data.push(item);
            this._save();
            this.handler.onDataChanged(this.data);
            return item;
        },
        async update(id, patch) {
            const idx = this.data.findIndex(d => d.id === id);
            if (idx === -1) return null;
            Object.assign(this.data[idx], patch);
            this._save();
            this.handler.onDataChanged(this.data);
            return this.data[idx];
        },
        _save() {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
        }
    };

    if (!window.dataSdk) window.dataSdk = simpleSdk;
})();

function renderLoans(data) {
    const container = document.getElementById("loans-container");
    if (!data || !data.length) {
        container.innerHTML = "<p class='text-center text-gray-500'>Belum ada data</p>";
        return;
    }

    container.innerHTML = data
        .slice()
        .reverse()
        .map(d => {
            const returned = d.status !== "Dipinjam";
            return `
      <div class="border p-4 rounded mb-3 flex justify-between items-start">
        <div>
          <b>${escapeHtml(d.nama_peminjam)}</b> (${escapeHtml(d.kelas)})<br>
          ${escapeHtml(d.nama_alat)} x ${d.jumlah}<br>
          <small class="text-gray-600">${new Date(d.tanggal_pinjam).toLocaleString()}</small><br>
          Status: <b>${escapeHtml(d.status)}</b>
          ${d.catatan ? `<div class="mt-2 text-sm">Catatan: ${escapeHtml(d.catatan)}</div>` : ""}
        </div>
        <div class="ml-4">
          ${returned ? `<div class="text-sm text-green-600">Dikembalikan</div>` : `<button data-id="${d.id}" class="btn-return btn-secondary">Kembalikan</button>`}
        </div>
      </div>
    `;
        })
        .join("");

    // Attach click handler for return buttons (event delegation)
    container.querySelectorAll('.btn-return').forEach(btn => {
        btn.addEventListener('click', async e => {
            const id = e.currentTarget.dataset.id;
            await window.dataSdk.update(id, { status: 'Dikembalikan', tanggal_kembali: new Date().toISOString() });
        });
    });
}

function updateStats(data) {
    document.getElementById("total-loans").textContent = data.length;
    document.getElementById("active-loans").textContent = data.filter(d => d.status === "Dipinjam").length;
}

document.getElementById("loan-form").addEventListener("submit", async e => {
    e.preventDefault();

    const data = {
        nama_peminjam: document.getElementById('nama-peminjam').value.trim(),
        kelas: document.getElementById('kelas').value.trim(),
        nama_alat: document.getElementById('nama-alat').value,
        jumlah: parseInt(document.getElementById('jumlah').value) || 1,
        status: "Dipinjam",
        tanggal_pinjam: new Date().toISOString(),
        catatan: document.getElementById('catatan').value.trim()
    };

    // Basic validation
    if (!data.nama_peminjam || !data.kelas || !data.nama_alat) {
        alert('Isi semua bidang yang wajib.');
        return;
    }

    const btnText = document.getElementById('submit-btn-text');
    const spinner = document.getElementById('submit-spinner');
    btnText.textContent = 'Menyimpan...';
    spinner.classList.remove('hidden');

    await window.dataSdk.create(data);
    e.target.reset();

    btnText.textContent = '🏃 Pinjam Alat';
    spinner.classList.add('hidden');
});

function escapeHtml(str){
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function init() {
    await window.dataSdk.init(dataHandler);
}
init();
