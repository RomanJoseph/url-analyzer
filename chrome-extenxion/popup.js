document.addEventListener("DOMContentLoaded", () => {
	const resultElement = document.getElementById("result");

	resultElement.innerHTML =
		"<p class='loading'>Aguarde, analisando o site...</p>";

	chrome.storage.local.get("analysis", (data) => {
		if (data.analysis) {
			const formattedText = data.analysis
				.split("\n")
				.map((paragraph) => paragraph.trim())
				.filter((paragraph) => paragraph.length > 0)
				.map((paragraph) => `<p>${paragraph}</p>`)
				.join("");

			resultElement.innerHTML = formattedText;
		} else {
			resultElement.innerHTML = "<p>Nenhuma análise disponível ainda.</p>";
		}
	});
});
