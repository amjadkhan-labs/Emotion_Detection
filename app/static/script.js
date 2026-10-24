(() => {
  const EMOTIONS = {
    joy:      { emoji: "😄", color: "#FFB627", soft: "rgba(255,182,39,0.16)",  line: "a lift, an openness — things feel lighter." },
    sadness:  { emoji: "😢", color: "#5B8DC0", soft: "rgba(91,141,192,0.16)",  line: "a quiet heaviness, something sitting low." },
    love:     { emoji: "❤️", color: "#E0607E", soft: "rgba(224,96,126,0.16)", line: "warmth directed outward, toward someone." },
    anger:    { emoji: "😠", color: "#E05B52", soft: "rgba(224,91,82,0.16)",  line: "friction — something crossed a line." },
    fear:     { emoji: "😨", color: "#8E7FB0", soft: "rgba(142,127,176,0.16)",line: "a brace, an edge of uncertainty." },
    surprise: { emoji: "😲", color: "#2EC4B6", soft: "rgba(46,196,182,0.16)", line: "the unexpected, still landing." },
  };

  const form        = document.getElementById("form");
  const textEl      = document.getElementById("text");
  const countEl     = document.getElementById("count");
  const submitBtn   = document.getElementById("submitBtn");
  const statusLine  = document.getElementById("statusLine");
  const chips       = document.getElementById("chips");

  const revealEmpty  = document.getElementById("revealEmpty");
  const revealResult = document.getElementById("revealResult");
  const resultEmoji  = document.getElementById("resultEmoji");
  const resultEmotionEl = document.getElementById("resultEmotion");
  const confidenceNumber = document.getElementById("confidenceNumber");
  const resultQuote  = document.getElementById("resultQuote");
  const breakdown    = document.getElementById("breakdown");

  const root = document.documentElement;

  // ---- character counter ----
  function syncCount(){
    countEl.textContent = textEl.value.length;
  }
  textEl.addEventListener("input", syncCount);
  syncCount();

  // ---- example chips ----
  chips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if(!btn) return;
    textEl.value = btn.dataset.text;
    syncCount();
    textEl.focus();
  });

  // ---- keyboard shortcut: Cmd/Ctrl + Enter ----
  textEl.addEventListener("keydown", (e) => {
    if((e.metaKey || e.ctrlKey) && e.key === "Enter"){
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // ---- count-up animation for confidence ----
  function animateNumber(el, to, duration = 700){
    const start = performance.now();
    function tick(now){
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * to);
      if(t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function setTheme(emotionKey){
    const e = EMOTIONS[emotionKey];
    if(!e) return;
    root.style.setProperty("--accent", e.color);
    root.style.setProperty("--accent-soft", e.soft);
  }

  function renderBreakdown(allProbs, topKey){
    breakdown.innerHTML = "";
    const sorted = Object.entries(allProbs).sort((a,b) => b[1] - a[1]);
    sorted.forEach(([key, value], i) => {
      const pct = Math.round(value * 100);
      const row = document.createElement("div");
      row.className = "bar-row" + (key === topKey ? " is-top" : "");
      row.innerHTML = `
        <span class="bar-label">${key}</span>
        <span class="bar-track"><span class="bar-fill"></span></span>
        <span class="bar-pct">${pct}%</span>
      `;
      breakdown.appendChild(row);
      const fill = row.querySelector(".bar-fill");
      fill.style.background = EMOTIONS[key] ? EMOTIONS[key].color : "var(--accent)";
      // stagger the width transition slightly per row
      setTimeout(() => { fill.style.width = pct + "%"; }, 60 * i + 120);
    });
  }

  async function analyze(text){
    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if(!res.ok){
      let detail = "Something went wrong reaching the model.";
      try{
        const body = await res.json();
        if(body.detail) detail = body.detail;
      }catch(_){}
      throw new Error(detail);
    }

    return res.json();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = textEl.value.trim();
    if(!text){
      statusLine.textContent = "Write something first — even a sentence is enough.";
      return;
    }

    statusLine.textContent = "";
    submitBtn.disabled = true;
    submitBtn.querySelector(".btn-label").textContent = "Reading…";

    try{
      const data = await analyze(text);
      const emotion = data.predicted_emotion;
      const meta = EMOTIONS[emotion] || { emoji: "🙂", line: "" };
      const confidencePct = Math.round(data.confidence * 100);

      setTheme(emotion);

      resultEmoji.textContent = meta.emoji;
      resultEmotionEl.textContent = emotion;
      resultQuote.textContent = `Reads mostly as ${emotion} — ${meta.line}`;

      revealEmpty.style.display = "none";
      revealResult.hidden = false;
      revealResult.classList.remove("in");
      void revealResult.offsetWidth; // restart animation
      revealResult.classList.add("in");

      animateNumber(confidenceNumber, confidencePct);
      renderBreakdown(data.all_probabilites, emotion);

    }catch(err){
      statusLine.textContent = err.message || "Couldn't reach the model. Try again in a moment.";
    }finally{
      submitBtn.disabled = false;
      submitBtn.querySelector(".btn-label").textContent = "Read it";
    }
  });
})();
