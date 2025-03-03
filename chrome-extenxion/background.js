chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url) {
		console.log(`🔍 Analisando site: ${tab.url}`);

		chrome.storage.local.set({ analysis: "🔄 Analisando o site, aguarde..." });

		fetch("http://localhost:3000/analyze", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ url: tab.url }),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.analysis) {
					chrome.storage.local.set({ analysis: data.analysis }, () => {
						console.log("✅ Resultado salvo:", data.analysis);
					});
				}
			})
			.catch((error) => {
				console.error("❌ Erro na API:", error);
				chrome.storage.local.set({
					analysis: "⚠️ Erro ao processar a análise.",
				});
			});
	}
});
