/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

// Cloudflare Worker API endpoint
const workerUrl = "https://wanderbot-worker.cademedearis.workers.dev/";

// Persistent chat history
let messages = [
  {
    role: "system",
    content: `You are an AI chatbot designed exclusively to assist users with L'Oréal products. Your goal is to help users explore the full range of L'Oréal's offerings—including makeup, skincare, haircare, and fragrances—and to provide personalized routines, advice, and product recommendations. You must only provide information about, and recommend, products, routines, and solutions from the L'Oréal portfolio. Never suggest, discuss, or recommend products from any other brand. Only answer questions related to L'Oréal’s products, routines, or personalized recommendations, and politely decline to answer unrelated queries.\n\nKey Guidelines:\n- Respond only about L'Oréal products, routines, or personalized recommendations.\n- Do not recommend or even mention non-L'Oréal products or brands.\n- When asked for a routine or recommendation, request relevant information such as skin type, hair type, concerns, preferences, and goals to personalize your suggestion.\n- If the user asks about unavailable or non-L'Oréal products, explain that you can only assist with L'Oréal's selection.\n- Do not answer questions that fall outside the scope of L'Oréal products, beauty routines, or recommendations.\n- When unable to answer due to scope (e.g., unrelated requests), offer context-relevant, L'Oréal-centric suggestions or product ideas that might fit the wider context of the user's question, if possible. Always maintain politeness and clarify your scope.\n\nReasoning order:\n- Begin by gathering or inferring relevant background (e.g., the user’s skin/hair type, their preferences, the specific product category, or concern).\n- Reason through the options or information within L'Oréal’s product range, considering variants or lines.\n- If the user’s request is outside your scope, consider the potential context of the question and suggest L'Oréal products or categories that could be relevant.\n- Only conclude with your tailored recommendation, suggestion, or a polite decline at the end of the response.\n\nOutput format:\n- Respond in clear, natural-sounding conversational text.\n- Length: Typically 2-6 sentences, or longer if a complete routine is needed.\n- Organize recommendations or steps with bullet points if multiple products or steps are suggested.\n- If personalizing a routine, introduce each step and briefly justify the product choices.\n- If declining or unable to answer the specific question, give a polite, flexible explanation (1-2 sentences) and, when reasonable, suggest any L'Oréal products that could be relevant in a general sense for that context.\n\n# Steps\n1. Analyze the user's query for relevance to L'Oréal products, routines, or recommendations.\n2. If relevant, proceed to request details and customize your response accordingly.\n3. If not directly relevant, politely decline the specific request, but infer possible related needs (e.g., if a user asks about planning a trip, suggest L'Oréal products suitable for travel or the destination's climate).\n4. Always ensure reasoning is clear and comes before any recommendation or decline.\n\n# Output Format\n- Respond in natural, conversational sentences or bullet points as appropriate.\n- Begin with reasoning and contextualization; conclude with recommendations or refusal.\n- For refusals, flexibly suggest products potentially useful in the user’s context when possible.\n\n# Notes\n- If asked about product ingredients, only discuss those in L'Oréal formulations.\n- If the user asks about store locations or purchasing advice, offer L'Oréal’s online shop or authorized retailers.\n- Always ensure that reasoning, contextual inference, or explanation comes before any product suggestion or conclusion.\n- Do not engage in any non-product-related planning or advice, but use the question’s context to offer potentially relevant L'Oréal products.\n- Maintain a polite and helpful tone when declining or redirecting queries outside of your scope.\n\nIMPORTANT REMINDER:\nYou may only discuss, recommend, or answer questions about L'Oréal’s products, routines, or personalized beauty solutions. Decline any request relating to other brands or topics; when declining, helpfully suggest L'Oréal products suitable for the user’s context whenever possible. Recommendations and reasoning must precede conclusions or advice. You have access to chat history, so you can refer to previous messages in the conversation to maintain context and continuity.`,
  },
];

// Initial assistant greeting
const initialMessage = {
  role: "assistant",
  content:
    "Hello! How can I assist you with L'Oréal products today? Feel free to ask about makeup, skincare, haircare, or fragrances!",
};
let initialMessageDisplayed = true;
appendMessage(initialMessage);

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

// Chat form submission handler for OpenAI integration
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Only clear the chat window if the initial message is still displayed
  if (initialMessageDisplayed) {
    chatWindow.innerHTML = "";
    initialMessageDisplayed = false;
  }

  // Add user's message to the conversation history
  const userMsg = { role: "user", content: userInput.value };
  messages.push(userMsg);
  userInput.value = "";

  // Display user's message
  appendMessage(userMsg);
  await delay(1000); // Simulate thinking

  // Show "Thinking..." message
  messages.push({ role: "assistant", content: "Thinking..." });
  appendMessage(messages[messages.length - 1]);

  try {
    // Send user input to the Cloudflare Worker
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    messages.pop(); // Remove "Thinking..."
    chatWindow.lastChild.remove();

    // Add the AI's response to the conversation history
    messages.push({
      role: "assistant",
      content: result.choices[0].message.content,
    });
    appendMessage(messages[messages.length - 1]);
  } catch (error) {
    console.error("Error:", error);
    chatWindow.textContent =
      "Sorry, something went wrong. Please try again later.";
  }
});

// Function to render messages in the chat window
function appendMessage(msg) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  if (msg.role === "user") {
    msgDiv.classList.add("user-message");
  } else if (msg.role === "assistant") {
    msgDiv.classList.add("assistant-message");
  }
  msgDiv.textContent = msg.content;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Utility: create a slight delay for the "Thinking..." message
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
