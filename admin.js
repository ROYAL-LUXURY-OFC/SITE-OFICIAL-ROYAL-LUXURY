// ==========================================
// ROYAL LUXURY - PAINEL ADMINISTRATIVO
// Supabase conectado ao projeto oficial RLX
// ==========================================

const SUPABASE_URL = "https://ekzgqudjhmgqedvqgfdk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bb0Tw3G9jG4e61UdmKu49g_kFnYdKfF";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const loginScreen = $("#loginScreen");
const adminPanel = $("#adminPanel");
const loginForm = $("#loginForm");
const loginMessage = $("#loginMessage");

let currentApplicationFilter = "Pendente";

function showMessage(message, error = false) {
    loginMessage.textContent = message;
    loginMessage.style.color = error ? "#ff7777" : "#c9a44c";
}

function showAdminPanel() {
    loginScreen.hidden = true;
    adminPanel.hidden = false;
}

function showLogin() {
    adminPanel.hidden = true;
    loginScreen.hidden = false;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
    })[char]);
}

function formatDate(value) {
    if (!value) return "Não informado";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? escapeHTML(value)
        : date.toLocaleString("pt-BR");
}

function withTimeout(promise, milliseconds = 12000) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(
            () => reject(new Error("A verificação do Supabase excedeu o tempo limite.")),
            milliseconds
        );
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function verifyAdmin() {
    const { data: sessionData, error: sessionError } =
        await withTimeout(supabaseClient.auth.getSession());

    if (sessionError) throw sessionError;
    if (!sessionData.session) return false;

    // A função SECURITY DEFINER verifica auth.uid() na tabela admins_rlx.
    const { data, error } = await withTimeout(
        supabaseClient.rpc("is_admin_rlx")
    );

    if (error) throw error;

    if (data !== true) {
        await supabaseClient.auth.signOut();
        return false;
    }

    return true;
}

// LOGIN
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("#email").value.trim();
    const password = $("#password").value;

    showMessage("Verificando acesso...");

    let signInResult;
    try {
        signInResult = await withTimeout(
            supabaseClient.auth.signInWithPassword({ email, password }),
            15000
        );
    } catch (error) {
        console.error("Tempo excedido ao autenticar:", error);
        showMessage("O Supabase não respondeu ao login. Confira a conexão e tente novamente.", true);
        return;
    }

    const { error } = signInResult;

    if (error) {
        showMessage("Não foi possível entrar. Confira o e-mail e a senha.", true);
        return;
    }

    try {
        if (!(await verifyAdmin())) {
            showMessage("Esta conta não possui permissão de administrador.", true);
            return;
        }
    } catch (error) {
        console.error("Falha ao verificar administrador:", error);
        showMessage("A verificação demorou demais ou falhou. Atualize a página e tente novamente.", true);
        return;
    }

    showAdminPanel();
    await loadApplications();
    await loadMembers();
});

// RECUPERAÇÃO DE SENHA
$("#forgotPassword").addEventListener("click", async () => {
    const email = $("#email").value.trim();

    if (!email) {
        showMessage("Digite seu e-mail antes de solicitar a recuperação.", true);
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href
    });

    if (error) {
        showMessage("Não foi possível enviar o e-mail de recuperação.", true);
        return;
    }

    showMessage("Se o e-mail estiver cadastrado, você receberá as instruções.");
});

// SAIR
$("#logoutButton").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showLogin();
});

// NAVEGAÇÃO DAS ABAS
$$(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        $$(".tab").forEach(item => item.classList.remove("active"));
        $$(".admin-section").forEach(section => section.classList.remove("active"));

        tab.classList.add("active");
        const section = document.getElementById(tab.dataset.section);
        if (section) section.classList.add("active");

        loadAdminSection(tab.dataset.section);
    });
});

// INSCRIÇÕES
$$("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
        currentApplicationFilter = button.dataset.filter;
        $$("#inscricoes [data-filter]").forEach(item =>
            item.classList.toggle("active", item === button)
        );
        loadApplications();
    });
});

