const RLX_URL = "https://ekzgqudjhmgqedvqgfdk.supabase.co";
const RLX_PUBLIC_KEY = "sb_publishable_bb0Tw3G9jG4e61UdmKu49g_kFnYdKfF";
const rlxClient = window.supabase.createClient(RLX_URL, RLX_PUBLIC_KEY);

const form = document.getElementById("recruitmentForm");
const message = document.getElementById("recruitmentMessage");
const submitButton = document.getElementById("submitRecruitment");

form.addEventListener("submit", async event => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = "ENVIANDO...";
    message.textContent = "Enviando sua inscrição...";

    const values = Object.fromEntries(new FormData(form).entries());
    const application = {
        nick: values.nick.trim(),
        jogador_id: values.jogador_id.trim(),
        idade: Number(values.idade),
        nivel_conta: Number(values.nivel_conta),
        patente: values.patente,
        funcao: values.funcao,
        whatsapp: values.whatsapp.replace(/\s+/g, ""),
        cidade: values.cidade.trim(),
        disponibilidade_guerras: values.disponibilidade_guerras,
        atividade: values.atividade,
        acompanha_grupo: values.acompanha_grupo === "true",
        line_organizada: values.line_organizada === "true",
        observacoes: values.observacoes.trim() || null,
        status: "Pendente"
    };

    const { error } = await rlxClient.from("inscricoes_rlx").insert(application);

    if (error) {
        console.error("Erro ao enviar inscrição RLX:", error);
        message.textContent = "Não foi possível enviar. Confira os campos e tente novamente.";
        message.style.color = "#ff8b8b";
        submitButton.disabled = false;
        submitButton.textContent = "ENVIAR INSCRIÇÃO";
        return;
    }

    form.reset();
    message.style.color = "#c9a44c";
    message.textContent = "Inscrição enviada! A administração da RLX fará a análise.";
    submitButton.disabled = false;
    submitButton.textContent = "ENVIAR INSCRIÇÃO";
});