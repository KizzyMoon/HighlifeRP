const mothers = [
  "Hannah", "Audrey", "Jasmine", "Giselle", "Amelia", "Isabella", "Zoe", "Ava",
  "Camila", "Violet", "Sophia", "Evelyn", "Nicole", "Ashley", "Grace", "Brianna",
  "Natalie", "Olivia", "Elizabeth", "Charlotte", "Emma", "Misty"
];

const fathers = [
  "Benjamin", "Daniel", "Joshua", "Noah", "Andrew", "Juan", "Alex", "Isaac",
  "Evan", "Ethan", "Vincent", "Angel", "Diego", "Adrian", "Gabriel", "Michael",
  "Santiago", "Kevin", "Louis", "Samuel", "Anthony", "Claude", "Niko", "John"
];

const faceFeatures = [
  "Nose width", "Nose peak height", "Nose peak length", "Nose bone height",
  "Nose peak lowering", "Nose bone twist", "Eyebrow height", "Eyebrow depth",
  "Cheekbone height", "Cheekbone width", "Cheek depth", "Eye size",
  "Lip thickness", "Jaw width", "Jaw shape", "Chin height",
  "Chin depth", "Chin width", "Chin indent", "Neck width"
];

const featurePairs = [
  { title: "Nose Size", x: "Nose width", y: "Nose peak height", left: "Narrow", right: "Wide", top: "High", bottom: "Low" },
  { title: "Nose Profile", x: "Nose peak length", y: "Nose bone height", left: "Short", right: "Long", top: "Raised", bottom: "Lowered" },
  { title: "Nose Tip", x: "Nose peak lowering", y: "Nose bone twist", left: "Upturned", right: "Downturned", top: "Twist left", bottom: "Twist right" },
  { title: "Brow", x: "Eyebrow height", y: "Eyebrow depth", left: "Lower", right: "Higher", top: "Inward", bottom: "Outward" },
  { title: "Cheekbones", x: "Cheekbone height", y: "Cheekbone width", left: "Low", right: "High", top: "Narrow", bottom: "Wide" },
  { title: "Cheeks and Eyes", x: "Cheek depth", y: "Eye size", left: "Sunken", right: "Full", top: "Small eyes", bottom: "Large eyes" },
  { title: "Lips and Jaw", x: "Lip thickness", y: "Jaw width", left: "Thin lips", right: "Full lips", top: "Narrow jaw", bottom: "Wide jaw" },
  { title: "Jaw Shape", x: "Jaw shape", y: "Chin height", left: "Round", right: "Square", top: "High chin", bottom: "Low chin" },
  { title: "Chin Profile", x: "Chin depth", y: "Chin width", left: "Inward", right: "Outward", top: "Narrow", bottom: "Wide" },
  { title: "Chin and Neck", x: "Chin indent", y: "Neck width", left: "Smooth", right: "Indented", top: "Narrow neck", bottom: "Wide neck" }
];

const starterData = {
  characters: [
    {
      name: "Example Character",
      role: "Replace this with your Highlife character concept",
      model: "mp_f_freemode_01",
      voice: "Calm, dry humour",
      mother: "Sophia",
      father: "Niko",
      resemblance: "45",
      skinMix: "52",
      hairStyle: "Long bob",
      hairColor: "Dark brown",
      highlightColor: "Caramel",
      eyeColor: "Green",
      eyebrows: "Soft arch, dark brown, 70%",
      facialHair: "None",
      blemishes: "None",
      ageing: "None",
      makeup: "Subtle eyeliner",
      blushLipstick: "Muted rose lipstick",
      freckles: "Light freckles",
      outfit: "Black jacket, blue jeans, white trainers",
      creation: "Use this card as a template for the exact settings you need after a wipe.",
      features: Object.fromEntries(faceFeatures.map((feature) => [feature, "0"]))
    }
  ],
  paints: [
    { name: "Midnight Wine", r: 74, g: 20, b: 35, notes: "Deep red-purple, good for luxury builds" },
    { name: "Glacier Blue", r: 145, g: 213, b: 226, notes: "Light icy blue, clean sports look" },
    { name: "Wasabi Green", r: 78, g: 143, b: 88, notes: "Muted green, street build friendly" }
  ],
  cars: [
    {
      name: "Example Sultan RS",
      price: "$125,000",
      store: "PDM",
      category: "Sports",
      notes: "Replace this with the real Highlife server price."
    },
    {
      name: "Example Baller",
      price: "$90,000",
      store: "Luxury Autos",
      category: "SUV",
      notes: "Useful format for dealership tracking."
    }
  ],
  notes: "Add server rules, useful locations, mechanic contacts, favourite builds, or future ideas here."
};