async function loadApplications() {
    const container = $("#applicationsList");
    if (!container) return;

    container.innerHTML = "<p>Carregando inscrições...</p>";

    const { data, error } = await supabaseClient
        .from("inscricoes_rlx")
        .select("*")
        .eq("status", currentApplicationFilter)
        .order("criado_em", { ascending: false });

    if (error) {
        container.innerHTML = '<p class="error-message">Erro ao carregar inscrições. Verifique as políticas RLS.</p>';
        console.error("Erro nas inscrições:", error);
        return;
    }

    if (!data.length) {
        container.innerHTML = "<p>Nenhuma inscrição nesta categoria.</p>";
        return;
    }

    container.innerHTML = data.map(item => `
        <article class="data-card application-card">
            <div class="data-card-header">
                <h4>${escapeHTML(item.nick)}</h4>
                <span class="status ${escapeHTML(item.status.toLowerCase())}">${escapeHTML(item.status)}</span>
            </div>
            <p><strong>ID:</strong> ${escapeHTML(item.jogador_id)}</p>
            <p><strong>Idade:</strong> ${escapeHTML(item.idade)}</p>
            <p><strong>Patente:</strong> ${escapeHTML(item.patente)}</p>
            <p><strong>Função:</strong> ${escapeHTML(item.funcao)}</p>
            <p><strong>WhatsApp:</strong> ${escapeHTML(item.whatsapp)}</p>
            <p><strong>Cidade:</strong> ${escapeHTML(item.cidade)}</p>
            <details>
                <summary>Ver inscrição completa</summary>
                <p><strong>Nível da conta:</strong> ${escapeHTML(item.nivel_conta)}</p>
                <p><strong>Disponibilidade nas guerras:</strong> ${escapeHTML(item.disponibilidade_guerras)}</p>
                <p><strong>Atividade:</strong> ${escapeHTML(item.atividade)}</p>
                <p><strong>Acompanha o grupo:</strong> ${escapeHTML(item.acompanha_grupo)}</p>
                <p><strong>Line organizada:</strong> ${escapeHTML(item.line_organizada)}</p>
                <p><strong>Observações:</strong> ${escapeHTML(item.observacoes || "Nenhuma")}</p>
                <p><strong>Enviada em:</strong> ${formatDate(item.criado_em)}</p>
            </details>
            <div class="card-actions">
                <a class="whatsapp-link" href="https://wa.me/${String(item.whatsapp || "").replace(/\D/g, "")}" target="_blank" rel="noopener">ABRIR WHATSAPP</a>
                ${item.status === "Pendente" ? `
                    <button type="button" data-application-status="Aprovado" data-id="${escapeHTML(item.id)}">APROVAR</button>
                    <button type="button" data-application-status="Reprovado" data-id="${escapeHTML(item.id)}">REPROVAR</button>
                ` : ""}
            </div>
        </article>
    `).join("");
}

$("#applicationsList").addEventListener("click", async event => {
    const button = event.target.closest("[data-application-status]");
    if (!button) return;

    const status = button.dataset.applicationStatus;
    const id = button.dataset.id;
    button.disabled = true;

    const { error } = await supabaseClient
        .from("inscricoes_rlx")
        .update({ status })
        .eq("id", id);

    if (error) {
        alert("Não foi possível atualizar a inscrição.");
        console.error(error);
        button.disabled = false;
        return;
    }

    await loadApplications();
});

