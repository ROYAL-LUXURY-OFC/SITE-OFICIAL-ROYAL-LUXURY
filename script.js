// ========================================
// ROYAL LUXURY - SITE OFICIAL
// Conteúdo público carregado do Supabase
// ========================================

const SUPABASE_URL = "https://ekzgqudjhmgqedvqgfdk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bb0Tw3G9jG4e61UdmKu49g_kFnYdKfF";

const rlxSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// MENU MOBILE
const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
        navigation.classList.toggle("active");
        const aberto = navigation.classList.contains("active");
        menuToggle.textContent = aberto ? "✕" : "☰";
        menuToggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    });

    navigation.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navigation.classList.remove("active");
            menuToggle.textContent = "☰";
            menuToggle.setAttribute("aria-label", "Abrir menu");
        });
    });
}

function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
    })[char]);
}

function dateBR(value) {
    if (!value) return "";
    const date = new Date(value + (String(value).length === 10 ? "T12:00:00" : ""));
    return Number.isNaN(date.getTime()) ? safeText(value) : date.toLocaleDateString("pt-BR");
}

function renderEmpty(container, title, message) {
    container.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">♛</span>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>`;
}

async function loadPublicMembers() {
    const box = document.querySelector("#membros .container");
    if (!box) return;
    const { data, error } = await rlxSupabase.from("membros_rlx")
        .select("id,nome,nick,id_jogo,patente,funcao")
        .eq("ativo", true).order("nome");
    if (error) {
        console.error("Falha ao carregar membros RLX:", error);
        return;
    }
    const old = box.querySelector(".empty-state");
    if (old) old.remove();
    let grid = box.querySelector(".members-grid");
    if (!grid) {
        grid = document.createElement("div");
        grid.className = "cards-grid members-grid";
        box.appendChild(grid);
    }
    if (!data?.length) {
        renderEmpty(grid, "MEMBROS EM BREVE", "Os integrantes oficiais serão apresentados aqui.");
        return;
    }
    grid.innerHTML = data.map(member => `
        <article class="info-card member-card">
            <div class="member-card-top">
                <span class="member-avatar">${safeText(String(member.nick || "RL").trim().slice(0, 2).toUpperCase())}</span>
                <span class="card-kicker">ROYAL LUXURY</span>
            </div>
            <h3>${safeText(member.nick)}</h3>
            <p>${safeText(member.nome)}</p>
            <p><strong>Patente:</strong> ${safeText(member.patente || "—")}</p>
            <p><strong>Função:</strong> ${safeText(member.funcao || "—")}</p>
        </article>`).join("");
}

async function loadPublicLines() {
    const box = document.querySelector("#lines .container");
    if (!box) return;
    const { data, error } = await rlxSupabase.from("lines_rlx")
        .select("id,nome,sigla,capitao_nick,descricao,capa_url")
        .eq("ativo", true).order("nome");
    if (error) {
        console.error("Falha ao carregar lines RLX:", error);
        return;
    }
    const old = box.querySelector(".empty-state");
    if (old) old.remove();
    let grid = box.querySelector(".lines-grid");
    if (!grid) {
        grid = document.createElement("div");
        grid.className = "cards-grid lines-grid";
        box.appendChild(grid);
    }
    if (!data?.length) {
        renderEmpty(grid, "LINES EM BREVE", "Nossas equipes serão divulgadas aqui.");
        return;
    }
    grid.innerHTML = data.map(line => `
        <article class="info-card line-card">
            ${line.capa_url ? `<div class="line-cover" style="width:110px!important;max-width:110px!important;height:62px!important;max-height:62px!important;overflow:hidden;flex:0 0 110px"><img src="${safeText(line.capa_url)}" alt="Capa da line ${safeText(line.nome)}" loading="lazy" style="display:block;width:100%;height:100%;object-fit:cover"></div>` : ""}
            <span class="card-kicker">${safeText(line.sigla || "RLX")}</span>
            <h3>${safeText(line.nome)}</h3>
            <p><strong>Capitão:</strong> ${safeText(line.capitao_nick || "A definir")}</p>
            <p>${safeText(line.descricao || "")}</p>
        </article>`).join("");
}

