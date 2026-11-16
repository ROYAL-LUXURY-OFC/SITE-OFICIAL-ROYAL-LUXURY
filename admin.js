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

async function verifyAdmin() {
    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) return false;

    // A função SECURITY DEFINER verifica auth.uid() na tabela admins_rlx.
    const { data, error } = await supabaseClient.rpc("is_admin_rlx");

    if (error || data !== true) {
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

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showMessage("Não foi possível entrar. Confira o e-mail e a senha.", true);
        return;
    }

    if (!(await verifyAdmin())) {
        showMessage("Esta conta não possui permissão de administrador.", true);
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

        if (tab.dataset.section === "inscricoes") loadApplications();
        if (tab.dataset.section === "membros") loadMembers();
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

// CARREGAR SESSÃO AO ABRIR A PÁGINA
async function checkSession() {
    if (await verifyAdmin()) {
        showAdminPanel();
        await loadApplications();
        await loadMembers();
    } else {
        showLogin();
    }
}

checkSession();

console.log("ROYAL LUXURY | Painel administrativo conectado ao Supabase.");
