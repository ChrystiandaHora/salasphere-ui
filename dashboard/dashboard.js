/**
 * dashboard.js — SalaSphere Dashboard Logic (Specific to dashboard/index.html)
 * Handles: rooms CRUD, reservations CRUD, stats, filters, user management.
 */

// ─── Route Guard ─────────────────────────────────────────────────────────────
guardRoute();

// ─── State ───────────────────────────────────────────────────────────────────
let rooms = [];
let currentFilter = "todos";
let editingRoomId = null;

// ─── Image pool for room cards ───────────────────────────────────────────────
const ROOM_IMAGES = {
    reuniao: "../assets/img/reuniao.jpg",
    privativa: "../assets/img/privativa.jpg",
    desk: "../assets/img/desk.jpg",
};

// ─── On DOM Ready ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    // Populate user info in navbar
    const user = getCurrentUser();
    if (user) {
        document.getElementById("user-avatar").textContent = userInitials(user.nome);
        document.getElementById("user-name").textContent = user.nome.split(" ")[0];
        const roleBadge = document.getElementById("user-role-badge");
        roleBadge.textContent = user.role === "admin" ? "Admin" : "Usuário";

        if (user.role === "admin") {
            document.getElementById("btn-usuarios").classList.remove("d-none");
        }
    }

    // Logout
    document.getElementById("btn-logout").addEventListener("click", () => {
        clearSession();
        redirectLogin();
    });

    // Load rooms
    fetchRooms();

    // Filters
    document.querySelectorAll(".btn-filter").forEach((btn) => {
        btn.addEventListener("click", () => {
            currentFilter = btn.dataset.filter;
            document.querySelectorAll(".btn-filter").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            renderRooms();
        });
    });

    // Room form (create/edit)
    document.getElementById("form-sala").addEventListener("submit", submitRoomForm);

    // Offcanvas reset on close
    document.getElementById("offcanvas-sala").addEventListener("hidden.bs.offcanvas", resetRoomForm);

    // Open offcanvas for new room
    document.getElementById("btn-nova-sala").addEventListener("click", resetRoomForm);

    // User management modal
    document.getElementById("modal-usuarios").addEventListener("show.bs.modal", loadUsers);
    document.getElementById("form-novo-usuario").addEventListener("submit", addUser);

    // Edit user modal — form submit
    document.getElementById("form-edit-usuario").addEventListener("submit", submitEditUser);

    // Edit user modal — password toggle
    document.getElementById("toggle-edit-senha").addEventListener("click", () => {
        const input = document.getElementById("edit-user-senha");
        const icon = document.getElementById("edit-eye-icon");
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        icon.className = show ? "bi bi-eye-slash" : "bi bi-eye";
    });
});