// MEMBROS
async function loadMembers() {
    const container = $("#membersList");
    if (!container) return;

    container.innerHTML = "<p>Carregando membros...</p>";

    const { data, error } = await supabaseClient
        .from("membros_rlx")
        .select("id,nome,nick,id_jogo,patente,funcao,ativo")
        .order("nome", { ascending: true });

    if (error) {
        container.innerHTML = '<p class="error-message">Erro ao carregar membros.</p>';
        console.error("Erro nos membros:", error);
        return;
    }

    const members = data || [];
    if (!members.length) {
        container.innerHTML = "<p>Nenhum membro cadastrado ainda.</p>";
        return;
    }

    container.innerHTML = members.map(member => `
        <article class="data-card">
            <div class="data-card-header">
                <h4>${escapeHTML(member.nick)}</h4>
                <span>${member.ativo ? "ATIVO" : "INATIVO"}</span>
            </div>
            <p><strong>Nome:</strong> ${escapeHTML(member.nome)}</p>
            <p><strong>ID:</strong> ${escapeHTML(member.id_jogo)}</p>
            <p><strong>Patente:</strong> ${escapeHTML(member.patente)}</p>
            <p><strong>Função:</strong> ${escapeHTML(member.funcao)}</p>
            <div class="card-actions">
                <button type="button" data-edit-member="${escapeHTML(member.id)}">EDITAR</button>
                <button type="button" data-toggle-member="${escapeHTML(member.id)}" data-active="${member.ativo ? "true" : "false"}">${member.ativo ? "DESATIVAR" : "ATIVAR"}</button>
                <button type="button" data-delete-member="${escapeHTML(member.id)}">EXCLUIR</button>
            </div>
        </article>
    `).join("");
}

$("#memberForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = $("#memberId").value;
    const member = {
        nome: $("#memberName").value.trim(),
        nick: $("#memberNick").value.trim(),
        id_jogo: $("#memberGameId").value.trim() || null,
        patente: $("#memberRank").value,
        funcao: $("#memberFunction").value,
        ativo: true
    };

    const request = id
        ? supabaseClient.from("membros_rlx").update(member).eq("id", id)
        : supabaseClient.from("membros_rlx").insert(member);

    const { error } = await request;

    if (error) {
        alert("Não foi possível salvar o membro. Confira os dados e as permissões.");
        console.error(error);
        return;
    }

    event.target.reset();
    $("#memberId").value = "";
    await loadMembers();
});

$("#membersList").addEventListener("click", async event => {
    const editButton = event.target.closest("[data-edit-member]");
    const toggleButton = event.target.closest("[data-toggle-member]");
    const deleteButton = event.target.closest("[data-delete-member]");

    if (editButton) {
        const { data, error } = await supabaseClient
            .from("membros_rlx")
            .select("id,nome,nick,id_jogo,patente,funcao,ativo")
            .eq("id", editButton.dataset.editMember)
            .single();

        if (error || !data) {
            alert("Não foi possível abrir este membro para edição.");
            return;
        }

        $("#memberId").value = data.id;
        $("#memberName").value = data.nome || "";
        $("#memberNick").value = data.nick || "";
        $("#memberGameId").value = data.id_jogo || "";
        $("#memberRank").value = data.patente || "";
        $("#memberFunction").value = data.funcao || "";
        $("#memberForm").scrollIntoView({ behavior: "smooth" });
    }

    if (toggleButton) {
        const currentlyActive = toggleButton.dataset.active === "true";
        const { error } = await supabaseClient
            .from("membros_rlx")
            .update({ ativo: !currentlyActive })
            .eq("id", toggleButton.dataset.toggleMember);

        if (error) {
            alert("Não foi possível alterar o status do membro.");
            console.error(error);
        } else {
            await loadMembers();
        }
    }

    if (deleteButton) {
        if (!confirm("Tem certeza que deseja excluir este membro?")) return;

        const { error } = await supabaseClient
            .from("membros_rlx")
            .delete()
            .eq("id", deleteButton.dataset.deleteMember);

        if (error) {
            alert("Não foi possível excluir o membro.");
            console.error(error);
        } else {
            await loadMembers();
        }
    }
});


