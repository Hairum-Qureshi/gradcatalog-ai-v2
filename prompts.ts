import { CatalogLinkData, PageData } from "./main";

export function getPrompt1(
	question: string,
	gradCISCatalogLinks: CatalogLinkData[]
) {
	return `
        You are tasked with determining which **University of Delaware Computer and Information Sciences (CIS)** graduate program page(s) best answer the user's question.
        **User question:** "${question}"
        You are given a JSON list of links to UD CIS graduate program pages:
        ${JSON.stringify(gradCISCatalogLinks)}
        **Instructions:**
        1. Return **only the href field(s)** of the **1-2 most relevant links**, as a **comma-separated list**.
        - Select links that are *directly and specifically* related to the user's question.
        2. If the question concerns **general admissions, department policies, or broad departmental information**, select **"Department of Computer and Information Sciences"**.
        3. If multiple pages could be relevant, choose the one that is **most central or general** to the topic
        (e.g., “Computer and Information Sciences (MS)” is broader than “Artificial Intelligence (MS)”).
        4. If **no link** plausibly answers the question, output exactly: 'N/A'.
        **Output format:** A single line containing only the selected link text(s), or 'N/A' if none apply.`;
}

// TODO - add backtracking if the chosen source links' content the AI chose isn't helpful towards providing a suitable answer to the user's query, it'll try a second time (and if that attempt fails) then prompt the user they don't have much knowledge to answer it.
export function getPrompt2(
	question: string,
	chosenSources: string[],
	dataSource: PageData[]
) {
	const formattedSources = dataSource
		.map((d, i) => `### Source ${i + 1} (${d.linkRef})\n${d.content}`)
		.join("\n\n---\n\n");

	return `
        You are an AI assistant that answers questions about the **University of Delaware Computer and Information Sciences (CIS) Graduate Program**.

        **User Question:**  
        "${question}"

        **Extracted Catalog Data:**  
        The following are full excerpts from the official University of Delaware catalog pages.  
        Each section corresponds to a specific program page or subpage:

        ${formattedSources}

        ---

        ### Response Instructions

        1. **Scope:**
        - Only answer if the question directly relates to the University of Delaware CIS graduate program (MS or PhD).
        - If not, respond:
            > "I'm sorry, but I can only answer questions related to the University of Delaware's Computer and Information Sciences graduate programs."

        2. **Information Use:**
        - Use *only* the factual information from the catalog excerpts above.
        - Do not invent or assume details not explicitly stated.
        - If information appears outdated or marked with “last updated,” include a short disclaimer.

        3. **Attribution:**
        - Cite which link(s) provided the information.
        - Example:
            > According to [Link 1], ... However, [Link 2] clarifies that ...

        4. **Tone & Output:**
        - Be factual, clear, and concise.
        - Do not mention “data sources,” “objects,” or “provided text.”
        - If info is missing, say so plainly (e.g., “The catalog does not list a specific contact phone number.”).
        - End with a **Sources:** line listing the URLs you used.

        ---

        **Available source URLs:**  
        ${chosenSources.join("\n")}
        `;
}

//         If you think the data source provided is not suited for answering the given question,