const storageKey = "highlife-database-v2";
const data = loadData();

const characterGrid = document.querySelector("#characterGrid");
const characterDetailsDialog = document.querySelector("#characterDetailsDialog");
const characterDetails = document.querySelector("#characterDetails");
const paintGrid = document.querySelector("#paintGrid");
const carTable = document.querySelector("#carTable");
const carSearch = document.querySelector("#carSearch");
const categoryFilter = document.querySelector("#categoryFilter");
const notesBox = document.querySelector("#notesBox");
const characterMakerForm = document.querySelector("#characterMakerForm");
const saveCharacterStatus = document.querySelector("#saveCharacterStatus");

function loadData() {
  const savedV2 = localStorage.getItem(storageKey);
  if (savedV2) {
    return JSON.parse(savedV2);
  }

  const savedV1 = localStorage.getItem("highlife-database-v1");
  if (savedV1) {
    const oldData = JSON.parse(savedV1);
    return {
      ...structuredClone(starterData),
      ...oldData,
      characters: oldData.characters.map(upgradeCharacter)
    };
  }

  return structuredClone(starterData);
}

function upgradeCharacter(character) {
  return {
    ...structuredClone(starterData.characters[0]),
    ...character,
    model: character.model || "mp_f_freemode_01",
    hairColor: character.hairColor || character.hair || "",
    eyeColor: character.eyeColor || character.eyes || "",
    features: character.features || Object.fromEntries(faceFeatures.map((feature) => [feature, "0"]))
  };
}