// ─── Fetch & Render Rooms ─────────────────────────────────────────────────────
async function fetchRooms() {
    try {
        const res = await fetch(`${API_BASE}/salas`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar salas.");
        rooms = data;
        updateStats();
        renderRooms();
    } catch (err) {
        showAlert(`Erro ao carregar salas: ${err.message}`, "danger");
        document.getElementById("rooms-container").innerHTML = `
            <div class="text-center py-5" style="color: var(--text-secondary);">
                <i class="bi bi-wifi-off fs-1 mb-3 d-block" aria-hidden="true"></i>
                <p>Não foi possível conectar à API. Verifique se o servidor está rodando.</p>
            </div>`;
    }
}

function updateStats() {
    const now = new Date();
    let livres = 0,
        ocupadas = 0,
        manutencao = 0,
        reservasAtivas = 0;

    rooms.forEach((sala) => {
        if (sala.status === "manutencao") {
            manutencao++;
        } else {
            const ocupadaAgora = sala.reservas?.some((r) => {
                const ini = new Date(r.inicio);
                const fim = new Date(r.fim);
                return ini <= now && fim >= now;
            });
            if (ocupadaAgora) ocupadas++;
            else livres++;
        }
        reservasAtivas += sala.reservas?.filter((r) => new Date(r.fim) >= now).length || 0;
    });

    document.getElementById("val-total").textContent = rooms.length;
    document.getElementById("val-livres").textContent = livres;
    document.getElementById("val-ocupadas").textContent = ocupadas;
    document.getElementById("val-manutencao").textContent = manutencao;
    document.getElementById("val-reservas").textContent = reservasAtivas;
}

function renderRooms() {
    const container = document.getElementById("rooms-container");
    const emptyState = document.getElementById("empty-state");
    const now = new Date();
    const tpl = document.getElementById("tpl-room-card");
    const TIPO_LABEL = { reuniao: "Reunião", privativa: "Privativa", desk: "Hot Desk" };

    let filtered = rooms;
    if (currentFilter === "manutencao") {
        filtered = rooms.filter((s) => s.status === "manutencao");
    } else if (currentFilter !== "todos") {
        filtered = rooms.filter((s) => s.tipo === currentFilter && s.status !== "manutencao");
    }

    if (filtered.length === 0) {
        container.innerHTML = "";
        emptyState.classList.remove("d-none");
        return;
    }
    emptyState.classList.add("d-none");
    container.innerHTML = "";

    filtered.forEach((sala, i) => {
        const isOcupada =
            sala.status !== "manutencao" &&
            sala.reservas?.some((r) => new Date(r.inicio) <= now && new Date(r.fim) >= now);

        const isMaint = sala.status === "manutencao";
        const badgeClass = isMaint ? "badge-maintenance" : isOcupada ? "badge-occupied" : "badge-available";
        const badgeLabel = isMaint ? "Manutenção" : isOcupada ? "Ocupada" : "Disponível";
        const priceColor = isMaint ? "var(--color-amber)" : isOcupada ? "var(--color-slate)" : "var(--color-sky)";

        const nextReserva = sala.reservas?.find((r) => new Date(r.fim) >= now);
        const nextManutencao = sala.manutencoes?.find((m) => new Date(m.fim) >= now);

        const card = tpl.content.cloneNode(true).querySelector("article");
        card.style.animationDelay = `${i * 0.07}s`;
        card.setAttribute("aria-label", `Sala ${sala.nome}, ${badgeLabel}. Clique para ver a agenda.`);
        card.addEventListener("click", () => openAgenda(sala.id));
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") openAgenda(sala.id);
        });

        // Imagem
        const img = card.querySelector(".room-img");
        img.src = ROOM_IMAGES[sala.tipo] || ROOM_IMAGES.reuniao;
        img.alt = `Foto ilustrativa da sala ${sala.nome}`;

        // Badge e tipo
        const badge = card.querySelector("[data-bind='badge']");
        badge.className = `room-badge ${badgeClass}`;
        badge.textContent = badgeLabel;
        badge.setAttribute("aria-label", `Status: ${badgeLabel}`);

        card.querySelector("[data-bind='tipo']").textContent = TIPO_LABEL[sala.tipo] || sala.tipo;

        // Info
        card.querySelector("[data-bind='nome']").textContent = sala.nome;
        card.querySelector("[data-bind='capacidade']").innerHTML =
            `<i class="bi bi-people me-1" aria-hidden="true"></i>${sala.capacidade} pessoa${sala.capacidade > 1 ? "s" : ""}`;
        card.querySelector("[data-bind='reservas-count']").innerHTML =
            `<i class="bi bi-calendar2 me-1" aria-hidden="true"></i>${sala.reservas?.length || 0} reserva${sala.reservas?.length !== 1 ? "s" : ""}`;

        // Manutenção info
        if (nextManutencao) {
            const el = card.querySelector(".room-info-manutencao");
            el.classList.remove("d-none");
            el.querySelector("[data-bind='manutencao-info']").textContent = formatDateRange(
                nextManutencao.inicio,
                nextManutencao.fim
            );
        }

        // Próxima reserva
        if (nextReserva && !isMaint) {
            const el = card.querySelector(".room-info-reserva");
            el.classList.remove("d-none");
            el.querySelector("[data-bind='reserva-info']").textContent = formatDateRange(
                nextReserva.inicio,
                nextReserva.fim
            );
        }

        // Preço
        const precoEl = card.querySelector("[data-bind='preco']");
        precoEl.textContent = `R$ ${sala.preco_hora.toFixed(2)}`;
        precoEl.style.color = priceColor;

        // Botões de ação
        const btnAgenda = card.querySelector(".btn-agenda");
        btnAgenda.setAttribute("aria-label", `${isMaint ? "Ver agenda de" : "Ver agenda para reservar"} ${sala.nome}`);
        btnAgenda.querySelector(".bi").className = `bi bi-${isMaint ? "tools" : "calendar-plus"}`;
        btnAgenda.querySelector("[data-bind='btn-agenda-label']").textContent = isMaint ? "Ver Agenda" : "Reservar";
        btnAgenda.addEventListener("click", (e) => {
            e.stopPropagation();
            openAgenda(sala.id);
        });

        card.querySelector(".btn-edit").setAttribute("aria-label", `Editar sala ${sala.nome}`);
        card.querySelector(".btn-edit").addEventListener("click", (e) => {
            e.stopPropagation();
            openEditRoom(sala.id);
        });

        card.querySelector(".btn-delete").setAttribute("aria-label", `Excluir sala ${sala.nome}`);
        card.querySelector(".btn-delete").addEventListener("click", (e) => {
            e.stopPropagation();
            confirmDeleteRoom(sala.id, sala.nome);
        });

        container.appendChild(card);
    });
}

