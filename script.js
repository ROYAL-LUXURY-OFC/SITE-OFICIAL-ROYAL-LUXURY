
// ========================================
// ROYAL LUXURY - SCRIPT PRINCIPAL
// ========================================

// MENU MOBILE
const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

if (menuToggle && navigation) {

    menuToggle.addEventListener("click", () => {
        navigation.classList.toggle("active");

        const aberto = navigation.classList.contains("active");

        menuToggle.textContent = aberto ? "✕" : "☰";
        menuToggle.setAttribute(
            "aria-label",
            aberto ? "Fechar menu" : "Abrir menu"
        );
    });

    // FECHAR MENU AO CLICAR EM UM LINK
    navigation.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {
            navigation.classList.remove("active");
            menuToggle.textContent = "☰";
            menuToggle.setAttribute("aria-label", "Abrir menu");
        });

    });

}

// ANO AUTOMÁTICO NO CONSOLE
console.log("ROYAL LUXURY | Site oficial carregado.");
console.log("RESPECT. ELEGANCE. DOMINANCE.");