function saveData() {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function populateSelect(select, options) {
  if (!select) {
    return;
  }

  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
}

function setupCharacterMaker() {
  if (!characterMakerForm) {
    return;
  }

  populateSelect(document.querySelector("#motherSelect"), mothers);
  populateSelect(document.querySelector("#fatherSelect"), fathers);

  const featurePads = document.querySelector("#featurePads");
  featurePads.innerHTML = featurePairs
    .map((pair) => {
      return `
        <div class="feature-pad-card">
          <div class="pad-card-header">
            <strong>${escapeHtml(pair.title)}</strong>
            <span>${escapeHtml(pair.x)} / ${escapeHtml(pair.y)}</span>
          </div>
          <div
            class="feature-pad"
            role="slider"
            tabindex="0"
            aria-label="${escapeHtml(pair.title)}"
            aria-valuetext="${escapeHtml(pair.x)} 0, ${escapeHtml(pair.y)} 0"
            data-x-feature="${escapeHtml(pair.x)}"
            data-y-feature="${escapeHtml(pair.y)}"
            data-x-value="0"
            data-y-value="0"
          >
            <span class="axis-label axis-top">${escapeHtml(pair.top)}</span>
            <span class="axis-label axis-right">${escapeHtml(pair.right)}</span>
            <span class="axis-label axis-bottom">${escapeHtml(pair.bottom)}</span>
            <span class="axis-label axis-left">${escapeHtml(pair.left)}</span>
            <span class="pad-cross horizontal"></span>
            <span class="pad-cross vertical"></span>
            <span class="pad-dot"></span>
          </div>
          <div class="pad-values">
            <span>${escapeHtml(pair.x)}: <output data-pad-x>0</output></span>
            <span>${escapeHtml(pair.y)}: <output data-pad-y>0</output></span>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".feature-pad").forEach((pad) => {
    const startDrag = (event) => {
      event.preventDefault();
      pad.setPointerCapture(event.pointerId);
      updatePadFromPointer(pad, event);
    };

    pad.addEventListener("pointerdown", startDrag);
    pad.addEventListener("pointermove", (event) => {
      if (pad.hasPointerCapture(event.pointerId)) {
        updatePadFromPointer(pad, event);
      }
    });
    pad.addEventListener("keydown", (event) => updatePadFromKeyboard(pad, event));
    updatePadPosition(pad, 0, 0);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundFeatureValue(value) {
  return Math.round(value * 10) / 10;
}

function updatePadFromPointer(pad, event) {
  const rect = pad.getBoundingClientRect();
  const xPercent = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const yPercent = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  const xValue = roundFeatureValue((xPercent * 2) - 1);
  const yValue = roundFeatureValue((yPercent * 2) - 1);
  updatePadPosition(pad, xValue, yValue);
}

function updatePadFromKeyboard(pad, event) {
  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"];
  if (!keys.includes(event.key)) {
    return;
  }

  event.preventDefault();
  let xValue = Number(pad.dataset.xValue);
  let yValue = Number(pad.dataset.yValue);

  if (event.key === "ArrowLeft") xValue -= 0.1;
  if (event.key === "ArrowRight") xValue += 0.1;
  if (event.key === "ArrowUp") yValue -= 0.1;
  if (event.key === "ArrowDown") yValue += 0.1;
  if (event.key === "Home") {
    xValue = 0;
    yValue = 0;
  }

  updatePadPosition(pad, roundFeatureValue(clamp(xValue, -1, 1)), roundFeatureValue(clamp(yValue, -1, 1)));
}

function updatePadPosition(pad, xValue, yValue) {
  pad.dataset.xValue = String(xValue);
  pad.dataset.yValue = String(yValue);
  pad.style.setProperty("--dot-x", `${((xValue + 1) / 2) * 100}%`);
  pad.style.setProperty("--dot-y", `${((yValue + 1) / 2) * 100}%`);
  pad.closest(".feature-pad-card").querySelector("[data-pad-x]").textContent = xValue;
  pad.closest(".feature-pad-card").querySelector("[data-pad-y]").textContent = yValue;
  pad.setAttribute("aria-valuetext", `${pad.dataset.xFeature} ${xValue}, ${pad.dataset.yFeature} ${yValue}`);
}

function renderCounts() {
  const characterCount = document.querySelector("#characterCount");
  const paintCount = document.querySelector("#paintCount");
  const carCount = document.querySelector("#carCount");

  if (characterCount) characterCount.textContent = data.characters.length;
  if (paintCount) paintCount.textContent = data.paints.length;
  if (carCount) carCount.textContent = data.cars.length;
}

function renderCharacters() {
  if (!characterGrid) {
    return;
  }

  characterGrid.innerHTML = data.characters
    .map((character, characterIndex) => {
      return `
        <article class="character-tile">
          <button class="portrait-button" type="button" data-character-index="${characterIndex}" aria-label="View ${escapeHtml(character.name)} settings">
            ${renderCharacterPortrait(character)}
          </button>
          <h3>${escapeHtml(character.name)}</h3>
          <p>${escapeHtml(character.role)}</p>
        </article>
      `;
    })
    .join("");
}

function renderCharacterDetails(character) {
  const features = character.features || {};
  const featureSummary = Object.entries(features)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ") || "All default / 0";

  return `
    <article class="character-card">
      <header>
        <div>
          <h3>${escapeHtml(character.name)}</h3>
          <p>${escapeHtml(character.role)}</p>
        </div>
        <p>${escapeHtml(character.model)}</p>
      </header>
      <div class="character-detail-top">
        ${renderCharacterPortrait(character)}
      </div>
      <div class="build-grid">
        ${renderBlock("Heritage", {
          Mother: character.mother,
          Father: character.father,
          Resemblance: `${character.resemblance}%`,
          "Skin mix": `${character.skinMix}%`
        })}
        ${renderBlock("Hair and Colour", {
          Hair: character.hairStyle,
          "Hair colour": character.hairColor,
          Highlight: character.highlightColor,
          Eyes: character.eyeColor,
          Eyebrows: character.eyebrows,
          "Facial hair": character.facialHair
        })}
        ${renderBlock("Overlays", {
          Blemishes: character.blemishes,
          Ageing: character.ageing,
          Makeup: character.makeup,
          "Blush / lipstick": character.blushLipstick,
          Freckles: character.freckles
        })}
        ${renderBlock("Face Features", {
          Settings: featureSummary
        })}
        ${renderBlock("Clothing", {
          Outfit: character.outfit
        })}
        ${renderBlock("Notes", {
          Voice: character.voice,
          Creation: character.creation
        })}
      </div>
    </article>
  `;
}

function renderCharacterPortrait(character) {
  const skin = getSkinColor(character.skinMix);
  const hair = colorFromText(character.hairColor || character.hairStyle, "#3b2418");
  const highlight = colorFromText(character.highlightColor, "#8b5a34");
  const eyes = colorFromText(character.eyeColor, "#5ea468");
  const lip = colorFromText(character.blushLipstick || character.makeup, "#b75d68");
  const feminine = String(character.model || "").includes("_f_");
  const hairPath = feminine
    ? "M78 86c2-34 23-54 50-54s48 20 50 54c-10-21-22-29-50-29S88 65 78 86z"
    : "M82 78c8-30 23-44 46-44s38 14 46 44c-16-13-30-18-46-18s-30 5-46 18z";
  const shoulder = feminine
    ? "M50 204c16-31 44-45 78-45s62 14 78 45v22H50z"
    : "M42 204c18-28 48-43 86-43s68 15 86 43v22H42z";

  return `
    <svg class="character-portrait" viewBox="0 0 256 300" role="img" aria-label="${escapeHtml(character.name)} preview">
      <defs>
        <linearGradient id="portrait-bg-${portraitId(character.name)}" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#182638"/>
          <stop offset="1" stop-color="#0e1318"/>
        </linearGradient>
      </defs>
      <rect width="256" height="300" rx="14" fill="url(#portrait-bg-${portraitId(character.name)})"/>
      <circle cx="128" cy="116" r="72" fill="rgba(255,255,255,0.05)"/>
      <path d="${shoulder}" fill="#273342"/>
      <path d="M94 156h68v40c0 17-15 29-34 29s-34-12-34-29z" fill="${skin}"/>
      <ellipse cx="128" cy="104" rx="54" ry="66" fill="${skin}"/>
      <path d="${hairPath}" fill="${hair}"/>
      <path d="M83 91c10-24 27-38 45-38 20 0 37 13 45 38-15-12-30-17-45-17s-30 5-45 17z" fill="${highlight}" opacity="0.55"/>
      <ellipse cx="107" cy="113" rx="8" ry="6" fill="#fff"/>
      <ellipse cx="149" cy="113" rx="8" ry="6" fill="#fff"/>
      <circle cx="107" cy="113" r="4" fill="${eyes}"/>
      <circle cx="149" cy="113" r="4" fill="${eyes}"/>
      <path d="M116 142c8 6 16 6 24 0" fill="none" stroke="${lip}" stroke-width="5" stroke-linecap="round"/>
      <path d="M98 98c12-7 22-7 31 0M157 98c-12-7-22-7-31 0" fill="none" stroke="${hair}" stroke-width="5" stroke-linecap="round"/>
      <path d="M128 112c-4 13-7 23-2 31" fill="none" stroke="rgba(86,53,38,0.4)" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `;
}

function portraitId(value) {
  return String(value || "character").replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

function getSkinColor(skinMix) {
  const amount = clamp(Number(skinMix || 50), 0, 100) / 100;
  const light = [229, 184, 145];
  const deep = [119, 72, 48];
  const rgb = light.map((channel, index) => Math.round(channel + (deep[index] - channel) * amount));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function colorFromText(value, fallback) {
  const text = String(value || "").toLowerCase();
  const swatches = [
    ["black", "#171311"], ["brown", "#4b2d1f"], ["blonde", "#d9b56f"], ["caramel", "#b8773d"],
    ["ginger", "#b7552d"], ["red", "#8f2633"], ["blue", "#3479d8"], ["green", "#4f9f68"],
    ["hazel", "#8b7a3c"], ["grey", "#9aa5aa"], ["gray", "#9aa5aa"], ["white", "#e8e4dc"],
    ["pink", "#d66b9c"], ["purple", "#7b4bc4"]
  ];
  const match = swatches.find(([name]) => text.includes(name));
  return match ? match[1] : fallback;
}

function renderBlock(title, rows) {
  return `
    <section class="build-block">
      <h4>${escapeHtml(title)}</h4>
      <dl>
        ${Object.entries(rows)
          .map(
            ([key, value]) => `
              <div>
                <dt>${escapeHtml(key)}</dt>
                <dd>${escapeHtml(value || "-")}</dd>
              </div>
            `
          )
          .join("")}
      </dl>
    </section>
  `;
}

function renderPaints() {
  if (!paintGrid) {
    return;
  }

  paintGrid.innerHTML = data.paints
    .map((paint, paintIndex) => {
      const rgb = `rgb(${paint.r}, ${paint.g}, ${paint.b})`;
      return `
        <article class="paint-card">
          <div class="paint-swatch" style="background:${rgb}"></div>
          <div class="paint-card-content">
            <h3>${escapeHtml(paint.name)}</h3>
            <p class="rgb-code">${rgb}</p>
            <p>${escapeHtml(paint.notes)}</p>
            <button class="danger-button" type="button" data-delete-paint="${paintIndex}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCategoryFilter() {
  if (!categoryFilter) {
    return;
  }

  const selected = categoryFilter.value || "all";
  const categories = [...new Set(data.cars.map((car) => car.category).filter(Boolean))].sort();
  categoryFilter.innerHTML = '<option value="all">All categories</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.append(option);
  });
  categoryFilter.value = categories.includes(selected) ? selected : "all";
}

function renderCars() {
  if (!carTable || !carSearch || !categoryFilter) {
    return;
  }

  const search = carSearch.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const cars = data.cars
    .map((car, index) => ({ ...car, originalIndex: index }))
    .filter((car) => {
    const searchable = `${car.name} ${car.price} ${car.store} ${car.category} ${car.notes}`.toLowerCase();
    const matchesSearch = !search || searchable.includes(search);
    const matchesCategory = category === "all" || car.category === category;
    return matchesSearch && matchesCategory;
  });

  carTable.innerHTML = cars
    .map(
      (car) => `
        <tr>
          <td><strong>${escapeHtml(car.name)}</strong></td>
          <td>${escapeHtml(car.price)}</td>
          <td>${escapeHtml(car.store)}</td>
          <td>${escapeHtml(car.category)}</td>
          <td>
            ${escapeHtml(car.notes)}
            <button class="danger-button table-delete" type="button" data-delete-car="${car.originalIndex}">Delete</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderAll() {
  renderCounts();
  renderCharacters();
  renderPaints();
  renderCategoryFilter();
  renderCars();
}

if (characterMakerForm) {
  characterMakerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(characterMakerForm);
    const character = {};
    const features = {};

    formData.forEach((value, key) => {
      character[key] = value;
    });

    document.querySelectorAll(".feature-pad").forEach((pad) => {
      features[pad.dataset.xFeature] = pad.dataset.xValue;
      features[pad.dataset.yFeature] = pad.dataset.yValue;
    });

    character.features = features;
    data.characters.unshift(character);
    saveData();
    characterMakerForm.reset();
    document.querySelectorAll(".feature-pad").forEach((pad) => updatePadPosition(pad, 0, 0));
    renderAll();

    if (saveCharacterStatus) {
      saveCharacterStatus.textContent = `${character.name || "Character"} saved.`;
    }
  });
}

const resetCharacterForm = document.querySelector("#resetCharacterForm");
if (resetCharacterForm && characterMakerForm) {
  resetCharacterForm.addEventListener("click", () => {
    characterMakerForm.reset();
    document.querySelectorAll(".feature-pad").forEach((pad) => updatePadPosition(pad, 0, 0));
    if (saveCharacterStatus) {
      saveCharacterStatus.textContent = "";
    }
  });
}

if (characterGrid && characterDetails && characterDetailsDialog) {
  characterGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-character-index]");
    if (!button) {
      return;
    }

    const character = data.characters[Number(button.dataset.characterIndex)];
    characterDetails.innerHTML = renderCharacterDetails(character);
    characterDetailsDialog.showModal();
  });
}

const closeCharacterDetails = document.querySelector("#closeCharacterDetails");
if (closeCharacterDetails && characterDetailsDialog) {
  closeCharacterDetails.addEventListener("click", () => {
    characterDetailsDialog.close();
  });
}

document.querySelectorAll("[data-open-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(`#${button.dataset.openDialog}`).showModal();
  });
});

