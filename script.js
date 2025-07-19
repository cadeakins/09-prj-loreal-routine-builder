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
    content: `You are an AI chatbot designed exclusively to assist users with L'Oréal products. Your goal is to help users explore the full range of L'Oréal's offerings—including makeup, skincare, haircare, and fragrances—and to provide personalized routines, advice, and product recommendations. You must only provide information about, and recommend, products, routines, and solutions from the L'Oréal portfolio. Never suggest, discuss, or recommend products from any other brand. Only answer questions related to L'Oréal’s products, routines, or personalized recommendations, and politely decline to answer unrelated queries.\n\nKey Guidelines:\n- Respond only about L'Oréal products, routines, or personalized recommendations.\n- Do not recommend or even mention non-L'Oréal products or brands.\n- When asked for a routine or recommendation, request relevant information such as skin type, hair type, concerns, preferences, and goals to personalize your suggestion.\n- If the user asks about unavailable or non-L'Oréal products, explain that you can only assist with L'Oréal's selection.\n- Do not answer questions that fall outside the scope of L'Oréal products, beauty routines, or recommendations.\n- When unable to answer due to scope (e.g., unrelated requests), offer context-relevant, L'Oréal-centric suggestions or product ideas that might fit the wider context of the user's question, if possible. Always maintain politeness and clarify your scope.\n\nReasoning order:\n- Begin by gathering or inferring relevant background (e.g., the user’s skin/hair type, their preferences, the specific product category, or concern).\n- Reason through the options or information within L'Oréal’s product range, considering variants or lines.\n- If the user’s request is outside your scope, consider the potential context of the question and suggest L'Oréal products or categories that could be relevant.\n- Only conclude with your tailored recommendation, suggestion, or a polite decline at the end of the response.\n\nOutput format:\n- Respond in clear, natural-sounding conversational text.\n- Length: Typically 2-6 sentences, or longer if a complete routine is needed.\n- Organize recommendations or steps with bullet points if multiple products or steps are suggested.\n- If personalizing a routine, introduce each step and briefly justify the product choices.\n- If declining or unable to answer the specific question, give a polite, flexible explanation (1-2 sentences) and, when reasonable, suggest any L'Oréal products that could be relevant in a general sense for that context.\n\n# Steps\n1. Analyze the user's query for relevance to L'Oréal products, routines, or recommendations.\n2. If relevant, proceed to request details and customize your response accordingly.\n3. If not directly relevant, politely decline the specific request, but infer possible related needs (e.g., if a user asks about planning a trip, suggest L'Oréal products suitable for travel or the destination's climate).\n4. Always ensure reasoning is clear and comes before any recommendation or decline.\n\n# Output Format\n- Respond in natural, conversational sentences or bullet points as appropriate.\n- Begin with reasoning and contextualization; conclude with recommendations or refusal.\n- For refusals, flexibly suggest products potentially useful in the user’s context when possible.\n\n# Notes\n- If asked about product ingredients, only discuss those in L'Oréal formulations.\n- If the user asks about store locations or purchasing advice, offer L'Oréal’s online shop or authorized retailers.\n- Always ensure that reasoning, contextual inference, or explanation comes before any product suggestion or conclusion.\n- Do not engage in any non-product-related planning or advice, but use the question’s context to offer potentially relevant L'Oréal products.\n- Maintain a polite and helpful tone when declining or redirecting queries outside of your scope.\n\nIMPORTANT REMINDER:\nYou may only discuss, recommend, or answer questions about L'Oréal’s products, routines, or personalized beauty solutions. Decline any request relating to other brands or topics; when declining, helpfully suggest L'Oréal products suitable for the user’s context whenever possible. Recommendations and reasoning must precede conclusions or advice. You have access to chat history, so you can refer to previous messages in the conversation to maintain context and continuity. You may recommend anything in the L'Oreal brand portfolio with brands such as L'Oréal Paris, Maybelline, Garnier, Lancôme, Kérastase, CeraVe, Redken, and others.`,
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

// Store selected products in an array
let selectedProducts = [];

/* Create HTML for displaying product cards and enable selection and modal */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if this product is selected
      const isSelected = selectedProducts.some((p) => p.name === product.name);
      return `
    <div class="product-card${
      isSelected ? " selected" : ""
    }" data-product-name="${product.name}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="view-details-btn" data-product-name="${
          product.name
        }">View Details</button>
      </div>
    </div>
  `;
    })
    .join("");

  // Add click event listeners to each product card (for selection)
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      // Prevent selection if clicking the View Details button
      if (e.target.classList.contains("view-details-btn")) return;
      const name = card.getAttribute("data-product-name");
      // Find the product in the current list
      const product = products.find((p) => p.name === name);
      // Check if already selected
      const index = selectedProducts.findIndex((p) => p.name === name);
      if (index === -1) {
        // Not selected, add to selectedProducts
        selectedProducts.push(product);
      } else {
        // Already selected, remove from selectedProducts
        selectedProducts.splice(index, 1);
      }
      // Re-render products and selected list
      displayProducts(products);
      updateSelectedProducts();
    });
  });

  // Add event listeners to View Details buttons
  const detailsBtns = document.querySelectorAll(".view-details-btn");
  detailsBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const name = btn.getAttribute("data-product-name");
      const product = products.find((p) => p.name === name);
      showProductModal(product);
    });
  });
}

