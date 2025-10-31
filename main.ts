import express, { Request, Response } from "express";
import axios from "axios";
import { load } from "cheerio";
import {
	GenerateContentStreamResult,
	GoogleGenerativeAI
} from "@google/generative-ai";
import { giveGeminiContext, giveGeminiAnswerInstructions } from "./prompts";
import dotenv from "dotenv";
import chalk from "chalk";
import { startRedis, redis } from "./redis-init";
import { Langbase } from "langbase";
import { DataArray, pipeline } from "@xenova/transformers";

dotenv.config();

const app = express();
app.use(express.text());

const PORT = process.env.PORT! || 8000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Initialize the Langbase client
// Head to: https://langbase.com/docs/api-reference/api-keys#get-your-langbase-api-key to learn how to get your API key
const langbase = new Langbase({
	apiKey: process.env.LANGBASE_API_KEY!
});

export interface CatalogLinkData {
	text: string;
	href: string;
}

export interface PageData {
	linkRef: string;
	content: string;
}

async function getVectorEmbedding(chunk: string): Promise<DataArray> {
	const extractor = await pipeline(
		"feature-extraction",
		"Xenova/all-MiniLM-L6-v2"
	);

	const response = await extractor(chunk, {
		pooling: "mean",
		normalize: true
	});

	return response.data;
}

async function chunkText(content: string, link: string) {
	try {
		const chunks = await langbase.chunker({
			content,
			chunkMaxLength: 1024,
			chunkOverlap: 256
		});

		if (!(await redis.hetGet(`${link}-chunk-embeds`))) {
			for (let i = 0; i < chunks.length; i++) {
				await redis.hSet(
					`${link}-chunk-embeds`,
					i,
					JSON.stringify({
						chunkIndex: i,
						text: chunks[i],
						embedding: await getVectorEmbedding(chunks[i])
					})
				);
			}
		}
	} catch (error) {
		console.error(
			chalk.redBright(
				`There was a problem chunking text in the ${chalk.yellowBright(
					"chunkText"
				)} function:`,
				error
			)
		);
	}
}

export async function createDataSourceJSON(): Promise<
	Map<string, CatalogLinkData>
> {
	try {
		const gradCISCatalog = await axios.get(
			"https://catalog.udel.edu/content.php?catoid=93&navoid=30534"
		);
		const gradCISCatalogHTML = gradCISCatalog.data;
		const $ = load(gradCISCatalogHTML);
		const links = $("#data_p_11725");
		const dataSourceHashMap: Map<string, CatalogLinkData> = new Map();
		$(links)
			.find("a")
			.map((_, el) => {
				dataSourceHashMap.set(
					`https://catalog.udel.edu/${$(el).attr("href")}`,
					{
						text: $(el).text().trim(),
						href: `https://catalog.udel.edu/${$(el).attr("href")}`
					}
				);
			})
			.get();

		dataSourceHashMap.set(
			"https://catalog.udel.edu/preview_entity.php?catoid=93&ent_oid=11725&returnto=30534",
			{
				text: "Department of Computer and Information Sciences",
				href: "https://catalog.udel.edu/preview_entity.php?catoid=93&ent_oid=11725&returnto=30534"
			}
		);

		return dataSourceHashMap;
	} catch (error) {
		console.error(
			chalk.redBright(
				`There was a problem generating JSON in the ${chalk.yellowBright(
					"createDataSourceJSON"
				)} function:`,
				error
			)
		);
		return new Map();
	}
}

createDataSourceJSON();

// TODO - need to add expiry to Redis for hashed page content

async function getPageContent(href: string) {
	const page = await axios.get(href);
	const pageDataHTML = page.data;
	const $ = load(pageDataHTML);
	const pageContent = $(".block_content");

	await redis.hSet(
		"dataSource",
		href,
		JSON.stringify({
			linkRef: href,
			content: pageContent.html()
		})
	);
}

async function askGemini(
	question: string,
	isBacktracking: boolean = false
): Promise<string> {
	const dataSourceHashMap = await createDataSourceJSON();
	const prompt = giveGeminiContext(question, dataSourceHashMap);
	const result = await model.generateContent(prompt);
	const response = await result.response;
	const text = response.text().split(",");

	for (const link of text) {
		if (!(await redis.hGet("dataSource", link))) {
			await getPageContent(link);
		} else {
			// get from Redis, break into chunks and vectors 
			const raw = await redis.hGet("dataSource", link);
			const data = JSON.parse(raw!);
			await chunkText(data.content, link);
		}
	}

	return "";
}

app.post("/ask-question", async (req: Request, res: Response) => {
	const { question } = req.body;
	const answer: string = await askGemini(question, false);
});

