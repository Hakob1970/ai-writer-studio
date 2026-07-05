// ========================
// 1. КОНСТАНТЫ И СОСТОЯНИЕ
// ========================

const MODE = "dev"; //

const generateBtn = document.getElementById("generateBtn");
const outputChat = document.getElementById("outputChat");
const cancelBtn = document.getElementById("cancelBtn");
const API_URL = "https://ai-navigator-backend-mcb3.onrender.com";
const WRITER_API = `${API_URL}/api/writer/generate`;

let state = {
    category: "Books",
    mode: null,
    formData: {},
    result: ""
};

let isGenerating = false; 

let currentController = null;

// ========================
// 2. DOM-ЭЛЕМЕНТЫ
// ========================

const categories = document.querySelectorAll(".cat");
const cardsContainer = document.querySelector(".modes");



function resetUI() {

    document.querySelector(".result")?.replaceChildren();
    document.querySelector(".input-parameters")?.replaceChildren();

    isGenerating = false;

    if (currentController) {
        currentController.abort();
        currentController = null;
    }

    setGenerateButtonState("ready");
}

// ========================
// 3. КОНФИГУРАЦИИ
// ========================

const config = {
    Books: ["Fantasy", "Sci-Fi", "Romance", "Historical", "Mystery"],
    Education: ["Essay", "Research", "Homework", "Summary"],
    Business: ["Email", "Proposal", "Marketing", "Business Plan"],
    Content: ["Blog", "SEO", "YouTube", "Instagram"],
    Creative: ["Characters", "Plot", "Dialogue", "World Builder"],
    Tools: ["Rewrite", "Grammar", "Translate", "Humanize"]
};

const formConfig = {
    Fantasy: ["Title", "Main Character", "World", "Style"],
    "Sci-Fi": ["Title", "Technology", "World", "Era"],
    Romance: ["Characters", "Relationship", "Tone"],
    Historical: ["Period", "Location", "Events"],
    Mystery: ["Crime", "Suspects", "Clues", "Twist"],
    Essay: ["Topic", "Subject", "Word Count", "Level"],
    Research: ["Topic", "Sources", "Goal"],
    Homework: ["Subject", "Task", "Level"],
    Summary: ["Text", "Length", "Style"],
    Email: ["Recipient", "Purpose", "Tone"],
    Proposal: ["Goal", "Audience", "Budget"],
    Marketing: ["Product", "Audience", "Strategy"],
    "Business Plan": ["Idea", "Market", "Revenue"],
    Blog: ["Topic", "SEO Keywords", "Tone"],
    SEO: ["Keyword", "Audience", "Goal"],
    YouTube: ["Title", "Audience", "Style"],
    Instagram: ["Niche", "Tone", "Hashtags"],
    Characters: ["Name", "Personality", "Backstory"],
    Plot: ["Genre", "Conflict", "Ending"],
    Dialogue: ["Characters", "Scene", "Tone"],
    "World Builder": ["World", "Rules", "Style"],
    Rewrite: ["Text", "Style"],
    Grammar: ["Text", "Language"],
    Translate: ["Text", "Target Language"],
    Humanize: ["Text", "Tone"]
};

// ========================
// 4. ШАБЛОНЫ ДЛЯ ПРОМПТОВ
// ========================

const templates = {
    Default: {
        system: `You are a helpful AI writing assistant.`,
        rules: ["Be clear", "Be structured"]
    }
};



const categoryTemplates = {
  Books: {
    system: "You are a professional fiction author.",
    rules: ["Focus on storytelling", "Create emotional depth"]
  },

  Business: {
    system: "You are a business copywriter.",
    rules: ["Be persuasive", "Focus on conversion"]
  },

  Education: {
    system: "You are an academic assistant.",
    rules: ["Be structured", "Be factual"]
  },

  Content: {
    system: "You are a content creator.",
    rules: ["Be engaging", "Optimize for audience"]
  },

  Creative: {
    system: "You are a creative storyteller.",
    rules: ["Be imaginative", "Think outside the box"]
  },

  Tools: {
    system: "You are a text processing assistant.",
    rules: ["Be precise", "Preserve meaning"]
  }
};