document.querySelectorAll(".dialog-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (event.submitter?.value === "cancel") {
      return;
    }

    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());

    if (form.dataset.form === "paints") {
      data.paints.push({
        name: formData.name,
        r: Number(formData.r),
        g: Number(formData.g),
        b: Number(formData.b),
        notes: formData.notes
      });
    }

    if (form.dataset.form === "cars") {
      data.cars.push(formData);
    }

    saveData();
    form.reset();
    form.closest("dialog").close();
    renderAll();
  });
});

setupCharacterMaker();
if (notesBox) {
  notesBox.value = data.notes;
  notesBox.addEventListener("input", () => {
    data.notes = notesBox.value;
    saveData();
  });
}

if (carSearch) carSearch.addEventListener("input", renderCars);
if (categoryFilter) categoryFilter.addEventListener("change", renderCars);

if (paintGrid) {
  paintGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-paint]");
    if (!button) {
      return;
    }

    const index = Number(button.dataset.deletePaint);
    const paint = data.paints[index];
    if (window.confirm(`Delete paint code "${paint.name}"?`)) {
      data.paints.splice(index, 1);
      saveData();
      renderAll();
    }
  });
}

if (carTable) {
  carTable.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-car]");
    if (!button) {
      return;
    }

    const index = Number(button.dataset.deleteCar);
    const car = data.cars[index];
    if (window.confirm(`Delete vehicle "${car.name}"?`)) {
      data.cars.splice(index, 1);
      saveData();
      renderAll();
    }
  });
}

renderAll();