// LINES
async function loadLines() {
    const box = $("#linesList");
    box.innerHTML = "<p>Carregando lines...</p>";
    const { data, error } = await supabaseClient
        .from("lines_rlx")
        .select("id,nome,sigla,capitao_nick,descricao,ativo")
        .order("nome");

    if (error) {
        box.innerHTML = '<p class="error-message">Erro ao carregar lines.</p>';
        console.error(error);
        return;
    }
    if (!data?.length) {
        box.innerHTML = "<p>Nenhuma line cadastrada.</p>";
        return;
    }
    box.innerHTML = data.map(line => `
        <article class="data-card">
            <div class="data-card-header"><h4>${escapeHTML(line.nome)}</h4><span>${line.ativo ? "ATIVA" : "INATIVA"}</span></div>
            <p><strong>Sigla:</strong> ${escapeHTML(line.sigla || "-")}</p>
            <p><strong>Capitão:</strong> ${escapeHTML(line.capitao_nick || "-")}</p>
            <p>${escapeHTML(line.descricao || "")}</p>
            <div class="card-actions">
                <button type="button" data-edit-line="${escapeHTML(line.id)}">EDITAR</button>
                <button type="button" data-delete-line="${escapeHTML(line.id)}">EXCLUIR</button>
            </div>
        </article>`).join("");
}

$("#lineForm").addEventListener("submit", async event => {
    event.preventDefault();
    const id = $("#lineId").value;
    const payload = {
        nome: $("#lineName").value.trim(),
        capitao_nick: $("#lineLeader").value.trim() || null,
        descricao: $("#lineDescription").value.trim() || null,
        ativo: true
    };
    const query = id
        ? supabaseClient.from("lines_rlx").update(payload).eq("id", id)
        : supabaseClient.from("lines_rlx").insert(payload);
    const { error } = await query;
    if (error) {
        alert("Não foi possível salvar a line.");
        console.error(error);
        return;
    }
    event.target.reset();
    $("#lineId").value = "";
    await loadLines();
});

$("#linesList").addEventListener("click", async event => {
    const edit = event.target.closest("[data-edit-line]");
    const del = event.target.closest("[data-delete-line]");
    if (edit) {
        const { data, error } = await supabaseClient.from("lines_rlx")
            .select("id,nome,capitao_nick,descricao").eq("id", edit.dataset.editLine).single();
        if (error) return alert("Não foi possível abrir a line.");
        $("#lineId").value = data.id;
        $("#lineName").value = data.nome || "";
        $("#lineLeader").value = data.capitao_nick || "";
        $("#lineDescription").value = data.descricao || "";
        $("#lineForm").scrollIntoView({ behavior: "smooth" });
    }
    if (del && confirm("Excluir esta line? Os vínculos de membros dessa line também serão removidos.")) {
        const { error } = await supabaseClient.from("lines_rlx").delete().eq("id", del.dataset.deleteLine);
        if (error) alert("Não foi possível excluir a line.");
        else loadLines();
    }
});

// RESULTADOS
async function loadResults() {
    const box = $("#resultsList");
    box.innerHTML = "<p>Carregando resultados...</p>";
    const { data, error } = await supabaseClient.from("resultados_rlx")
        .select("id,nick,data_guerra,nome_guerra,pontos,abates,colocacao,publicado")
        .order("data_guerra", { ascending: false });
    if (error) {
        box.innerHTML = '<p class="error-message">Erro ao carregar resultados.</p>';
        console.error(error);
        return;
    }
    if (!data?.length) {
        box.innerHTML = "<p>Nenhum resultado registrado.</p>";
        return;
    }
    box.innerHTML = data.map(row => `
        <article class="data-card">
            <h4>${escapeHTML(row.nick)}</h4>
            <p><strong>Data:</strong> ${escapeHTML(row.data_guerra)}</p>
            <p><strong>Guerra:</strong> ${escapeHTML(row.nome_guerra || "-")}</p>
            <p><strong>Pontos:</strong> ${escapeHTML(row.pontos)}</p>
            <p><strong>Abates:</strong> ${escapeHTML(row.abates ?? 0)}</p>
            <p><strong>Colocação:</strong> ${escapeHTML(row.colocacao ?? "-")}</p>
            <div class="card-actions"><button type="button" data-delete-result="${escapeHTML(row.id)}">EXCLUIR</button></div>
        </article>`).join("");
}

$("#resultForm").addEventListener("submit", async event => {
    event.preventDefault();
    const payload = {
        nick: $("#resultMember").value.trim(),
        data_guerra: $("#resultDate").value,
        pontos: Number($("#resultPoints").value),
        nome_guerra: $("#resultDescription").value.trim() || null,
        publicado: true
    };
    const { error } = await supabaseClient.from("resultados_rlx").insert(payload);
    if (error) {
        alert("Não foi possível registrar o resultado.");
        console.error(error);
        return;
    }
    event.target.reset();
    await loadResults();
});

