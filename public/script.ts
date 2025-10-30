let totalSeconds = 0;

function setCounter() {
	totalSeconds += 1;
}

function markdownToHTML(html: string) {
	html = html.replace(/^###### (.*$)/gim, "<h6>$1</h6>");
	html = html.replace(/^##### (.*$)/gim, "<h5>$1</h5>");
	html = html.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
	html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
	html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
	html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

	html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
	html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");
	html = html.replace(/`(.*?)`/gim, "<code>$1</code>");
	html = html.replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>");
	html = html.replace(/\n/gim, "<br />");

	return html;
}

const aiResponseAnswerDiv = document.querySelector("#ai-response")!;
const aiResponseDiv = document.querySelector("#aiResponseDiv");
const numberSecondsSpan = document.querySelector("#numberSeconds");

function sendRequest() {
	const question = (
		document.querySelector("#questionInput") as HTMLInputElement
	).value;

	if (!question.trim()) {
		return alert("Please provide a question");
	}

	aiResponseAnswerDiv.innerHTML =
		"<div class = 'flex items-center'><img src = './loading-gif.gif' class = 'w-8 h-8 mr-2' /><p>Generating response, please wait...</p></div>";
	aiResponseDiv?.classList.remove("block");
	aiResponseDiv?.classList.add("hidden");
	totalSeconds = 0;
	setInterval(setCounter, 1000);

	fetch("/send-question", {
		method: "POST",
		headers: {
			"Content-Type": "text/plain"
		},
		body: question
	})
		.then(response => {
			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}
			return response.text();
		})
		.then(data => {
			aiResponseAnswerDiv!.innerHTML = markdownToHTML(data);
			numberSecondsSpan!.textContent = totalSeconds.toString();
			aiResponseDiv?.classList.remove("hidden");
			aiResponseDiv?.classList.add("block");
		})
		.catch(error => {
			console.error("Error sending request:", error);
		});
}

const generateButton = document
	.querySelector("#generateBtn")!
	.addEventListener("click", sendRequest);
