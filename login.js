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

function withTimeout(promise, milliseconds, label) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(label)), milliseconds);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function verifyAdmin(user) {
    if (!user) return false;

    const { data, error } = await withTimeout(
        supabaseClient
            .from("admins_rlx")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle(),
        12000,
        "A consulta de admins_rlx demorou mais de 12 segundos."
    );

    if (error) throw error;
    return Boolean(data);
}

// Não redireciona automaticamente com uma sessão antiga.
// O acesso ao painel só acontece após um login explícito pelo formulário.
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("#email").value.trim();
    const password = $("#password").value;
    const submit = loginForm.querySelector('button[type="submit"]');

    submit.disabled = true;
    showMessage("Autenticando no Supabase...");

    try {
        const { data, error } = await withTimeout(
            supabaseClient.auth.signInWithPassword({ email, password }),
            15000,
            "A autenticação no Supabase demorou mais de 15 segundos. Verifique a conexão e o serviço de Auth."
        );

        if (error) {
            showMessage(error.message || "Não foi possível entrar. Confira o e-mail e a senha.", true);
            return;
        }

        if (!data?.user) {
            showMessage("O Supabase não retornou os dados da conta após o login.", true);
            return;
        }

        showMessage("Login realizado. Conferindo o cargo administrativo...");

        let isAdmin;
        try {
            isAdmin = await verifyAdmin(data.user);
        } catch (verificationError) {
            console.error("Falha ao consultar admins_rlx:", verificationError);
            showMessage(
                "Login realizado, mas não foi possível consultar admins_rlx: " +
                (verificationError?.message || String(verificationError)),
                true
            );
            return;
        }

        if (!isAdmin) {
            await supabaseClient.auth.signOut();
            showMessage("A conta entrou, mas não foi encontrada em admins_rlx. Confira o cadastro administrativo.", true);
            return;
        }

        showMessage("Acesso autorizado. Abrindo painel...");
        window.location.replace("admin.html");
    } catch (error) {
        console.error("Falha na autenticação:", error);
        showMessage(error?.message || "Falha inesperada durante o login.", true);
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
        const { error } = await withTimeout(
            supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href }),
            15000,
            "A solicitação de recuperação demorou mais de 15 segundos."
        );
        if (error) throw error;
        showMessage("Se o e-mail estiver cadastrado, você receberá as instruções.");
    } catch (error) {
        console.error("Falha na recuperação:", error);
        showMessage(error?.message || "Não foi possível solicitar a recuperação agora.", true);
    }
});