$("#resultsList").addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-result]");
    if (!button || !confirm("Excluir este resultado?")) return;
    const { error } = await supabaseClient.from("resultados_rlx").delete().eq("id", button.dataset.deleteResult);
    if (error) alert("Não foi possível excluir o resultado.");
    else loadResults();
});

// CAMPEONATOS
async function loadChampionships() {
    const box = $("#championshipsList");
    box.innerHTML = "<p>Carregando campeonatos...</p>";
    const { data, error } = await supabaseClient.from("campeonatos_rlx")
        .select("id,nome,descricao,colocacao,data_inicio,data_fim,imagem_url,publicado")
        .order("criado_em", { ascending: false });
    if (error) {
        box.innerHTML = '<p class="error-message">Erro ao carregar campeonatos.</p>';
        console.error(error);
        return;
    }
    if (!data?.length) {
        box.innerHTML = "<p>Nenhum campeonato cadastrado.</p>";
        return;
    }
    box.innerHTML = data.map(row => `
        <article class="data-card">
            <h4>${escapeHTML(row.nome)}</h4>
            <p><strong>Colocação:</strong> ${escapeHTML(row.colocacao || "-")}</p>
            <p>${escapeHTML(row.descricao || "")}</p>
            <p><strong>Publicado:</strong> ${row.publicado ? "Sim" : "Não"}</p>
            <div class="card-actions"><button type="button" data-delete-championship="${escapeHTML(row.id)}">EXCLUIR</button></div>
        </article>`).join("");
}

$("#championshipForm").addEventListener("submit", async event => {
    event.preventDefault();
    const payload = {
        nome: $("#championshipName").value.trim(),
        colocacao: $("#championshipPlacement").value.trim() || null,
        descricao: $("#championshipDescription").value.trim() || null,
        publicado: true
    };
    const { error } = await supabaseClient.from("campeonatos_rlx").insert(payload);
    if (error) {
        alert("Não foi possível salvar o campeonato.");
        console.error(error);
        return;
    }
    event.target.reset();
    await loadChampionships();
});

$("#championshipsList").addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-championship]");
    if (!button || !confirm("Excluir este campeonato?")) return;
    const { error } = await supabaseClient.from("campeonatos_rlx").delete().eq("id", button.dataset.deleteChampionship);
    if (error) alert("Não foi possível excluir o campeonato.");
    else loadChampionships();
});

// NOTÍCIAS
async function loadNews() {
    const box = $("#newsList");
    box.innerHTML = "<p>Carregando notícias...</p>";
    const { data, error } = await supabaseClient.from("noticias_rlx")
        .select("id,titulo,conteudo,imagem_url,publicado,criado_em")
        .order("criado_em", { ascending: false });
    if (error) {
        box.innerHTML = '<p class="error-message">Erro ao carregar notícias.</p>';
        console.error(error);
        return;
    }
    if (!data?.length) {
        box.innerHTML = "<p>Nenhuma notícia cadastrada.</p>";
        return;
    }
    box.innerHTML = data.map(row => `
        <article class="data-card">
            <h4>${escapeHTML(row.titulo)}</h4>
            <p>${escapeHTML(row.conteudo || "")}</p>
            <p><strong>Status:</strong> ${row.publicado ? "Publicada" : "Rascunho"}</p>
            <div class="card-actions">
                <button type="button" data-toggle-news="${escapeHTML(row.id)}" data-published="${row.publicado ? "true" : "false"}">${row.publicado ? "TIRAR DO AR" : "PUBLICAR"}</button>
                <button type="button" data-delete-news="${escapeHTML(row.id)}">EXCLUIR</button>
            </div>
        </article>`).join("");
}

