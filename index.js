import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import { OpenAI } from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(cors());

let browser;

async function initBrowser() {
	if (!browser) {
		browser = await puppeteer.launch({
			headless: "new",
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	}
}
initBrowser();

async function extractWebsiteInfo(url) {
	const page = await browser.newPage();
	await page.setRequestInterception(true);

	page.on("request", (req) => {
		if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
			req.abort();
		} else {
			req.continue();
		}
	});

	try {
		await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

		const [title, metaDescription, pageText] = await Promise.all([
			page.title(),
			page
				.$eval('meta[name="description"]', (el) => el.content)
				.catch(() => "Sem descrição"),
			page.evaluate(() =>
				Array.from(document.querySelectorAll("p, h1, h2, h3"))
					.map((el) => el.innerText.trim())
					.filter((text) => text.length > 30)
					.join("\n")
					.substring(0, 800)
			),
		]);

		await page.close();
		return { title, metaDescription, pageText };
	} catch (error) {
		console.error("Erro ao acessar o site:", error.message);
		await page.close();
		return null;
	}
}

async function analyzeWebsite(url) {
	const siteData = await extractWebsiteInfo(url);
	if (!siteData) return null;

	const prompt = `
    Aqui estão informações sobre uma empresa extraídas de seu site:

    - Título: ${siteData.title}
    - Descrição: ${siteData.metaDescription}
    - Conteúdo: ${siteData.pageText}

    Agora, imagine que você trabalha na NILG.AI, uma consultoria especializada em Inteligência Artificial. Seu trabalho é encontrar maneiras de ajudar essa empresa a melhorar suas operações, otimizar a tomada de decisões e crescer com IA.

    Com base nas informações fornecidas, descreva de maneira detalhada como a NILG.AI poderia ajudar essa empresa com seus serviços. Pense em soluções de IA personalizadas para esse setor e problemas específicos que a NILG.AI poderia resolver.
    `;

	try {
		const response = await openai.chat.completions.create({
			model: "gpt-4",
			messages: [
				{
					role: "system",
					content:
						"Você é um especialista em Inteligência Artificial e consultoria de negócios.",
				},
				{ role: "user", content: prompt },
			],
			temperature: 0.7,
		});

		return response.choices[0].message.content;
	} catch (error) {
		console.error("Erro ao consultar a OpenAI:", error.message);
		return null;
	}
}

app.post("/analyze", async (req, res) => {
	const { url } = req.body;
	if (!url) return res.status(400).json({ error: "A URL é obrigatória" });

	console.log(`🔍 Processando site: ${url}`);

	const result = await analyzeWebsite(url);
	if (!result)
		return res.status(500).json({ error: "Falha ao processar a URL" });

	console.log("✅ URL Processada!");
	res.json({ url, analysis: result });
});

app.listen(PORT, () =>
	console.log(`🚀 API rodando em http://localhost:${PORT}`)
);

process.on("exit", async () => {
	if (browser) await browser.close();
});
