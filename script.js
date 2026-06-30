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
const paintGrid = document.querySelector("#paintGrid");
const carTable = document.querySelector("#carTable");
const carSearch = document.querySelector("#carSearch");
const categoryFilter = document.querySelector("#categoryFilter");
const notesBox = document.querySelector("#notesBox");
const characterMakerForm = document.querySelector("#characterMakerForm");

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
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
}

function setupCharacterMaker() {
  populateSelect(document.querySelector("#motherSelect"), mothers);
  populateSelect(document.querySelector("#fatherSelect"), fathers);

  document.querySelector("#featurePads").innerHTML = featurePairs
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
  document.querySelector("#characterCount").textContent = data.characters.length;
  document.querySelector("#paintCount").textContent = data.paints.length;
  document.querySelector("#carCount").textContent = data.cars.length;
}

function renderCharacters() {
  characterGrid.innerHTML = data.characters
    .map((character) => {
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
    })
    .join("");
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
  document.querySelector("#characters").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#resetCharacterForm").addEventListener("click", () => {
  characterMakerForm.reset();
  document.querySelectorAll(".feature-pad").forEach((pad) => updatePadPosition(pad, 0, 0));
});

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
notesBox.value = data.notes;
notesBox.addEventListener("input", () => {
  data.notes = notesBox.value;
  saveData();
});

carSearch.addEventListener("input", renderCars);
categoryFilter.addEventListener("change", renderCars);

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

renderAll();