app.get("/", async (req: Request, res: Response) => {
	await askGemini("Tell me about all the grad programs");
	res.json(Object.fromEntries(await createDataSourceJSON()));
});

app.listen(PORT, () => {
	console.log(
		chalk.yellowBright(`Server is running on http://localhost:${PORT}`)
	);
	startRedis;
});

// import express, { Request, Response } from "express";
// import axios from "axios";
// import { load } from "cheerio";
// import {
// 	GenerateContentStreamResult,
// 	GoogleGenerativeAI
// } from "@google/generative-ai";
// import { getPrompt1, getPrompt2 } from "./prompts";
// import dotenv from "dotenv";
// import chalk from "chalk";
// import { startRedis, redis } from "./redis-init";

// dotenv.config();

// const app = express();
// app.use(express.text());

// const PORT = process.env.PORT! || 8000;

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// export interface CatalogLinkData {
// 	text: string;
// 	href: string;
// }

// export interface PageData {
// 	linkRef: string;
// 	content: string;
// }

// async function getPageContent(href: string): Promise<PageData> {
// 	const page = await axios.get(href);
// 	const pageDataHTML = page.data;
// 	const $ = load(pageDataHTML);
// 	const pageContent = $(".block_content");

// 	return {
// 		linkRef: href,
// 		content: pageContent.html()!
// 	};
// }

// async function askAI(
// 	gradCISCatalogLinks: CatalogLinkData[],
// 	question?: string
// ): Promise<GenerateContentStreamResult | string> {
// 	if (question) {
// const prompt = getPrompt1(question, gradCISCatalogLinks);
// const result = await model.generateContent(prompt);
// const response = await result.response;
// const text = response.text();

// 		if (text !== "N/A") {
// 			const hrefList = text.split(",");
// 			const pageTexts: PageData[] | PageData = await Promise.all(
// 				hrefList.map(getPageContent)
// 			);
// 			const prompt = getPrompt2(question, hrefList, pageTexts);
// 			const result = await model.generateContentStream(prompt);
// 			return result;
// 		} else {
// 			return "Please keep your questions focused on the UD CIS graduate program.";
// 		}
// 	}

// 	return "Question not provided";
// }

// export async function createDataSourceJSON(): Promise<CatalogLinkData[]> {
// 	const gradCISCatalog = await axios.get(
// 		"https://catalog.udel.edu/content.php?catoid=93&navoid=30534"
// 	);
// 	const gradCISCatalogHTML = gradCISCatalog.data;
// 	const $ = load(gradCISCatalogHTML);
// 	const links = $("#data_p_11725");
// 	const gradCISCatalogLinks: CatalogLinkData[] = $(links)
// 		.find("a")
// 		.map((_, el) => {
// 			return {
// 				text: $(el).text().trim(),
// 				href: `https://catalog.udel.edu/${$(el).attr("href")}`
// 			};
// 		})
// 		.get();

// 	gradCISCatalogLinks.push({
// text: "Department of Computer and Information Sciences",
// href: "https://catalog.udel.edu/preview_entity.php?catoid=93&ent_oid=11725&returnto=30534"
// 	});

// 	return gradCISCatalogLinks;
// }

// app.post("/send-question", async (req: Request, res: Response) => {
// 	res.setHeader("Content-Type", "text/plain; charset=utf-8");
// 	res.setHeader("Transfer-Encoding", "chunked");

// 	const question = req.body;
// 	console.log("Received question:", question);

// 	try {
// 		const gradCISCatalogLinks = await createDataSourceJSON();
// 		const result = await askAI(gradCISCatalogLinks, question);

// 		// Stream chunks as they arrive
// 		for await (const chunk of (result as GenerateContentStreamResult).stream) {
// 			const text = chunk.text();
// 			if (text) {
// 				// Log to server
// 				// process.stdout.write(chalk.greenBright(text));

// 				// Stream to frontend
// 				res.write(`data: ${JSON.stringify({ text })}\n\n`);
// 			}
// 		}

// 		// Stream complete — end the connection
// 		res.write(`data: [DONE]\n\n`);
// 		res.end();
// 		console.log("Stream ended and response closed.");
// 	} catch (err) {
// 		console.error("Error during stream:", err);
// 		res.write(
// 			`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`
// 		);
// 		res.end();
// 	}
// });

// app.get("/", async (req: Request, res: Response) => {
// 	const gradCISCatalogLinks = await createDataSourceJSON();
// 	res.json(gradCISCatalogLinks);
// });

// app.listen(PORT, () => {
// 	console.log(
// 		chalk.yellowBright(`Server is running on http://localhost:${PORT}`)
// 	);
// 	startRedis;
// });
