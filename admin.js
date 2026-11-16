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

// BOTÃO SAIR: registrado no início para continuar funcionando mesmo se outra rotina do painel falhar.
const logoutButton = $("#logoutButton");
if (logoutButton) {
    logoutButton.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        logoutButton.disabled = true;
        logoutButton.textContent = "SAINDO...";
        try {
            const { error } = await supabaseClient.auth.signOut({ scope: "global" });
            if (error) throw error;
            window.location.href = "login.html?signedout=1";
        } catch (error) {
            console.error("Erro ao encerrar sessão:", error);
            alert("Não foi possível encerrar a sessão. Confira a conexão e tente novamente.");
            logoutButton.disabled = false;
            logoutButton.textContent = "SAIR";
        }
    });
}

let currentApplicationFilter = "Pendente";

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
    const { data: userData, error: userError } = await withTimeout(
        supabaseClient.auth.getUser(),
        10000
    );

    if (userError) throw userError;
    const user = userData?.user;
    if (!user) return false;

    // Consulta somente o registro do próprio usuário. A tabela admins_rlx
    // deve permitir que cada administrador leia a própria linha.
    const { data, error } = await withTimeout(
        supabaseClient
            .from("admins_rlx")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle(),
        10000
    );

    if (error) throw error;

    if (!data) {
        await supabaseClient.auth.signOut();
        return false;
    }

    return true;
}

// DASHBOARD
async function loadDashboard() {
    const statsBox = $("#dashboardStats");
    const resultsBox = $("#dashboardResults");
    const applicationsBox = $("#dashboardApplications");
    if (!statsBox || !resultsBox || !applicationsBox) return;

    statsBox.querySelectorAll(".stat-card strong").forEach(value => value.textContent = "…");
    const countQueries = [
        supabaseClient.from("membros_rlx").select("id", { count: "exact", head: true }).eq("ativo", true),
        supabaseClient.from("inscricoes_rlx").select("id", { count: "exact", head: true }).eq("status", "Pendente"),
        supabaseClient.from("lines_rlx").select("id", { count: "exact", head: true }).eq("ativo", true),
        supabaseClient.from("resultados_rlx").select("id", { count: "exact", head: true }).eq("publicado", true),
        supabaseClient.from("campeonatos_rlx").select("id", { count: "exact", head: true }).eq("publicado", true),
        supabaseClient.from("advertencias_rlx").select("id", { count: "exact", head: true })
    ];

    const [members, applications, lines, results, championships, warnings, recentResults, recentApplications] = await Promise.all([
        ...countQueries,
        supabaseClient.from("resultados_rlx").select("nick,data_guerra,pontos,nome_guerra").eq("publicado", true).order("data_guerra", { ascending: false }).limit(4),
        supabaseClient.from("inscricoes_rlx").select("nick,status,criado_em").order("criado_em", { ascending: false }).limit(4)
    ]);

    const values = [members, applications, lines, results, championships, warnings];
    const labels = ["Membros ativos", "Inscrições aguardando análise", "Lines ativas", "Resultados publicados", "Campeonatos publicados", "Registros totais"];
    statsBox.innerHTML = values.map((item, index) => {
        const failed = Boolean(item.error);
        if (failed) console.error("Erro ao carregar indicador do dashboard:", item.error);
        return `
            <article class="stat-card">
                <span>${labels[index].toUpperCase()}</span>
                <strong>${failed ? "—" : Number(item.count ?? 0).toLocaleString("pt-BR")}</strong>
                <small>${failed ? "Não foi possível carregar" : (index === 1 && item.count > 0 ? "Precisam de avaliação" : "Dados atualizados")}</small>
            </article>`;
    }).join("");

    if (recentResults.error) {
        resultsBox.innerHTML = '<p class="dashboard-error">Não foi possível carregar os resultados.</p>';
    } else if (!recentResults.data?.length) {
        resultsBox.innerHTML = "<p>Nenhum resultado publicado ainda.</p>";
    } else {
        resultsBox.innerHTML = recentResults.data.map(row => `
            <article class="dashboard-feed-item">
                <strong>${escapeHTML(row.nick || "Jogador")} • ${escapeHTML(row.pontos ?? 0)} pontos</strong>
                <span>${escapeHTML(row.nome_guerra || "Guerra") } · ${escapeHTML(row.data_guerra || "Data não informada")}</span>
            </article>`).join("");
    }

    if (recentApplications.error) {
        applicationsBox.innerHTML = '<p class="dashboard-error">Não foi possível carregar as inscrições.</p>';
    } else if (!recentApplications.data?.length) {
        applicationsBox.innerHTML = "<p>Nenhuma inscrição recebida ainda.</p>";
    } else {
        applicationsBox.innerHTML = recentApplications.data.map(row => `
            <article class="dashboard-feed-item">
                <strong>${escapeHTML(row.nick || "Candidato")}</strong>
                <span>${escapeHTML(row.status || "Sem status")} · ${formatDate(row.criado_em)}</span>
            </article>`).join("");
    }
}