// Modal logic
function showProductModal(product) {
  // Remove any existing modal
  const oldModal = document.getElementById("productModal");
  if (oldModal) oldModal.remove();

  // Create modal elements
  const modal = document.createElement("div");
  modal.id = "productModal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <button class="modal-close-btn" aria-label="Close">&times;</button>
      <h2 id="modalTitle">${product.name}</h2>
      <img src="${product.image}" alt="${
    product.name
  }" style="width:80px;height:80px;object-fit:contain;margin-bottom:10px;">
      <p style="margin-bottom:10px;"><strong>Brand:</strong> ${
        product.brand
      }</p>
      <p>${product.description || "No description available."}</p>
    </div>
  `;
  document.body.appendChild(modal);

  // Focus trap and accessibility
  const closeBtn = modal.querySelector(".modal-close-btn");
  closeBtn.focus();

  // Close modal on button click or overlay click
  closeBtn.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
  // Close modal on ESC key
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", escHandler);
    }
  });
}

// Update the Selected Products section
function updateSelectedProducts() {
  const selectedList = document.getElementById("selectedProductsList");
  if (!selectedList) return;
  if (selectedProducts.length === 0) {
    selectedList.innerHTML =
      '<div class="placeholder-message">No products selected yet.</div>';
    return;
  }
  selectedList.innerHTML = selectedProducts
    .map(
      (product, idx) => `
      <div class="selected-product-item" data-index="${idx}">
        <img src="${product.image}" alt="${product.name}" style="width:40px;height:40px;object-fit:contain;vertical-align:middle;">
        <span>${product.name}</span>
        <button class="remove-selected-btn" title="Remove" aria-label="Remove ${product.name}">&times;</button>
      </div>
    `
    )
    .join("");

  // Add event listeners to remove buttons
  const removeBtns = selectedList.querySelectorAll(".remove-selected-btn");
  removeBtns.forEach((btn, idx) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering card click
      selectedProducts.splice(idx, 1);
      updateSelectedProducts();
      // Update product card highlights in the current grid
      const productCards = document.querySelectorAll(".product-card");
      productCards.forEach((card) => {
        const name = card.getAttribute("data-product-name");
        if (selectedProducts.some((p) => p.name === name)) {
          card.classList.add("selected");
        } else {
          card.classList.remove("selected");
        }
      });
    });
  });
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
  updateSelectedProducts();
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

// Get reference to the Generate Routine button
const generateRoutineBtn = document.getElementById("generateRoutine");

// Add click event listener for Generate Routine
generateRoutineBtn.addEventListener("click", async () => {
  // If no products are selected, show an alert and stop
  if (selectedProducts.length === 0) {
    alert("Please select at least one product to generate a routine.");
    return;
  }

  // Prepare an array of product info to send to the AI (not shown to user)
  // Always mark products as inBrand: true unless explicitly set to false
  const selectedData = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
    inBrand: p.hasOwnProperty("inBrand") ? p.inBrand : true, // default to true
  }));

  // Add a system message for the AI with the selected products' JSON
  messages.push({
    role: "system",
    content:
      `The user has selected these products for their routine (JSON):\n` +
      JSON.stringify(selectedData, null, 2) +
      `\n\nCreate a personalized routine using ONLY products where "inBrand" is true. If any essential step is missing or a product is not in brand, briefly mention what type of L'Oréal product could be added.`,
  });

  // Add a user message to trigger the routine generation
  messages.push({
    role: "user",
    content:
      "Please generate a personalized routine using only my selected products.",
  });

  // Show a loading message in the chat window
  appendMessage({
    role: "assistant",
    content: "Generating your personalized routine...",
  });

  try {
    // Send the messages to the OpenAI API using fetch and async/await
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

    // Parse the response as JSON
    const data = await response.json();

    // Remove the loading message
    chatWindow.lastChild.remove();

    // Get the AI's routine from the response and show it in the chat window
    const routine = data.choices[0].message.content;
    messages.push({
      role: "assistant",
      content: routine,
    });
    appendMessage(messages[messages.length - 1]);
  } catch (error) {
    console.error("Error:", error);
    chatWindow.textContent =
      "Sorry, something went wrong. Please try again later.";
  }
});

// Simple Markdown to HTML converter for basic formatting
function simpleMarkdownToHtml(text) {
  // Convert code blocks (```) - must come first
  text = text.replace(/```([\s\S]*?)```/g, function (match, code) {
    return `<pre><code>${code
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</code></pre>`;
  });
  // Convert inline code (`code`)
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Convert bold (**bold**)
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Convert italic (*italic*)
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // Convert headings (###, ##, #)
  text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  // Convert unordered lists
  text = text.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>[\s\S]+<\/li>)/g, "<ul>$1</ul>");
  // Convert line breaks
  text = text.replace(/\n/g, "<br>");
  return text;
}

// Function to render messages in the chat window with Markdown support for assistant
function appendMessage(msg) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  if (msg.role === "user") {
    msgDiv.classList.add("user-message");
    msgDiv.textContent = msg.content; // User messages as plain text
  } else if (msg.role === "assistant") {
    msgDiv.classList.add("assistant-message");
    msgDiv.innerHTML = simpleMarkdownToHtml(msg.content); // Assistant messages as Markdown
  }
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// On page load, show empty selected products
updateSelectedProducts();

// Utility: create a slight delay for the "Thinking..." message
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