$("#newsForm").addEventListener("submit", async event => {
    event.preventDefault();
    const payload = {
        titulo: $("#newsTitle").value.trim(),
        conteudo: $("#newsContent").value.trim(),
        imagem_url: $("#newsImage").value.trim() || null,
        publicado: true
    };
    const { error } = await supabaseClient.from("noticias_rlx").insert(payload);
    if (error) {
        alert("Não foi possível publicar a notícia.");
        console.error(error);
        return;
    }
    event.target.reset();
    await loadNews();
});

$("#newsList").addEventListener("click", async event => {
    const toggle = event.target.closest("[data-toggle-news]");
    const del = event.target.closest("[data-delete-news]");
    if (toggle) {
        const published = toggle.dataset.published === "true";
        const { error } = await supabaseClient.from("noticias_rlx")
            .update({ publicado: !published }).eq("id", toggle.dataset.toggleNews);
        if (error) alert("Não foi possível alterar a publicação.");
        else loadNews();
    }
    if (del && confirm("Excluir esta notícia?")) {
        const { error } = await supabaseClient.from("noticias_rlx").delete().eq("id", del.dataset.deleteNews);
        if (error) alert("Não foi possível excluir a notícia.");
        else loadNews();
    }
});

// ADVERTÊNCIAS
async function loadWarnings() {
    const box = $("#warningsList");
    box.innerHTML = "<p>Carregando advertências...</p>";
    const { data, error } = await supabaseClient.from("advertencias_rlx")
        .select("id,nick,line,motivo,descricao,numero,criado_em")
        .order("criado_em", { ascending: false });
    if (error) {
        box.innerHTML = '<p class="error-message">Erro ao carregar advertências.</p>';
        console.error(error);
        return;
    }
    if (!data?.length) {
        box.innerHTML = "<p>Nenhuma advertência registrada.</p>";
        return;
    }
    box.innerHTML = data.map(row => `
        <article class="data-card">
            <h4>${escapeHTML(row.nick)}</h4>
            <p><strong>Motivo:</strong> ${escapeHTML(row.motivo)}</p>
            <p><strong>Detalhes:</strong> ${escapeHTML(row.descricao || "-")}</p>
            <p><strong>Número:</strong> ${escapeHTML(row.numero ?? "-")}</p>
            <p><strong>Data:</strong> ${formatDate(row.criado_em)}</p>
            <div class="card-actions"><button type="button" data-delete-warning="${escapeHTML(row.id)}">EXCLUIR</button></div>
        </article>`).join("");
}

$("#warningForm").addEventListener("submit", async event => {
    event.preventDefault();
    const payload = {
        nick: $("#warningMember").value.trim(),
        motivo: $("#warningReason").value.trim()
    };
    const { error } = await supabaseClient.from("advertencias_rlx").insert(payload);
    if (error) {
        alert("Não foi possível registrar a advertência.");
        console.error(error);
        return;
    }
    event.target.reset();
    await loadWarnings();
});

$("#warningsList").addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-warning]");
    if (!button || !confirm("Excluir esta advertência?")) return;
    const { error } = await supabaseClient.from("advertencias_rlx").delete().eq("id", button.dataset.deleteWarning);
    if (error) alert("Não foi possível excluir a advertência.");
    else loadWarnings();
});

// ATUALIZAÇÃO DE TODAS AS ABAS
function loadAdminSection(sectionId) {
    if (sectionId === "inscricoes") loadApplications();
    if (sectionId === "membros") loadMembers();
    if (sectionId === "lines") loadLines();
    if (sectionId === "resultados") loadResults();
    if (sectionId === "campeonatos") loadChampionships();
    if (sectionId === "noticias") loadNews();
    if (sectionId === "advertencias") loadWarnings();
}

// CARREGAR SESSÃO AO ABRIR A PÁGINA
async function checkSession() {
    try {
        if (await verifyAdmin()) {
            showAdminPanel();
            await loadApplications();
            await loadMembers();
            await loadLines();
            await loadResults();
            await loadChampionships();
            await loadNews();
            await loadWarnings();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error("Falha ao restaurar sessão:", error);
        showLogin();
    }
}

checkSession();

console.log("ROYAL LUXURY | Painel administrativo conectado ao Supabase.");