$("#refreshDashboard")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "ATUALIZANDO...";
    try {
        await loadDashboard();
    } finally {
        button.disabled = false;
        button.textContent = "ATUALIZAR DADOS";
    }
});

document.querySelectorAll("[data-go-section]").forEach(button => {
    button.addEventListener("click", () => {
        const target = button.dataset.goSection;
        const tab = document.querySelector(`.tab[data-section="${target}"]`);
        if (tab) tab.click();
    });
});

// NAVEGAÇÃO DAS ABAS
document.querySelectorAll(".tab").forEach(tab => {
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
                <h4>${escapeHTML(item.nome_real || item.nick)}</h4>
                <p><strong>Nick no jogo:</strong> ${escapeHTML(item.nick)}</p>
                <span class="status ${escapeHTML(item.status.toLowerCase())}">${escapeHTML(item.status)}</span>
            </div>
            <p><strong>Nome real:</strong> ${escapeHTML(item.nome_real || "Não informado")}</p>
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
                <a class="whatsapp-link" href="https://wa.me/${String(item.whatsapp || "").replace(/\D/g, "")}" target="_blank" rel="noopener">CONVERSAR NO WHATSAPP</a>
                ${item.status === "Pendente" ? `
                    <button type="button" class="action-approve" data-application-status="Aprovado" data-id="${escapeHTML(item.id)}">APROVAR</button>
                    <button type="button" class="action-reject" data-application-status="Reprovado" data-id="${escapeHTML(item.id)}">REPROVAR</button>
                ` : ""}
                <button type="button" class="action-register" data-register-application="${escapeHTML(item.id)}">CADASTRAR NO SITE</button>
            </div>
        </article>
    `).join("");
}

$("#applicationsList").addEventListener("click", async event => {
    const statusButton = event.target.closest("[data-application-status]");
    const registerButton = event.target.closest("[data-register-application]");

    if (statusButton) {
        const status = statusButton.dataset.applicationStatus;
        const id = statusButton.dataset.id;
        statusButton.disabled = true;

        const { error } = await supabaseClient
            .from("inscricoes_rlx")
            .update({ status })
            .eq("id", id);

        if (error) {
            alert("Não foi possível atualizar a inscrição.");
            console.error(error);
            statusButton.disabled = false;
            return;
        }

        await loadApplications();
        return;
    }

    if (registerButton) {
        const id = registerButton.dataset.registerApplication;
        registerButton.disabled = true;
        registerButton.textContent = "CADASTRANDO...";

        try {
            const { data: application, error: applicationError } = await supabaseClient
                .from("inscricoes_rlx")
                .select("id,nome_real,nick,jogador_id,patente,funcao,status")
                .eq("id", id)
                .single();

            if (applicationError) throw applicationError;

            const { data: existingMember, error: memberCheckError } = await supabaseClient
                .from("membros_rlx")
                .select("id")
                .eq("id_jogo", application.jogador_id)
                .maybeSingle();

            if (memberCheckError) throw memberCheckError;

            if (existingMember) {
                alert("Este jogador já está cadastrado na lista de membros do site.");
                registerButton.disabled = false;
                registerButton.textContent = "CADASTRAR NO SITE";
                return;
            }

            const { error: insertError } = await supabaseClient
                .from("membros_rlx")
                .insert({
                    nome: application.nome_real || application.nick,
                    nick: application.nick,
                    id_jogo: application.jogador_id,
                    patente: application.patente,
                    funcao: application.funcao,
                    ativo: true
                });

            if (insertError) throw insertError;

            if (application.status !== "Aprovado") {
                const { error: statusError } = await supabaseClient
                    .from("inscricoes_rlx")
                    .update({ status: "Aprovado" })
                    .eq("id", id);

                if (statusError) {
                    console.error("Membro cadastrado, mas não foi possível atualizar o status da inscrição:", statusError);
                    alert("Jogador cadastrado no site, mas não foi possível atualizar o status da inscrição.");
                    await loadApplications();
                    return;
                }
            }

            alert("Jogador cadastrado no site e inscrição marcada como aprovada!");
            await loadApplications();
        } catch (error) {
            console.error("Erro ao cadastrar jogador no site:", error);
            alert("Não foi possível cadastrar. Confira as permissões e os campos da tabela membros_rlx.");
            registerButton.disabled = false;
            registerButton.textContent = "CADASTRAR NO SITE";
        }
    }
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


// LIMPEZA DE INSCRIÇÕES: mantém quem já está cadastrado como membro no site.
function normalizeMemberKey(value) {
    return String(value ?? "").trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

$("#cleanupNonMembers")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "VERIFICANDO INSCRIÇÕES...";

    try {
        const [{ data: applications, error: applicationsError }, { data: members, error: membersError }] = await Promise.all([
            supabaseClient.from("inscricoes_rlx").select("id,nick,jogador_id,status"),
            supabaseClient.from("membros_rlx").select("id_jogo,nick")
        ]);

        if (applicationsError) throw applicationsError;
        if (membersError) throw membersError;

        const registeredIds = new Set(
            (members || []).map(member => normalizeMemberKey(member.id_jogo)).filter(Boolean)
        );
        const registeredNicks = new Set(
            (members || []).map(member => normalizeMemberKey(member.nick)).filter(Boolean)
        );

        const notOnSite = (applications || []).filter(application => {
            const gameId = normalizeMemberKey(application.jogador_id);
            const nick = normalizeMemberKey(application.nick);
            const existsById = gameId && registeredIds.has(gameId);
            const existsByNick = nick && registeredNicks.has(nick);
            return !existsById && !existsByNick;
        });

        if (!notOnSite.length) {
            alert("Nenhuma inscrição de jogador fora do site foi encontrada. As inscrições atuais correspondem a membros cadastrados.");
            return;
        }

        const counts = notOnSite.reduce((total, item) => {
            const status = item.status || "Sem status";
            total[status] = (total[status] || 0) + 1;
            return total;
        }, {});
        const breakdown = ["Pendente", "Aprovado", "Reprovado"]
            .filter(status => counts[status])
            .map(status => counts[status] + " " + status.toLowerCase() + (counts[status] === 1 ? "" : "s"))
            .join(", ");

        const confirmation = confirm(
            "Serão excluídas permanentemente " + notOnSite.length +
            (notOnSite.length === 1 ? " inscrição" : " inscrições") +
            " de jogadores que não estão cadastrados no site.\n\n" +
            (breakdown || "Inclui todas as categorias") +
            "\n\nAs inscrições de jogadores cadastrados como membros serão mantidas. Essa ação não pode ser desfeita.\n\nContinuar?"
        );
        if (!confirmation) return;

        const ids = notOnSite.map(item => item.id);
        const { error: deleteError } = await supabaseClient
            .from("inscricoes_rlx")
            .delete()
            .in("id", ids);

        if (deleteError) throw deleteError;

        alert(notOnSite.length + (notOnSite.length === 1
            ? " inscrição foi removida."
            : " inscrições foram removidas.") + "\n\nAs inscrições de membros cadastrados foram preservadas.");

        await Promise.all([loadApplications(), loadDashboard()]);
    } catch (error) {
        console.error("Erro ao limpar inscrições de jogadores não cadastrados:", error);
        alert(error.message || "Não foi possível limpar as inscrições. Verifique as permissões da tabela inscricoes_rlx.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});

// ADMINISTRADORES E HIERARQUIA
async function loadAdminsPanel() {
    const identity = $("#adminIdentity");
    const list = $("#adminsList");
    if (!identity || !list) return;

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
        identity.innerHTML = '<p class="error-message">Não foi possível identificar a conta conectada.</p>';
        return;
    }

    const user = userData.user;
    const { data: ownRole, error: ownError } = await supabaseClient
        .from("admins_rlx").select("cargo,nick").eq("user_id", user.id).maybeSingle();

    if (ownError) {
        identity.innerHTML = '<p class="error-message">Não foi possível consultar seu cargo. Execute a migration SQL da hierarquia no Supabase.</p>';
        list.innerHTML = "";
        console.error(ownError);
        return;
    }

    const role = ownRole?.cargo || "Administrador";
    identity.innerHTML = `
        <span class="admin-kicker">CONTA CONECTADA</span>
        <h4>${escapeHTML(ownRole?.nick || user.email || "Administrador")}</h4>
        <p><strong>E-mail:</strong> ${escapeHTML(user.email || "Não disponível")}</p>
        <p><strong>Cargo:</strong> ${escapeHTML(role)}</p>
        <span class="admin-active-status">● ACESSO AUTENTICADO</span>
    `;

    const canManage = ["Líder", "Líder interino"].includes(role);
    const form = $("#adminManagerForm");
    if (form) form.style.display = canManage ? "grid" : "none";

    const { data, error } = await supabaseClient.rpc("listar_admins_rlx");
    if (error) {
        list.innerHTML = '<p class="error-message">Não foi possível listar a hierarquia. Execute supabase/hierarquia-admins-rlx.sql no SQL Editor do Supabase.</p>';
        console.error(error);
        return;
    }

    if (!data?.length) {
        list.innerHTML = "<p>Nenhum administrador cadastrado.</p>";
        return;
    }

    list.innerHTML = data.map(admin => {
        const protectedRole = role === "Líder interino" && ["Líder", "Líder interino"].includes(admin.cargo);
        const isLeader = admin.cargo === "Líder";
        return `
            <article class="data-card">
                <div class="data-card-header">
                    <h4>${escapeHTML(admin.nick || admin.email)}</h4>
                    <span>${escapeHTML(admin.cargo)}</span>
                </div>
                <p><strong>E-mail:</strong> ${escapeHTML(admin.email)}</p>
                <div class="card-actions">
                    ${canManage && !protectedRole && !isLeader ? `<button type="button" data-remove-admin="${escapeHTML(admin.email)}">REMOVER ACESSO</button>` : ""}
                    ${canManage && !protectedRole && !isLeader ? `<button type="button" data-edit-admin-email="${escapeHTML(admin.email)}" data-edit-admin-nick="${escapeHTML(admin.nick || "")}" data-edit-admin-role="${escapeHTML(admin.cargo)}">EDITAR CARGO</button>` : ""}
                </div>
            </article>`;
    }).join("");
}

$("#adminManagerForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const email = $("#managedAdminEmail").value.trim();
    const nick = $("#managedAdminNick").value.trim();
    const cargo = $("#managedAdminRole").value;
    const submit = event.submitter || event.target.querySelector("button[type='submit']");
    if (submit) { submit.disabled = true; submit.textContent = "SALVANDO..."; }

    const { data, error } = await supabaseClient.rpc("gerenciar_admin_rlx", {
        p_email: email, p_nick: nick, p_cargo: cargo, p_acao: "salvar"
    });

    if (submit) { submit.disabled = false; submit.textContent = "ADICIONAR / ATUALIZAR CARGO"; }
    if (error) {
        alert(error.message || "Não foi possível atualizar o administrador.");
        console.error(error);
        return;
    }
    alert(data || "Cargo atualizado.");
    event.target.reset();
    await loadAdminsPanel();
});

$("#adminsList")?.addEventListener("click", async event => {
    const edit = event.target.closest("[data-edit-admin-email]");
    const remove = event.target.closest("[data-remove-admin]");

    if (edit) {
        $("#managedAdminEmail").value = edit.dataset.editAdminEmail;
        $("#managedAdminNick").value = edit.dataset.editAdminNick;
        $("#managedAdminRole").value = edit.dataset.editAdminRole;
        $("#adminManagerForm").scrollIntoView({ behavior: "smooth" });
        return;
    }

    if (remove) {
        const email = remove.dataset.removeAdmin;
        if (!confirm("Remover o acesso administrativo de " + email + "?")) return;
        remove.disabled = true;
        const { data, error } = await supabaseClient.rpc("gerenciar_admin_rlx", {
            p_email: email, p_nick: null, p_cargo: null, p_acao: "remover"
        });
        if (error) {
            alert(error.message || "Não foi possível remover o acesso.");
            console.error(error);
            remove.disabled = false;
            return;
        }
        alert(data || "Acesso removido.");
        await loadAdminsPanel();
    }
});

// ATUALIZAÇÃO DE TODAS AS ABAS
function loadAdminSection(sectionId) {
    if (sectionId === "dashboard") loadDashboard();
    if (sectionId === "inscricoes") loadApplications();
    if (sectionId === "membros") loadMembers();
    if (sectionId === "lines") loadLines();
    if (sectionId === "resultados") loadResults();
    if (sectionId === "campeonatos") loadChampionships();
    if (sectionId === "noticias") loadNews();
    if (sectionId === "advertencias") loadWarnings();
    if (sectionId === "admins") loadAdminsPanel();
}

console.log("ROYAL LUXURY | Painel administrativo conectado ao Supabase.");

async function checkSession() {
    try {
        if (!(await verifyAdmin())) {
            window.location.replace("login.html");
            return;
        }
        await loadDashboard();
        await loadApplications();
        await loadMembers();
        await loadLines();
        await loadResults();
        await loadChampionships();
        await loadNews();
        await loadWarnings();
        await loadAdminsPanel();
    } catch (error) {
        console.error("Falha ao validar acesso ao painel:", error);
        window.location.replace("login.html");
    }
}
checkSession();
console.log("ROYAL LUXURY | Painel administrativo protegido e conectado ao Supabase.");