const modeOverrides = {
  Fantasy: {
    rules: ["Add magic systems", "Create immersive worlds"]
  },

  "Sci-Fi": {
    rules: ["Include futuristic technology", "Think scientifically"]
  },

  Blog: {
    rules: ["Use SEO structure", "Engaging hook intro"]
  },

  Email: {
    rules: ["Start with greeting", "Add clear CTA"]
  },

  SEO: {
    rules: ["Use keywords naturally", "Optimize headings"]
  }
};




function getTemplate(category, mode) {
  

    const base = categoryTemplates[category] || {
  system: templates.Default.system,
  rules: templates.Default.rules
};


   const override = modeOverrides[mode] || { rules: [] };

  return {
    system: base.system,
    rules: [
      ...(base.rules || []),
      ...(override.rules || [])
    ]
  };
}


// ========================
// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

function setActiveButton(button, selector) {
    document.querySelectorAll(selector).forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
}


function setGenerateButtonState(state) {

    console.log("STATE =", state);
    console.log(generateBtn);
    console.log(cancelBtn);

    if (!generateBtn || !cancelBtn) return;

    if (state === "loading") {

        generateBtn.textContent = "⏳ Generating...";
        generateBtn.disabled = true;

        generateBtn.style.display = "none";
        cancelBtn.style.display = "inline-block";
    }

    if (state === "ready") {

        generateBtn.textContent = "✨ Generate with AI";
        generateBtn.disabled = false;

        generateBtn.style.display = "inline-block";
        cancelBtn.style.display = "none";
    }

    if (state === "done") {

        generateBtn.textContent = "✅ Generated";
        generateBtn.disabled = false;

        generateBtn.style.display = "inline-block";
        cancelBtn.style.display = "none";

        setTimeout(() => {
            generateBtn.textContent = "✨ Generate with AI";
        }, 1200);
    }
}

cancelBtn.addEventListener("click", () => {
    resetUI();
    addMessage("ai", "⛔ Generation cancelled by user");
});



function cancelGeneration() {
    if (!isGenerating) return;

    currentController?.abort();
    isGenerating = false;
    currentController = null;

    setGenerateButtonState("ready");
}


function addMessage(role, text) {
    console.log("ADD MESSAGE:", role, text);
    console.log("OUTPUT CHAT:", outputChat);

    if (!outputChat) return;

    const msg = document.createElement("div");
    msg.classList.add(role === "user" ? "msg-user" : "msg-ai");
    msg.textContent = text;

    outputChat.appendChild(msg);

    console.log("APPENDED:", msg);
    return msg;
}