// ─── Navigate to Room Agenda ──────────────────────────────────────────────────
function openAgenda(salaId) {
    window.location.href = `../salas/index.html?id=${salaId}`;
}

// ─── Room CRUD ────────────────────────────────────────────────────────────────
function resetRoomForm() {
    editingRoomId = null;
    document.getElementById("sala-id-edit").value = "";
    document.getElementById("sala-nome").value = "";
    document.getElementById("sala-tipo").value = "";
    document.getElementById("sala-capacidade").value = "";
    document.getElementById("sala-preco").value = "";
    document.getElementById("sala-status").value = "disponivel";

    document.getElementById("offcanvas-sala-title").textContent = "Cadastrar Nova Sala";
    document.getElementById("btn-sala-text").textContent = "Cadastrar Sala";
}

function openEditRoom(salaId) {
    const sala = rooms.find((s) => s.id === salaId);
    if (!sala) return;
    editingRoomId = salaId;
    document.getElementById("sala-id-edit").value = sala.id;
    document.getElementById("sala-nome").value = sala.nome;
    document.getElementById("sala-tipo").value = sala.tipo;
    document.getElementById("sala-capacidade").value = sala.capacidade;
    document.getElementById("sala-preco").value = sala.preco_hora;

    document.getElementById("offcanvas-sala-title").textContent = "Editar Sala";
    document.getElementById("btn-sala-text").textContent = "Salvar Alterações";
    new bootstrap.Offcanvas(document.getElementById("offcanvas-sala")).show();
}

