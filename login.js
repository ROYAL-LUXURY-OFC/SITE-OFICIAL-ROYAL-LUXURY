const SUPABASE_URL = "https://ekzgqudjhmgqedvqgfdk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bb0Tw3G9jG4e61UdmKu49g_kFnYdKfF";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (selector) => document.querySelector(selector);
const loginForm = $("#loginForm");
const loginMessage = $("#loginMessage");

function showMessage(message, error = false) {
    loginMessage.textContent = message;
    loginMessage.style.color = error ? "#ff7777" : "#c9a44c";
}
function withTimeout(promise, milliseconds = 12000) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Tempo limite excedido.")), milliseconds);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}
async function verifyAdmin() {
    const { data: userData, error: userError } = await withTimeout(supabaseClient.auth.getUser(), 10000);
    if (userError) throw userError;
    const user = userData?.user;
    if (!user) return false;
    const { data, error } = await withTimeout(
        supabaseClient.from("admins_rlx").select("user_id").eq("user_id", user.id).maybeSingle(),
        10000
    );
    if (error) throw error;
    return Boolean(data);
}

(async () => {
    try {
        if (await verifyAdmin()) window.location.replace("admin.html");
    } catch (error) {
        console.error("Não foi possível restaurar a sessão:", error);
    }
})();

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    showMessage("Verificando acesso...");
    try {
        const { error } = await withTimeout(supabaseClient.auth.signInWithPassword({ email, password }), 15000);
        if (error) {
            showMessage("Não foi possível entrar. Confira o e-mail e a senha.", true);
            return;
        }
        if (!(await verifyAdmin())) {
            await supabaseClient.auth.signOut();
            showMessage("Esta conta não possui permissão de administrador.", true);
            return;
        }
        showMessage("Acesso autorizado. Abrindo painel...");
        window.location.replace("admin.html");
    } catch (error) {
        console.error("Falha no login:", error);
        showMessage("A verificação falhou ou demorou demais. Tente novamente.", true);
    } finally {
        submit.disabled = false;
    }
});

$("#forgotPassword").addEventListener("click", async () => {
    const email = $("#email").value.trim();
    if (!email) {
        showMessage("Digite seu e-mail antes de solicitar a recuperação.", true);
        return;
    }
    try {
        const { error } = await withTimeout(supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href }), 15000);
        if (error) throw error;
        showMessage("Se o e-mail estiver cadastrado, você receberá as instruções.");
    } catch (error) {
        console.error("Falha na recuperação:", error);
        showMessage("Não foi possível solicitar a recuperação agora.", true);
    }
});
