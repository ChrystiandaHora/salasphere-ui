/**
 * salas.js — SalaSphere Agenda / Timeline Logic (Specific to salas/index.html)
 * Handles: Day/Week/Month views, period navigation, reservation creation & editing.
 */

// ─── Route Guard ─────────────────────────────────────────────────────────────
guardRoute();

// ─── State ───────────────────────────────────────────────────────────────────
let salaData = null;
let currentView = "dia"; // "dia" | "semana" | "mes"
let currentDate = new Date(); // anchor date for navigation

const SALA_ID = new URLSearchParams(window.location.search).get("id");
const HOUR_PX = 56; // px per hour in day/week views

const ROOM_IMAGES = {
    reuniao: "../assets/img/reuniao.jpg",
    privativa: "../assets/img/privativa.jpg",
    desk: "../assets/img/desk.jpg",
};

// ─── On DOM Ready ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    // Guard: must have a sala id
    if (!SALA_ID) {
        showAlert("ID da sala não informado.", "danger");
        setTimeout(() => window.location.replace("../dashboard/index.html"), 1500);
        return;
    }

    // Populate user chip
    const user = getCurrentUser();
    if (user) {
        document.getElementById("user-avatar").textContent = userInitials(user.nome);
        document.getElementById("user-name").textContent = user.nome.split(" ")[0];
    }

    // Logout
    document.getElementById("btn-logout").addEventListener("click", () => {
        clearSession();
        redirectLogin();
    });

    // View buttons
    document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            currentView = btn.dataset.view;
            document.querySelectorAll(".view-btn").forEach((b) => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            renderAgenda();
        });
    });

    // Period navigation
    document.getElementById("btn-prev").addEventListener("click", () => {
        navigatePeriod(-1);
    });
    document.getElementById("btn-next").addEventListener("click", () => {
        navigatePeriod(1);
    });
    document.getElementById("btn-today").addEventListener("click", () => {
        currentDate = new Date();
        renderAgenda();
    });

    // New reservation
    document.getElementById("btn-nova-reserva").addEventListener("click", () => {
        openNewReservationModal(null, null);
    });

    // Price preview on reservation form
    document.getElementById("reserva-inicio").addEventListener("change", updatePrecoPreview);
    document.getElementById("reserva-fim").addEventListener("change", updatePrecoPreview);

    // Reservation form submit
    document.getElementById("form-reserva").addEventListener("submit", submitReservation);

    // Edit form submit
    document.getElementById("form-edit-reserva").addEventListener("submit", submitEditReservation);

    // Show maintenance checkbox for admin users
    if (user && user.role === "admin") {
        const container = document.getElementById("container-reserva-manutencao");
        if (container) container.classList.remove("d-none");
    }

    // Toggle price preview based on maintenance checkbox
    const maintCheckbox = document.getElementById("reserva-manutencao");
    if (maintCheckbox) {
        maintCheckbox.addEventListener("change", (e) => {
            const preview = document.getElementById("reserva-preco-preview");
            if (e.target.checked) {
                preview.style.display = "none";
            } else {
                updatePrecoPreview();
            }
        });
    }

    // Cancel reservation button
    document.getElementById("btn-cancel-reserva").addEventListener("click", async () => {
        const reservaId = document.getElementById("edit-reserva-id").value;
        await cancelarReserva(reservaId);
    });

    // Delete maintenance button click
    const btnRemoverMaint = document.getElementById("btn-remover-manutencao");
    if (btnRemoverMaint) {
        btnRemoverMaint.addEventListener("click", async () => {
            const id = document.getElementById("edit-reserva-id").value;
            await excluirManutencao(id);
        });
    }

    // Event delegation for timeline actions to avoid inline onclick attributes and JSON stringification issues
    const agendaContainer = document.getElementById("agenda-container");
    if (agendaContainer) {
        agendaContainer.addEventListener("click", (e) => {
            const target = e.target.closest("[data-action]");
            if (!target) return;
            e.stopPropagation();

            const action = target.dataset.action;
            if (action === "new-reserva") {
                openNewReservationModal(target.dataset.start, target.dataset.end);
            } else if (action === "view-reserva") {
                const id = parseInt(target.dataset.id);
                const res = salaData?.reservas?.find((r) => r.id === id);
                if (res) openReservationDetail(res);
            } else if (action === "view-maint") {
                const id = parseInt(target.dataset.id);
                const maint = salaData?.manutencoes?.find((m) => m.id === id);
                if (maint) openMaintenanceDetail(maint);
            }
        });

        agendaContainer.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            const target = e.target.closest("[data-action]");
            if (!target) return;

            if (e.key === " ") e.preventDefault(); // prevent scroll
            e.stopPropagation();

            const action = target.dataset.action;
            if (action === "new-reserva") {
                openNewReservationModal(target.dataset.start, target.dataset.end);
            } else if (action === "view-reserva") {
                const id = parseInt(target.dataset.id);
                const res = salaData?.reservas?.find((r) => r.id === id);
                if (res) openReservationDetail(res);
            } else if (action === "view-maint") {
                const id = parseInt(target.dataset.id);
                const maint = salaData?.manutencoes?.find((m) => m.id === id);
                if (maint) openMaintenanceDetail(maint);
            }
        });
    }

    // Load sala data
    await loadSala();
});

