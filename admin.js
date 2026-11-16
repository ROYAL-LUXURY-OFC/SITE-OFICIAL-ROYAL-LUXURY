
// ==========================================
// ROYAL LUXURY - PAINEL ADMINISTRATIVO
// ==========================================

// CONFIGURAÇÃO SUPABASE
// Substitua pelos dados do seu projeto RLX.

const SUPABASE_URL = "COLOQUE_A_URL_DO_PROJETO";
const SUPABASE_ANON_KEY = "COLOQUE_A_CHAVE_ANON_PUBLIC";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// ELEMENTOS
const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

// MOSTRAR MENSAGEM
function showMessage(message, error = false) {
    loginMessage.textContent = message;
    loginMessage.style.color = error ? "#ff7777" : "#c9a44c";
}

// ABRIR PAINEL
function showAdminPanel() {
    loginScreen.hidden = true;
    adminPanel.hidden = false;
}

// MOSTRAR LOGIN
function showLogin() {
    adminPanel.hidden = true;
    loginScreen.hidden = false;
}

// LOGIN
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    showMessage("Verificando acesso...");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showMessage("E-mail ou senha incorretos.", true);
        return;
    }

    // A política do banco também verifica se a conta é administradora.
    // Não basta estar autenticado para ter acesso aos dados.
    const { error: accessError } = await supabaseClient
        .from("admins_rlx")
        .select("*")
        .limit(1);

    if (accessError) {
        await supabaseClient.auth.signOut();
        showMessage("Sua conta não possui acesso administrativo.", true);
        return;
    }

    showAdminPanel();
});

// RECUPERAÇÃO DE SENHA
document.getElementById("forgotPassword").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();

    if (!email) {
        showMessage("Digite seu e-mail antes de solicitar a recuperação.", true);
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
    });

    if (error) {
        showMessage("Não foi possível enviar o e-mail de recuperação.", true);
        return;
    }

    showMessage("Se o e-mail estiver cadastrado, você receberá as instruções.");
});

// SAIR
document.getElementById("logoutButton").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showLogin();
});

// NAVEGAÇÃO DAS ABAS
const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".admin-section");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        const sectionId = tab.dataset.section;

        tabs.forEach(item => item.classList.remove("active"));
        sections.forEach(section => section.classList.remove("active"));

        tab.classList.add("active");

        const selectedSection = document.getElementById(sectionId);

        if (selectedSection) {
            selectedSection.classList.add("active");
        }
    });
});

// VERIFICAR SESSÃO EXISTENTE
async function checkSession() {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        const { error } = await supabaseClient
            .from("admins_rlx")
            .select("*")
            .limit(1);

        if (!error) {
            showAdminPanel();
            return;
        }

        await supabaseClient.auth.signOut();
    }

    showLogin();
}

checkSession();

console.log("ROYAL LUXURY | Painel administrativo carregado.");
