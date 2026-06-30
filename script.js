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

  document.querySelector("#featureSliders").innerHTML = faceFeatures
    .map((feature) => {
      const id = feature.toLowerCase().replaceAll(" ", "-");
      return `
        <label>${escapeHtml(feature)} <output data-output-for="${escapeHtml(feature)}">0</output>
          <input id="${id}" name="feature:${escapeHtml(feature)}" type="range" min="-1" max="1" step="0.1" value="0" />
        </label>
      `;
    })
    .join("");

  characterMakerForm.querySelectorAll('input[type="range"]').forEach((range) => {
    const output = characterMakerForm.querySelector(`[data-output-for="${CSS.escape(range.name.replace("feature:", ""))}"]`)
      || characterMakerForm.querySelector(`[data-output-for="${CSS.escape(range.name)}"]`);
    const syncOutput = () => {
      if (output) {
        output.textContent = range.value;
      }
    };
    range.addEventListener("input", syncOutput);
    syncOutput();
  });
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
    .map((paint) => {
      const rgb = `rgb(${paint.r}, ${paint.g}, ${paint.b})`;
      return `
        <article class="paint-card">
          <div class="paint-swatch" style="background:${rgb}"></div>
          <div class="paint-card-content">
            <h3>${escapeHtml(paint.name)}</h3>
            <p class="rgb-code">${rgb}</p>
            <p>${escapeHtml(paint.notes)}</p>
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
  const cars = data.cars.filter((car) => {
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
          <td>${escapeHtml(car.notes)}</td>
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
    if (key.startsWith("feature:")) {
      features[key.replace("feature:", "")] = value;
    } else {
      character[key] = value;
    }
  });

  character.features = features;
  data.characters.unshift(character);
  saveData();
  characterMakerForm.reset();
  characterMakerForm.querySelectorAll('input[type="range"]').forEach((range) => {
    range.dispatchEvent(new Event("input"));
  });
  renderAll();
  document.querySelector("#characters").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#resetCharacterForm").addEventListener("click", () => {
  characterMakerForm.reset();
  characterMakerForm.querySelectorAll('input[type="range"]').forEach((range) => {
    range.dispatchEvent(new Event("input"));
  });
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

renderAll();