// ─── Load Sala ────────────────────────────────────────────────────────────────
async function loadSala() {
    try {
        const res = await fetch(`${API_BASE}/salas/${SALA_ID}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sala não encontrada.");
        salaData = data;
        renderHeader();
        renderAgenda();
    } catch (err) {
        showAlert(err.message, "danger");
        document.getElementById("sala-header-card").innerHTML = `
            <div style="color: var(--text-secondary);">
                <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>${err.message}
            </div>`;
    }
}

// ─── Header ───────────────────────────────────────────────────────────────────
function renderHeader() {
    if (!salaData) return;
    const tipoLabel = { reuniao: "Sala de Reunião", privativa: "Sala Privativa", desk: "Hot Desk" };
    const statusBadge =
        salaData.status === "manutencao"
            ? '<span class="pill-badge amber pulse-warning-badge"><i class="bi bi-tools me-1"></i>Manutenção</span>'
            : '<span class="pill-badge sky"><i class="bi bi-check-circle me-1"></i>Disponível</span>';

    const imgUrl = ROOM_IMAGES[salaData.tipo] || ROOM_IMAGES.reuniao;

    document.getElementById("sala-header-card").innerHTML = `
        <img src="${imgUrl}" alt="Foto da sala ${escapeHtml(salaData.nome)}" class="sala-header-img">
        <div class="sala-header-info">
            <h1>${escapeHtml(salaData.nome)}</h1>
            <div class="sala-header-meta">
                <span><i class="bi bi-building me-1" aria-hidden="true"></i>${tipoLabel[salaData.tipo] || salaData.tipo}</span>
                <span><i class="bi bi-people me-1" aria-hidden="true"></i>${salaData.capacidade} pessoa${salaData.capacidade > 1 ? "s" : ""}</span>
                <span><i class="bi bi-calendar2 me-1" aria-hidden="true"></i>${salaData.reservas?.length || 0} reserva${salaData.reservas?.length !== 1 ? "s" : ""}</span>
                ${statusBadge}
            </div>
        </div>
        <div class="sala-header-price">
            <div class="sala-price-big">R$ ${salaData.preco_hora.toFixed(2)}</div>
            <div class="sala-price-unit">por hora</div>
        </div>
    `;

    document.title = `${salaData.nome} — SalaSphere`;
}

// ─── Agenda Rendering ─────────────────────────────────────────────────────────
function renderAgenda() {
    updatePeriodLabel();
    const container = document.getElementById("agenda-container");
    container.innerHTML = "";

    if (currentView === "dia") renderDayView(container);
    else if (currentView === "semana") renderWeekView(container);
    else if (currentView === "mes") renderMonthView(container);
}

// ─── Period Navigation ────────────────────────────────────────────────────────
function navigatePeriod(dir) {
    const d = new Date(currentDate);
    if (currentView === "dia") d.setDate(d.getDate() + dir);
    else if (currentView === "semana") d.setDate(d.getDate() + 7 * dir);
    else if (currentView === "mes") d.setMonth(d.getMonth() + dir);
    currentDate = d;
    renderAgenda();
}

function updatePeriodLabel() {
    const el = document.getElementById("period-label");
    const d = currentDate;
    if (currentView === "dia") {
        el.textContent = d.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    } else if (currentView === "semana") {
        const mon = getWeekStart(d);
        const sun = new Date(mon);
        sun.setDate(sun.getDate() + 6);
        const monStr = mon.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
        const sunStr = sun.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
        el.textContent = `${monStr} – ${sunStr}`;
    } else {
        el.textContent = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
}

function renderDayView(container) {
    const reservas = getReservasForDay(currentDate);
    const manutencoes = getManutencoesForDay(currentDate);
    const now = new Date();
    const isToday = isSameDay(currentDate, now);

    let html = `<div class="timeline-container">
        <div class="timeline-header" aria-hidden="true">
            <div class="timeline-time-col">Hora</div>
            <div style="padding-left: 12px;">${currentDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</div>
        </div>
        <div class="timeline-body" id="timeline-body" role="grid" aria-label="Timeline do dia">`;

    for (let h = 0; h <= 23; h++) {
        const hourLabel = `${String(h).padStart(2, "0")}:00`;
        const slotStart = new Date(currentDate);
        slotStart.setHours(h, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(h + 1);

        // Find reservation that overlaps this hour
        const res = reservas.find((r) => {
            const ri = parseDate(r.inicio);
            const rf = parseDate(r.fim);
            return ri < slotEnd && rf > slotStart;
        });

        // Find maintenance that overlaps this hour
        const maint = manutencoes.find((m) => {
            const mi = parseDate(m.inicio);
            const mf = parseDate(m.fim);
            return mi < slotEnd && mf > slotStart;
        });

        const isCurrentHour = isToday && now.getHours() === h;

        let slotClass = "";
        let slotAttr = "";
        let slotContent = "";
        let ariaLabelText = `Horário livre ${hourLabel}`;

        if (res) {
            slotClass = " has-reservation";
            slotContent = renderResBlock(res);
            ariaLabelText = `Reserva de ${formatTime(parseDate(res.inicio))} às ${formatTime(parseDate(res.fim))}`;
        } else if (maint) {
            slotClass = " has-reservation";
            slotContent = renderMaintBlock(maint);
            ariaLabelText = `Manutenção de ${formatTime(parseDate(maint.inicio))} às ${formatTime(parseDate(maint.fim))}`;
        } else if (slotStart < now) {
            slotClass = " slot-past";
            slotAttr = `title="Horário indisponível (passado)"`;
            slotContent = `<span class="slot-past-label" aria-hidden="true"><i class="bi bi-x-circle me-1"></i> Indisponível</span>`;
            ariaLabelText = `Horário livre no passado ${hourLabel}`;
        } else {
            slotAttr = `data-action="new-reserva" data-start="${slotStart.toISOString()}" data-end="${slotEnd.toISOString()}" title="Clique para reservar ${hourLabel}"`;
            slotContent = `<span class="slot-free-label" aria-hidden="true"><i class="bi bi-plus-circle me-1"></i> Reservar</span>`;
        }

        html += `
        <div class="timeline-row${isCurrentHour ? " " : ""}" role="row">
            <div class="timeline-time" role="rowheader">${hourLabel}
                ${isCurrentHour ? `<div style="width:6px; height:6px; background:var(--color-indigo); border-radius:50%; margin: 2px auto 0;"></div>` : ""}
            </div>
            <div class="timeline-slot${slotClass}" role="gridcell" ${slotAttr} aria-label="${ariaLabelText}">
                ${slotContent}
            </div>
        </div>`;
    }

    html += `</div></div>`;
    container.innerHTML = html;

    // Scroll to current hour if today
    if (isToday) {
        const body = document.getElementById("timeline-body");
        if (body) {
            const scrollY = Math.max(0, (now.getHours() - 1) * HOUR_PX);
            body.scrollTop = scrollY;
        }
    }
}

function renderResBlock(res) {
    const ri = parseDate(res.inicio);
    const rf = parseDate(res.fim);
    const now = new Date();
    const stateClass = rf < now ? "res-past" : ri <= now ? "res-ongoing" : "res-future";

    const dur = ((rf - ri) / 3600000).toFixed(1);
    const val = (res.preco_hora_reservado * parseFloat(dur)).toFixed(2);

    return `
    <div class="reservation-block ${stateClass}"
         style="top: 4px; height: calc(100% - 8px);"
         data-action="view-reserva" data-id="${res.id}"
         role="button" tabindex="0"
         aria-label="Reserva de ${formatTime(ri)} às ${formatTime(rf)}, ${dur}h, R$${val}">
         <div>${formatTime(ri)} – ${formatTime(rf)}</div>
         <div style="opacity: 0.75; font-size: 0.7rem; margin-top: 2px;">${dur}h · R$ ${val}</div>
    </div>`;
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────
function renderWeekView(container) {
    const weekStart = getWeekStart(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });
    const now = new Date();
    const dayAbbr = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    let html = `<div class="weekly-grid" role="grid" aria-label="Agenda semanal">`;

    // Corner
    html += `<div class="week-day-header" aria-hidden="true"></div>`;
    // Day headers
    days.forEach((d) => {
        const isT = isSameDay(d, now);
        html += `<div class="week-day-header${isT ? " today" : ""}" role="columnheader" aria-label="${d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}">
            <span class="week-day-name">${dayAbbr[d.getDay()]}</span>
            <div class="week-day-num">${d.getDate()}</div>
        </div>`;
    });

    // Time rows 0:00 – 23:00
    for (let h = 0; h <= 23; h++) {
        html += `<div class="week-time-col" role="rowheader" aria-label="${h}:00">${String(h).padStart(2, "0")}h</div>`;

        days.forEach((day) => {
            const slotStart = new Date(day);
            slotStart.setHours(h, 0, 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setHours(h + 1);

            const reservas = getReservasForDay(day);
            const manutencoes = getManutencoesForDay(day);
            const res = reservas.find((r) => {
                const ri = parseDate(r.inicio);
                const rf = parseDate(r.fim);
                return ri < slotEnd && rf > slotStart;
            });
            const maint = manutencoes.find((m) => {
                const mi = parseDate(m.inicio);
                const mf = parseDate(m.fim);
                return mi < slotEnd && mf > slotStart;
            });

            const isT = isSameDay(day, now) && now.getHours() === h;
            const isPast = slotStart < now;
            const canReserve = !res && !maint && !isPast;
            const isPastFree = isPast && !res && !maint;

            let cellContent = "";
            if (res) {
                cellContent = `
                <div class="reservation-block ${getResClass(res)}"
                     style="top: 2px; left: 2px; right: 2px; height: calc(100% - 4px); font-size: 0.65rem; padding: 3px 5px;"
                     data-action="view-reserva" data-id="${res.id}"
                     role="button" tabindex="0"
                     aria-label="Reserva ${formatTime(parseDate(res.inicio))}–${formatTime(parseDate(res.fim))}">
                    ${formatTime(parseDate(res.inicio))}–${formatTime(parseDate(res.fim))}
                </div>`;
            } else if (maint) {
                cellContent = `
                <div class="reservation-block res-maintenance"
                     style="top: 2px; left: 2px; right: 2px; height: calc(100% - 4px); font-size: 0.65rem; padding: 3px 5px;"
                     data-action="view-maint" data-id="${maint.id}"
                     role="button" tabindex="0"
                     aria-label="Manutenção ${formatTime(parseDate(maint.inicio))}–${formatTime(parseDate(maint.fim))}">
                    <i class="bi bi-tools" style="font-size:0.6rem;"></i> ${formatTime(parseDate(maint.inicio))}–${formatTime(parseDate(maint.fim))}
                </div>`;
            } else if (isPast) {
                cellContent = `<span class="slot-past-label" style="font-size:0.6rem; opacity:0.5; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);" aria-hidden="true"><i class="bi bi-x-circle"></i></span>`;
            }

            html += `
            <div class="week-cell${isSameDay(day, now) ? " today-col" : ""}${isPastFree ? " slot-past" : ""}"
                 role="gridcell"
                 ${canReserve ? `data-action="new-reserva" data-start="${slotStart.toISOString()}" data-end="${slotEnd.toISOString()}"` : ""}
                 aria-label="${day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })} ${h}:00 ${res ? "— Reservada" : maint ? "— Manutenção" : isPast ? "— Passado" : "— Livre"}">
                ${cellContent}
                ${isT ? `<div style="position:absolute; inset:0; border: 1px solid var(--color-indigo); border-radius:0; pointer-events:none;" aria-hidden="true"></div>` : ""}
            </div>`;
        });
    }

    html += `</div>`;
    container.innerHTML = html;
}

function renderMonthView(container) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const now = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Grid starts on Sunday
    const startOffset = firstDay.getDay();
    const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    let html = `<div class="monthly-grid" role="grid" aria-label="Agenda mensal">`;
    dayNames.forEach((d) => {
        html += `<div class="month-day-header" role="columnheader">${d}</div>`;
    });

    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - startOffset + 1;
        let cellDate = null;
        if (dayNum >= 1 && dayNum <= lastDay.getDate()) {
            cellDate = new Date(year, month, dayNum);
        }

        if (!cellDate) {
            html += `<div class="month-cell other-month" role="gridcell" aria-hidden="true"></div>`;
            continue;
        }

        const isT = isSameDay(cellDate, now);
        const reservas = getReservasForDay(cellDate);
        const manutencoes = getManutencoesForDay(cellDate);
        const totalItems = [...reservas, ...manutencoes.map((m) => ({ ...m, isMaint: true }))];
        totalItems.sort((a, b) => parseDate(a.inicio) - parseDate(b.inicio));

        const dayNumHtml = isT
            ? `<div class="month-day-num" style="display:flex; justify-content:flex-start;"><div style="background:var(--color-indigo); color:#fff; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.78rem; font-weight:700;">${dayNum}</div></div>`
            : `<div class="month-day-num">${dayNum}</div>`;

        const dayEnd = new Date(cellDate);
        dayEnd.setHours(23, 59, 59, 999);
        const isPast = dayEnd < now;

        html += `
        <div class="month-cell${isT ? " today" : ""}${isPast ? " slot-past" : ""}" role="gridcell"
             aria-label="${cellDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} — ${totalItems.length} item(s)"
             ${isPast ? "" : `data-action="new-reserva" data-start="${setNoon(cellDate).toISOString()}" data-end="${setHour(cellDate, 10).toISOString()}"`}>
            ${dayNumHtml}
            ${totalItems
                .slice(0, 3)
                .map((item) => {
                    if (item.isMaint) {
                        return `<span class="month-res-dot maintenance"
                                   data-action="view-maint" data-id="${item.id}"
                                   role="button" tabindex="0"
                                   aria-label="Manutenção ${formatTime(parseDate(item.inicio))}–${formatTime(parseDate(item.fim))}">
                                <i class="bi bi-tools" style="font-size:0.6rem;"></i> ${formatTime(parseDate(item.inicio))}
                            </span>`;
                    } else {
                        const cls = getResClass(item);
                        return `<span class="month-res-dot ${cls.replace("res-", "")}"
                                   data-action="view-reserva" data-id="${item.id}"
                                   role="button" tabindex="0"
                                   aria-label="${formatTime(parseDate(item.inicio))}–${formatTime(parseDate(item.fim))}">
                                ${formatTime(parseDate(item.inicio))}
                            </span>`;
                    }
                })
                .join("")}
            ${totalItems.length > 3 ? `<span style="font-size:0.68rem; color: var(--text-muted);">+${totalItems.length - 3} mais</span>` : ""}
        </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function openNewReservationModal(startIso, endIso) {
    let slotStart = startIso ? new Date(startIso) : new Date(new Date().setMinutes(0, 0, 0) + 3600000);
    let slotEnd = endIso ? new Date(endIso) : new Date(slotStart.getTime() + 3600000);

    const agora = new Date();
    // Se o slot estiver no dia de hoje e o horário sugerido for no passado,
    // corrige para iniciar na próxima hora cheia futura.
    if (isSameDay(slotStart, agora) && slotStart < agora) {
        const nextHour = agora.getHours() + 1;
        if (nextHour < 24) {
            slotStart.setHours(nextHour, 0, 0, 0);
            slotEnd = new Date(slotStart.getTime() + 3600000);
        }
    }

    if (slotStart < agora) {
        showAlert("Não é possível realizar agendamentos para o passado.", "warning");
        return;
    }

    if (salaData?.manutencoes?.length) {
        const conflito = salaData.manutencoes.find((m) => {
            const mi = parseDate(m.inicio);
            const mf = parseDate(m.fim);
            return mi < slotEnd && mf > slotStart;
        });
        if (conflito) {
            showAlert(
                `Este horário está bloqueado por manutenção (${formatTime(parseDate(conflito.inicio))} – ${formatTime(parseDate(conflito.fim))}).`,
                "warning"
            );
            return;
        }
    }

    const maintCheckbox = document.getElementById("reserva-manutencao");
    if (maintCheckbox) maintCheckbox.checked = false;

    document.getElementById("reserva-inicio").value = toLocalDatetimeString(slotStart);
    document.getElementById("reserva-fim").value = toLocalDatetimeString(slotEnd);
    document.getElementById("reserva-preco-preview").style.display = "none";
    updatePrecoPreview();
    new bootstrap.Modal(document.getElementById("modal-reserva")).show();
}

function updatePrecoPreview() {
    const isMaint = document.getElementById("reserva-manutencao")?.checked || false;
    const preview = document.getElementById("reserva-preco-preview");
    if (isMaint) {
        preview.style.display = "none";
        return;
    }

    const ini = document.getElementById("reserva-inicio").value;
    const fim = document.getElementById("reserva-fim").value;
    if (!ini || !fim || !salaData) {
        preview.style.display = "none";
        return;
    }
    const dur = (new Date(fim) - new Date(ini)) / 3600000;
    if (dur <= 0) {
        preview.style.display = "none";
        return;
    }
    const total = (dur * salaData.preco_hora).toFixed(2);
    document.getElementById("reserva-preco-text").textContent =
        `Duração: ${dur.toFixed(1)}h · R$ ${salaData.preco_hora.toFixed(2)}/h = Custo estimado: R$ ${total}`;
    preview.style.display = "block";
}

function openReservationDetail(res) {
    const now = new Date();
    const ri = parseDate(res.inicio);
    const rf = parseDate(res.fim);
    const dur = ((rf - ri) / 3600000).toFixed(1);
    const val = (res.preco_hora_reservado * parseFloat(dur)).toFixed(2);
    let stateLabel, stateClass;
    if (rf < now) {
        stateLabel = "Finalizada";
        stateClass = "slate";
    } else if (ri <= now) {
        stateLabel = "Em andamento";
        stateClass = "amber";
    } else {
        stateLabel = "Futura";
        stateClass = "indigo";
    }

    document.getElementById("detail-reserva-info").innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
            <div style="background: rgba(255,255,255,0.04); border-radius: 10px; padding: 12px;">
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">Início</div>
                <div style="font-weight:600;">${ri.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                <div style="color: var(--color-indigo); font-size: 1.1rem; font-weight: 700;">${formatTime(ri)}</div>
            </div>
            <div style="background: rgba(255,255,255,0.04); border-radius: 10px; padding: 12px;">
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">Fim</div>
                <div style="font-weight:600;">${rf.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                <div style="color: var(--color-indigo); font-size: 1.1rem; font-weight: 700;">${formatTime(rf)}</div>
            </div>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">
            <span class="pill-badge ${stateClass}">${stateLabel}</span>
            <span style="color:var(--text-secondary); font-size:0.88rem;">${dur}h · R$ ${val}</span>
        </div>`;

    document.getElementById("edit-reserva-id").value = res.id;
    document.getElementById("edit-inicio").value = toLocalDatetimeString(ri);
    document.getElementById("edit-fim").value = toLocalDatetimeString(rf);

    const isPast = rf < now;
    document.getElementById("edit-reserva-section").style.display = isPast ? "none" : "block";
    document.getElementById("reserva-past-notice").classList.toggle("d-none", !isPast);

    // Hide maintenance-specific elements
    document.getElementById("action-maintenance-section").classList.add("d-none");

    new bootstrap.Modal(document.getElementById("modal-detail-reserva")).show();
}

async function submitReservation(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-reserva");
    const orig = btn.innerHTML;
    btn.disabled = true;

    const isMaint = document.getElementById("reserva-manutencao")?.checked || false;
    btn.innerHTML = isMaint
        ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Agendando...'
        : '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Reservando...';

    const inicio = document.getElementById("reserva-inicio").value;
    const fim = document.getElementById("reserva-fim").value;

    if (new Date(inicio) < new Date()) {
        showAlert("O horário de início não pode ser no passado.", "danger");
        btn.disabled = false;
        btn.innerHTML = orig;
        return;
    }

    const user = getCurrentUser();

    try {
        const endpoint = isMaint ? `${API_BASE}/salas/${SALA_ID}/manutencoes` : `${API_BASE}/salas/${SALA_ID}/reservar`;

        const bodyObj = isMaint ? { inicio, fim } : { inicio, fim, usuario_id: user?.id || null };

        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyObj),
        });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data.error || (isMaint ? "Erro ao agendar manutenção." : "Erro ao criar reserva."));
        showAlert(isMaint ? "Manutenção agendada com sucesso!" : "Reserva criada com sucesso!", "success");
        bootstrap.Modal.getInstance(document.getElementById("modal-reserva")).hide();
        await loadSala();
    } catch (err) {
        showAlert(err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

async function submitEditReservation(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-edit-submit");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Salvando...';

    const reservaId = document.getElementById("edit-reserva-id").value;
    const inicio = document.getElementById("edit-inicio").value;
    const fim = document.getElementById("edit-fim").value;

    const origRes =
        salaData?.reservas?.find((r) => String(r.id) === String(reservaId)) ||
        salaData?.manutencoes?.find((m) => String(m.id) === String(reservaId));

    if (origRes) {
        const origInicioLocal = toLocalDatetimeString(parseDate(origRes.inicio));
        if (inicio !== origInicioLocal && new Date(inicio) < new Date()) {
            showAlert("O horário de início não pode ser no passado.", "danger");
            btn.disabled = false;
            btn.innerHTML = orig;
            return;
        }
    }

    try {
        const res = await fetch(`${API_BASE}/reservas/${reservaId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inicio, fim }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao editar reserva.");
        showAlert("Reserva atualizada!", "success");
        bootstrap.Modal.getInstance(document.getElementById("modal-detail-reserva")).hide();
        await loadSala();
    } catch (err) {
        showAlert(err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

async function cancelarReserva(reservaId) {
    if (!confirm("Confirmar cancelamento desta reserva?")) return;
    try {
        const res = await fetch(`${API_BASE}/reservas/${reservaId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao cancelar.");
        showAlert("Reserva cancelada com sucesso.", "success");
        bootstrap.Modal.getInstance(document.getElementById("modal-detail-reserva")).hide();
        await loadSala();
    } catch (err) {
        showAlert(err.message, "danger");
    }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
if (typeof applyFontScale === "function") {
    applyFontScale();
}

function getReservasForDay(date) {
    if (!salaData?.reservas) return [];
    return salaData.reservas.filter((r) => isSameDay(parseDate(r.inicio), date));
}

function getManutencoesForDay(date) {
    if (!salaData?.manutencoes) return [];
    // Retorna manutenções que INTERSECTAM o dia inteiro (não só as que começam nele)
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    return salaData.manutencoes.filter((m) => {
        const mi = parseDate(m.inicio);
        const mf = parseDate(m.fim);
        return mi < dayEnd && mf > dayStart; // intersección de intervalos
    });
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Fixed check: date comparison
function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseDate(str) {
    return new Date(str.replace(" ", "T"));
}

// Fix padding issue with hours in standard timeline
function formatTime(date) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getResClass(res) {
    const now = new Date();
    const ri = parseDate(res.inicio);
    const rf = parseDate(res.fim);
    if (rf < now) return "res-past";
    if (ri <= now) return "res-ongoing";
    return "res-future";
}

function toLocalDatetimeString(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setNoon(date) {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    return d;
}
function setHour(date, h) {
    const d = new Date(date);
    d.setHours(h, 0, 0, 0);
    return d;
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

function renderMaintBlock(maint) {
    const mi = parseDate(maint.inicio);
    const mf = parseDate(maint.fim);
    const dur = ((mf - mi) / 3600000).toFixed(1);
    return `
    <div class="reservation-block res-maintenance"
         style="top: 4px; height: calc(100% - 8px);"
         data-action="view-maint" data-id="${maint.id}"
         role="button" tabindex="0"
         aria-label="Manutenção de ${formatTime(mi)} às ${formatTime(mf)}">
        <div><i class="bi bi-tools me-1"></i>Manutenção</div>
        <div style="opacity: 0.75; font-size: 0.7rem; margin-top: 2px;">${formatTime(mi)} – ${formatTime(mf)} (${dur}h)</div>
    </div>`;
}

function openMaintenanceDetail(maint) {
    const user = getCurrentUser();
    const mi = parseDate(maint.inicio);
    const mf = parseDate(maint.fim);
    const dur = ((mf - mi) / 3600000).toFixed(1);

    document.getElementById("detail-reserva-info").innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
            <div style="background: rgba(255,255,255,0.04); border-radius: 10px; padding: 12px;">
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">Início da Manutenção</div>
                <div style="font-weight:600;">${mi.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                <div style="color: var(--color-amber); font-size: 1.1rem; font-weight: 700;">${formatTime(mi)}</div>
            </div>
            <div style="background: rgba(255,255,255,0.04); border-radius: 10px; padding: 12px;">
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">Fim da Manutenção</div>
                <div style="font-weight:600;">${mf.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                <div style="color: var(--color-amber); font-size: 1.1rem; font-weight: 700;">${formatTime(mf)}</div>
            </div>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">
            <span class="pill-badge amber"><i class="bi bi-tools me-1"></i>Manutenção</span>
            <span style="color:var(--text-secondary); font-size:0.88rem;">Duração: ${dur}h</span>
        </div>`;

    document.getElementById("edit-reserva-id").value = maint.id; // Store ID in hidden input

    // Hide the reservation edit form and past notices
    document.getElementById("edit-reserva-section").style.display = "none";
    document.getElementById("reserva-past-notice").classList.add("d-none");

    // Show the maintenance actions section only if user is admin
    const isMaintAdmin = user && user.role === "admin";
    document.getElementById("action-maintenance-section").classList.toggle("d-none", !isMaintAdmin);

    new bootstrap.Modal(document.getElementById("modal-detail-reserva")).show();
}

async function excluirManutencao(maintId) {
    if (!confirm("Confirmar cancelamento/exclusão desta manutenção?")) return;
    try {
        const res = await fetch(`${API_BASE}/manutencoes/${maintId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao remover manutenção.");
        showAlert("Manutenção excluída com sucesso.", "success");
        bootstrap.Modal.getInstance(document.getElementById("modal-detail-reserva")).hide();
        await loadSala();
    } catch (err) {
        showAlert(err.message, "danger");
    }
}
