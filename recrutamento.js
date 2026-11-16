const RLX_URL = "https://ekzgqudjhmgqedvqgfdk.supabase.co";
const RLX_PUBLIC_KEY = "sb_publishable_bb0Tw3G9jG4e61UdmKu49g_kFnYdKfF";
const rlxClient = window.supabase.createClient(RLX_URL, RLX_PUBLIC_KEY);

const form = document.getElementById("recruitmentForm");
const message = document.getElementById("recruitmentMessage");
const submitButton = document.getElementById("submitRecruitment");
const nextButton = document.getElementById("nextStep");
const previousButton = document.getElementById("previousStep");
const progressFill = document.getElementById("progressFill");
const errorBox = document.getElementById("wizardError");
const panels = [...document.querySelectorAll(".form-panel")];
const indicators = [...document.querySelectorAll("[data-step-indicator]")];
let currentStep = 0;

function showStep(step) {
    currentStep = step;
    panels.forEach((panel, index) => panel.classList.toggle("active", index === step));
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle("active", index === step);
        indicator.classList.toggle("completed", index < step);
    });
    progressFill.style.width = `${(step / (panels.length - 1)) * 100}%`;
    previousButton.hidden = step === 0;
    nextButton.hidden = step === panels.length - 1;
    submitButton.hidden = step !== panels.length - 1;
    errorBox.textContent = "";
    message.textContent = "";
    if (step === panels.length - 1) buildReview();
    window.scrollTo({ top: document.querySelector(".recruit-form").offsetTop - 20, behavior: "smooth" });
}

function validateStep() {
    const fields = [...panels[currentStep].querySelectorAll("input, select, textarea")];
    for (const field of fields) {
        if (field.type === "checkbox" && !field.checked) {
            field.focus();
            errorBox.textContent = "Confirme que as informações são verdadeiras para continuar.";
            return false;
        }
        if (field.required && !field.checkValidity()) {
            field.reportValidity();
            errorBox.textContent = "Confira os campos obrigatórios desta etapa.";
            return false;
        }
    }

    if (currentStep === 0) {
        const age = Number(form.elements.idade.value);
        const level = Number(form.elements.nivel_conta.value);
        const phone = form.elements.whatsapp.value.replace(/\D/g, "");
        if (age < 14) {
            errorBox.textContent = "A idade mínima para se inscrever é 14 anos.";
            form.elements.idade.focus();
            return false;
        }
        if (level < 50) {
            errorBox.textContent = "Sua conta precisa ter, no mínimo, nível 50.";
            form.elements.nivel_conta.focus();
            return false;
        }
        if (phone.length < 10 || phone.length > 15) {
            errorBox.textContent = "Informe um WhatsApp válido com DDD.";
            form.elements.whatsapp.focus();
            return false;
        }
    }

    if (currentStep === 1) {
        const rank = form.elements.patente.value;
        const eligibleRanks = ["Diamante III", "Diamante IV", "Mestre", "Elite", "Desafiante"];
        if (!eligibleRanks.includes(rank)) {
            errorBox.textContent = "A patente mínima exigida é Diamante III.";
            form.elements.patente.focus();
            return false;
        }
    }
    return true;
}

function buildReview() {
    const labels = [
        ["Nick", "nick"], ["ID", "jogador_id"], ["Idade", "idade"],
        ["Nível", "nivel_conta"], ["WhatsApp", "whatsapp"], ["Cidade", "cidade"],
        ["Patente", "patente"], ["Função", "funcao"],
        ["Line organizada", "line_organizada"], ["Guerras", "disponibilidade_guerras"],
        ["Atividade", "atividade"], ["Grupo oficial", "acompanha_grupo"]
    ];
    const valueFor = name => {
        const value = form.elements[name].value;
        if (value === "true") return "Sim";
        if (value === "false") return "Não";
        return value || "Não informado";
    };
    document.getElementById("applicationReview").innerHTML = labels.map(([label, name]) =>
        `<div class="review-item"><span>${label}</span><strong>${escapeHTML(valueFor(name))}</strong></div>`
    ).join("");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

nextButton.addEventListener("click", () => {
    if (!validateStep()) return;
    showStep(Math.min(currentStep + 1, panels.length - 1));
});

previousButton.addEventListener("click", () => showStep(Math.max(currentStep - 1, 0)));

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (currentStep !== panels.length - 1 || !validateStep()) return;

    submitButton.disabled = true;
    submitButton.textContent = "ENVIANDO...";
    nextButton.disabled = true;
    previousButton.disabled = true;
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

    try {
        const { error } = await rlxClient.from("inscricoes_rlx").insert(application);
        if (error) throw error;

        form.reset();
        message.className = "success-message";
        message.textContent = "Inscrição enviada! A administração da RLX fará a análise. Obrigado por querer fazer parte da organização.";
        document.querySelector(".wizard-progress").hidden = true;
        panels.forEach(panel => panel.classList.remove("active"));
        document.querySelector(".wizard-actions").hidden = true;
        errorBox.textContent = "";
    } catch (error) {
        console.error("Erro ao enviar inscrição RLX:", error);
        message.className = "error-message";
        message.textContent = "Não foi possível enviar agora. Confira sua conexão e tente novamente.";
        submitButton.disabled = false;
        submitButton.innerHTML = 'ENVIAR INSCRIÇÃO <span>↗</span>';
        nextButton.disabled = false;
        previousButton.disabled = false;
    }
});

showStep(0);