import express, { Request, Response } from "express";
import axios from "axios";
import { load } from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPrompt1, getPrompt2 } from "./prompts";
import dotenv from "dotenv";
import path from "path";
import chalk from "chalk";

dotenv.config();

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.text());

const PORT = process.env.PORT! || 8000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface CatalogLinkData {
	text: string;
	href: string;
}

export interface PageData {
	linkRef: string;
	content: string;
}

async function getPageContent(href: string): Promise<PageData> {
	const page = await axios.get(href);
	const pageDataHTML = page.data;
	const $ = load(pageDataHTML);
	const pageContent = $(".block_content");

	return {
		linkRef: href,
		content: pageContent.html()!
	};
}

async function askAI(
	gradCISCatalogLinks: CatalogLinkData[],
	question?: string
): Promise<string> {
	if (question) {
		const prompt = getPrompt1(question, gradCISCatalogLinks);
		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text();

		if (text !== "N/A") {
			const hrefList = text.split(",");
			const pageTexts: PageData[] | PageData = await Promise.all(
				hrefList.map(getPageContent)
			);
			const prompt = getPrompt2(question, hrefList, pageTexts);

			const result = await model.generateContent(prompt);
			const response = await result.response;
			const answer = response.text();
			return answer;
			// Handles live AI text generation in terminal via content streaming
			// const result = await model.generateContentStream(prompt);
			// for await (const chunk of result.stream) {
			// 	const text = chunk.text();
			// 	if (text) {
			// 		process.stdout.write(chalk.greenBright(text));
			// 		// For better readability, the AI's response is sent to an 'answers.txt' file that gets created
			// 		const result = await model.generateContent(prompt);
			// 		const response = await result.response;
			// 		const answer = response.text();
			// fs.writeFile("answer.txt", answer, error => {
			// 	if (error) {
			// 		console.error(chalk.redBright(error));
			// 	}
			// });
			// 		return answer;
			// 	}
			// }
		} else {
			return "Please keep your questions focused on the UD CIS graduate program.";
		}
	}

	return "Question not provided";
}

export async function createDataSourceJSON(): Promise<CatalogLinkData[]> {
	const gradCISCatalog = await axios.get(
		"https://catalog.udel.edu/content.php?catoid=93&navoid=30534"
	);
	const gradCISCatalogHTML = gradCISCatalog.data;
	const $ = load(gradCISCatalogHTML);
	const links = $("#data_p_11725");
	const gradCISCatalogLinks: CatalogLinkData[] = $(links)
		.find("a")
		.map((_, el) => {
			return {
				text: $(el).text().trim(),
				href: `https://catalog.udel.edu/${$(el).attr("href")}`
			};
		})
		.get();

	gradCISCatalogLinks.push({
		text: "Department of Computer and Information Sciences",
		href: "https://catalog.udel.edu/preview_entity.php?catoid=93&ent_oid=11725&returnto=30534"
	});

	return gradCISCatalogLinks;
}

app.post("/send-question", async (req: Request, res: Response) => {
	const question = req.body;
	console.log("received:", question);
	const gradCISCatalogLinks = await createDataSourceJSON();
	const answer = await askAI(gradCISCatalogLinks, question);
	console.log("answer received and sent to frontend");
	res.status(200).send(answer);
});

app.get("/", (req: Request, res: Response) => {
	res.sendFile(path.join(__dirname, "./public/index.html"));
});

app.listen(PORT, () => {
	console.log(
		chalk.yellowBright(`Server is running on http://localhost:${PORT}`)
	);
});