async function loadPublicResults() {
    const box = document.querySelector("#resultados .container");
    if (!box) return;
    const { data, error } = await rlxSupabase.from("resultados_rlx")
        .select("id,nick,data_guerra,nome_guerra,pontos,abates,colocacao")
        .eq("publicado", true).order("data_guerra", { ascending: false }).limit(30);
    if (error) {
        console.error("Falha ao carregar resultados RLX:", error);
        return;
    }
    const old = box.querySelector(".empty-state");
    if (old) old.remove();
    let grid = box.querySelector(".results-grid");
    if (!grid) {
        grid = document.createElement("div");
        grid.className = "cards-grid results-grid";
        box.appendChild(grid);
    }
    if (!data?.length) {
        renderEmpty(grid, "RESULTADOS EM BREVE", "Os resultados oficiais aparecerão nesta seção.");
        return;
    }
    grid.innerHTML = data.map(row => `
        <article class="info-card">
            <span class="card-kicker">${dateBR(row.data_guerra)}</span>
            <h3>${safeText(row.nick)}</h3>
            <p>${safeText(row.nome_guerra || "Guerra RLX")}</p>
            <p><strong>Pontos:</strong> ${safeText(row.pontos)}</p>
            <p><strong>Abates:</strong> ${safeText(row.abates ?? 0)}</p>
            <p><strong>Colocação:</strong> ${safeText(row.colocacao ?? "—")}</p>
        </article>`).join("");
}

async function loadPublicChampionships() {
    const box = document.querySelector("#campeonatos .container");
    if (!box) return;
    const { data, error } = await rlxSupabase.from("campeonatos_rlx")
        .select("id,nome,descricao,colocacao,data_inicio,data_fim,imagem_url")
        .eq("publicado", true).order("criado_em", { ascending: false });
    if (error) {
        console.error("Falha ao carregar campeonatos RLX:", error);
        return;
    }
    const old = box.querySelector(".empty-state");
    if (old) old.remove();
    let grid = box.querySelector(".championships-grid");
    if (!grid) {
        grid = document.createElement("div");
        grid.className = "cards-grid championships-grid";
        box.appendChild(grid);
    }
    if (!data?.length) {
        renderEmpty(grid, "EM BREVE", "Novidades sobre os campeonatos serão publicadas aqui.");
        return;
    }
    grid.innerHTML = data.map(item => `
        <article class="info-card">
            ${item.imagem_url ? `<img class="card-image" src="${safeText(item.imagem_url)}" alt="">` : ""}
            <span class="card-kicker">CAMPEONATO RLX</span>
            <h3>${safeText(item.nome)}</h3>
            <p>${safeText(item.descricao || "")}</p>
            <p><strong>Colocação:</strong> ${safeText(item.colocacao || "Em andamento")}</p>
            <p><strong>Período:</strong> ${dateBR(item.data_inicio)} ${item.data_fim ? " até " + dateBR(item.data_fim) : ""}</p>
        </article>`).join("");
}

async function loadPublicNews() {
    const box = document.querySelector("#noticias .container");
    if (!box) return;
    const { data, error } = await rlxSupabase.from("noticias_rlx")
        .select("id,titulo,conteudo,imagem_url,criado_em")
        .eq("publicado", true).order("criado_em", { ascending: false }).limit(12);
    if (error) {
        console.error("Falha ao carregar notícias RLX:", error);
        return;
    }
    const old = box.querySelector(".empty-state");
    if (old) old.remove();
    let grid = box.querySelector(".news-grid");
    if (!grid) {
        grid = document.createElement("div");
        grid.className = "cards-grid news-grid";
        box.appendChild(grid);
    }
    if (!data?.length) {
        renderEmpty(grid, "NENHUMA NOTÍCIA PUBLICADA", "Em breve teremos novidades.");
        return;
    }
    grid.innerHTML = data.map(item => `
        <article class="info-card news-card">
            ${item.imagem_url ? `<img class="card-image" src="${safeText(item.imagem_url)}" alt="">` : ""}
            <span class="card-kicker">${dateBR(item.criado_em)}</span>
            <h3>${safeText(item.titulo)}</h3>
            <p>${safeText(item.conteudo || "")}</p>
        </article>`).join("");
}

async function loadRoyalLuxurySite() {
    await Promise.allSettled([
        loadPublicMembers(),
        loadPublicLines(),
        loadPublicResults(),
        loadPublicChampionships(),
        loadPublicNews()
    ]);
}

loadRoyalLuxurySite();

console.log("ROYAL LUXURY | Site oficial conectado.");
console.log("RESPECT. ELEGANCE. DOMINANCE.");


// ANIMAÇÕES DE ENTRADA AO ROLAR A PÁGINA
(function initRoyalMotion() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = ".section-heading, .about-content, .empty-state, .info-card, .recruitment-content, .footer-content";
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

    function revealWithin(root) {
        if (root.matches?.(targets) && !root.classList.contains("reveal")) {
            root.classList.add("reveal");
            observer.observe(root);
        }
        root.querySelectorAll?.(targets).forEach((element, index) => {
            if (!element.classList.contains("reveal")) {
                element.classList.add("reveal");
                if (element.classList.contains("info-card")) {
                    element.dataset.revealDelay = String((index % 3) + 1);
                }
                observer.observe(element);
            }
        });
    }

    revealWithin(document);
    const mutationObserver = new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(node => {
            if (node.nodeType === 1) revealWithin(node);
        }));
    });
    mutationObserver.observe(document.querySelector("main") || document.body, {
        childList: true,
        subtree: true
    });
})();