async function submitRoomForm(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-sala");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Salvando...';

    const payload = {
        nome: document.getElementById("sala-nome").value.trim(),
        tipo: document.getElementById("sala-tipo").value,
        capacidade: parseInt(document.getElementById("sala-capacidade").value),
        preco_hora: parseFloat(document.getElementById("sala-preco").value),
        status: "disponivel",
    };

    try {
        let res, data;
        if (editingRoomId) {
            res = await fetch(`${API_BASE}/salas/${editingRoomId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        } else {
            res = await fetch(`${API_BASE}/salas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        }
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao salvar sala.");

        if (data.warnings?.length) {
            data.warnings.forEach((w) => showAlert(w, "warning"));
        }
        showAlert(data.message || "Sala salva!", "success");
        bootstrap.Offcanvas.getInstance(document.getElementById("offcanvas-sala")).hide();
        await fetchRooms();
    } catch (err) {
        showAlert(err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

async function confirmDeleteRoom(salaId, salaNome) {
    if (
        !confirm(
            `Confirmar exclusão da sala "${salaNome}"?\n\nNota: A sala não pode ter reservas ou manutenções futuras ou em andamento para ser removida.`
        )
    )
        return;
    try {
        const res = await fetch(`${API_BASE}/salas/${salaId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao excluir.");
        showAlert(`Sala "${salaNome}" removida com sucesso.`, "success");
        await fetchRooms();
    } catch (err) {
        showAlert(err.message, "danger");
    }
}
// ─── User Management ──────────────────────────────────────────────────────────
async function loadUsers() {
    try {
        const res = await fetch(`${API_BASE}/usuarios`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar usuários.");

        const currentUser = getCurrentUser();
        const tbody = document.getElementById("usuarios-tbody");
        const tpl = document.getElementById("tpl-usuario-row");
        tbody.innerHTML = "";

        data.forEach((u) => {
            const row = tpl.content.cloneNode(true).querySelector("tr");

            row.querySelector("[data-bind='avatar']").textContent = userInitials(u.nome);
            row.querySelector("[data-bind='nome']").textContent = u.nome;
            row.querySelector("[data-bind='email']").textContent = u.email;
            row.querySelector("[data-bind='criado-em']").textContent = u.criado_em;

            const badge = row.querySelector("[data-bind='role-badge']");
            badge.className = `pill-badge ${u.role === "admin" ? "indigo" : "sky"}`;
            badge.innerHTML = u.role === "admin" ? '<i class="bi bi-shield-check me-1"></i>Admin' : "Usuário";

            const isMe = u.id === currentUser?.id;
            row.querySelector(".btn-edit-user").setAttribute("aria-label", `Editar usuário ${u.nome}`);
            row.querySelector(".btn-edit-user").addEventListener("click", () =>
                openEditUser(u.id, u.nome, u.email, u.role)
            );

            if (isMe) {
                row.querySelector(".btn-delete-user").classList.add("d-none");
                row.querySelector(".label-voce").classList.remove("d-none");
            } else {
                row.querySelector(".btn-delete-user").setAttribute("aria-label", `Remover usuário ${u.nome}`);
                row.querySelector(".btn-delete-user").addEventListener("click", () => deleteUser(u.id, u.nome));
            }

            tbody.appendChild(row);
        });
    } catch (err) {
        showAlert(err.message, "danger");
    }
}

async function addUser(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-add-user");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

    const payload = {
        nome: document.getElementById("new-user-nome").value.trim(),
        email: document.getElementById("new-user-email").value.trim(),
        senha: document.getElementById("new-user-senha").value,
        role: document.getElementById("new-user-role").value,
    };

    try {
        const headers = { "Content-Type": "application/json" };
        if (payload.role === "admin") {
            const currentUser = getCurrentUser();
            if (currentUser?.token) {
                headers["Authorization"] = `Bearer ${currentUser.token}`;
            }
        }

        const res = await fetch(`${API_BASE}/usuarios/registrar`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao cadastrar usuário.");
        showAlert(`Usuário "${payload.nome}" adicionado!`, "success");
        e.target.reset();
        await loadUsers();
    } catch (err) {
        showAlert(err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

function openEditUser(userId, nome, email, role) {
    // Populate preview chip
    document.getElementById("edit-user-avatar-preview").textContent = userInitials(nome);
    document.getElementById("edit-user-nome-preview").textContent = nome;
    document.getElementById("edit-user-email-preview").textContent = email;

    // Pre-fill form with current values (user can selectively change)
    document.getElementById("edit-user-id").value = userId;
    document.getElementById("edit-user-nome").value = nome;
    document.getElementById("edit-user-email").value = email;
    document.getElementById("edit-user-senha").value = "";
    document.getElementById("edit-user-role").value = role;

    // Close the users list modal and open the edit modal
    const usersModal = bootstrap.Modal.getInstance(document.getElementById("modal-usuarios"));
    if (usersModal) usersModal.hide();

    // Small delay to allow close animation
    setTimeout(() => {
        new bootstrap.Modal(document.getElementById("modal-edit-usuario")).show();
    }, 320);
}

async function submitEditUser(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-edit-user");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Salvando...';

    const userId = document.getElementById("edit-user-id").value;
    const payload = {};

    const nome = document.getElementById("edit-user-nome").value.trim();
    const email = document.getElementById("edit-user-email").value.trim();
    const senha = document.getElementById("edit-user-senha").value;
    const role = document.getElementById("edit-user-role").value;

    if (nome) payload.nome = nome;
    if (email) payload.email = email;
    if (senha) {
        if (senha.length < 6) {
            showAlert("A nova senha deve ter pelo menos 6 caracteres.", "danger");
            btn.disabled = false;
            btn.innerHTML = orig;
            return;
        }
        payload.senha = senha;
    }
    if (role) payload.role = role;

    if (!payload.nome && !payload.email && !payload.senha && !payload.role) {
        showAlert("Preencha ao menos um campo para atualizar.", "warning");
        btn.disabled = false;
        btn.innerHTML = orig;
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/usuarios/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao atualizar usuário.");

        showAlert(`Usuário "${data.nome}" updated successfully!`, "success");

        // If the logged-in user edited themselves, update the session
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id === parseInt(userId)) {
            saveSession({ ...currentUser, nome: data.nome, email: data.email, role: data.role });
            document.getElementById("user-avatar").textContent = userInitials(data.nome);
            document.getElementById("user-name").textContent = data.nome.split(" ")[0];
        }

        bootstrap.Modal.getInstance(document.getElementById("modal-edit-usuario")).hide();

        // Re-open the users list after a brief moment
        setTimeout(() => {
            new bootstrap.Modal(document.getElementById("modal-usuarios")).show();
        }, 350);
    } catch (err) {
        showAlert(err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

async function deleteUser(userId, nome) {
    if (!confirm(`Remover o usuário "${nome}"?`)) return;
    try {
        const res = await fetch(`${API_BASE}/usuarios/${userId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao remover.");
        showAlert(`Usuário "${nome}" removido.`, "success");
        await loadUsers();
    } catch (err) {
        showAlert(err.message, "danger");
    }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatDateRange(inicio, fim) {
    const opts = { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" };
    const ini = new Date(inicio.replace(" ", "T"));
    const end = new Date(fim.replace(" ", "T"));
    return `${ini.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} das ${ini.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} às ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function toLocalDatetimeString(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(
        /[&<>"']/g,
        (m) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[m]
    );
}

// Apply font scale on load
if (typeof applyFontScale === "function") {
    applyFontScale();
}

// Make accessible from HTML onclick attributes
window.openAgenda = openAgenda;
window.openEditRoom = openEditRoom;
window.confirmDeleteRoom = confirmDeleteRoom;
window.deleteUser = deleteUser;
window.openEditUser = openEditUser;