function typeText(element, text, speed = 10) {
    return new Promise((resolve) => {
        element.textContent = "";
        let i = 0;
        const interval = setInterval(() => {
            element.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

// ========================
// 6. ОСНОВНАЯ ЛОГИКА
// ========================

function init() {
    attachCategoryEvents();
    renderModes("Books");
}

function attachCategoryEvents() {
    document.querySelectorAll(".cat").forEach(cat => {
        cat.addEventListener("click", () => {
            document.querySelectorAll(".cat").forEach(c => c.classList.remove("active"));
            cat.classList.add("active");
            const category = cat.dataset.category; // используем dataset
            state.category = category;
            state.mode = null;
            renderModes(category);
        });
    });
}



function renderModes(category) {

cancelGeneration();

    cardsContainer.innerHTML = "";
    state.mode = null;

    state.formData = {};

    // 🔥 очистка формы
    renderForm(null);

    // 💣 очистка чата
    outputChat.innerHTML = "";

    document.querySelectorAll(".card")
        .forEach(c => c.classList.remove("active"));

    const modes = config[category] || [];

    modes.forEach(mode => {
        const card = document.createElement("div");
        card.className = "card";
        card.textContent = mode;

        card.addEventListener("click", () => {

            document.querySelectorAll(".card")
                .forEach(c => c.classList.remove("active"));

            card.classList.add("active");

            state.mode = mode;

            state.formData = {};
            outputChat.innerHTML = "";

cancelGeneration();

            renderForm(mode);
        });

        cardsContainer.appendChild(card);
    });
}


function renderForm(mode) {
    const form = document.getElementById("dynamicForm");
    if (!form) return;

    form.innerHTML = "";

    if (!mode || !formConfig[mode]) return;

    // не сбрасываем данные
    state.formData = state.formData || {};

    formConfig[mode].forEach(field => {

        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "10px";

        const label = document.createElement("label");
        label.textContent = field;
        label.style.display = "block";
        label.style.marginBottom = "4px";
        label.style.fontSize = "14px";
        label.style.color = "#94a3b8";

        const input = document.createElement("input");
        input.placeholder = field;
        input.setAttribute("aria-label", field);

        // восстановление значения
        input.value = state.formData[field] || "";

        // ✔ ОДИН ЕДИНСТВЕННЫЙ listener
        input.addEventListener("input", (e) => {
            state.formData[field] = e.target.value;

            console.log("🔥 INPUT:", field, e.target.value);
            console.log("🔥 STATE:", JSON.stringify(state.formData));
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        form.appendChild(wrapper);
    });
}



function buildMessages() {

const hasData = Object.values(state.formData || {})
    .some(v => (v ?? "").toString().trim().length > 0);

const safeData = hasData
    ? state.formData
    : { Instructions: "No specific input provided." };

    const template = getTemplate(state.category, state.mode);

    let input = "";

    Object.entries(safeData).forEach(([key, value]) => {
        input += `${key}: ${(value || "").toString().trim()}\n`;
    });

    const userContent = `
Category: ${state.category}
Mode: ${state.mode}

Guidelines:
${template.rules.join("\n")}

User Input:
${input}

Return ONLY the final result.
Do not explain your reasoning.
`.trim();

    return [
        {
            role: "system",
            content: template.system
        },
        {
            role: "user",
            content: userContent
        }
    ];
}


// ========================
// 7. ГЕНЕРАЦИЯ ТЕКСТА
// ========================

function generateText() {

    if (isGenerating) return;

    if (!state.mode) {
        addMessage("ai", "⚠️ Please select a writing mode first.");
        return;
    }

    const hasData = Object.entries(state.formData || {})
        .some(([_, v]) => v && v.toString().trim());

    if (!hasData) {
        addMessage("ai", "⚠️ Fill in at least one field before generating.");
        return;
    }

    isGenerating = true;
   

    runGenerator();
}



async function runGenerator() {

  setGenerateButtonState("loading");

  currentController = new AbortController();

  try {

    const response = await fetch(WRITER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      signal: currentController.signal,
      body: JSON.stringify({
        category: state.category,
        mode: state.mode,
        formData: state.formData
      })
    });

    const data = await response.json();

    const result = data?.result;

    if (!result) {
      addMessage("ai", "❌ No response from AI.");
      setGenerateButtonState("ready");
      return;
    }

    const msg = addMessage("ai", "");
    await typeText(msg, result);

    setGenerateButtonState("done");

  } catch (err) {

    if (err.name === "AbortError") {
      addMessage("ai", "⛔ Generation cancelled");
      setGenerateButtonState("ready");
      return;
    }

    console.error(err);
    addMessage("ai", "❌ Error: AI request failed.");
    setGenerateButtonState("ready");

  } finally {
    currentController = null;
    isGenerating = false;
  }
}


document.getElementById("backDashboard").addEventListener("click", () => {

    window.location.href = "https://ai-navigator-frontend.vercel.app/";

});


document.getElementById("premiumBtn").addEventListener("click", async () => {

    const email = localStorage.getItem("email");

    try {

        const res = await fetch("https://ai-navigator-backend.vercel.app/api/stripe/create-checkout-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                module: "writer-studio"
            })
        });

        const data = await res.json();

        if (data.url) {
            window.location.href = data.url;
        } else {
            alert("Payment error");
        }

    } catch (err) {
        console.error(err);
        alert("Payment failed");
    }

});


// ========================
// 8. ИНИЦИАЛИЗАЦИЯ И СОБЫТИЯ
// ========================

document.addEventListener("DOMContentLoaded", () => {
    init();

    // Кнопка Generate
    if (generateBtn) {
        generateBtn.addEventListener("click", generateText);
    }

    // Кнопки действий (заглушки)
    document.querySelectorAll(".actions button").forEach(btn => {
        btn.addEventListener("click", () => {
            alert(`Action "${btn.textContent}" is not implemented yet.`);
        });
    });
});
