const starterData = {
  characters: [
    {
      name: "Example Character",
      role: "Add their job, personality, or storyline here",
      hair: "Dark brown",
      eyes: "Green",
      creation: "Face shape, parents, skin tone, blemishes, makeup, overlays, and outfit notes."
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

const storageKey = "highlife-database-v1";
const data = loadData();

const characterGrid = document.querySelector("#characterGrid");
const paintGrid = document.querySelector("#paintGrid");
const carTable = document.querySelector("#carTable");
const carSearch = document.querySelector("#carSearch");
const categoryFilter = document.querySelector("#categoryFilter");
const notesBox = document.querySelector("#notesBox");

function loadData() {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : structuredClone(starterData);
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

function renderCounts() {
  document.querySelector("#characterCount").textContent = data.characters.length;
  document.querySelector("#paintCount").textContent = data.paints.length;
  document.querySelector("#carCount").textContent = data.cars.length;
}

function renderCharacters() {
  characterGrid.innerHTML = data.characters
    .map(
      (character) => `
        <article class="card">
          <h3>${escapeHtml(character.name)}</h3>
          <p>${escapeHtml(character.role)}</p>
          <div class="meta-list">
            <div><span>Hair:</span> ${escapeHtml(character.hair)}</div>
            <div><span>Eyes:</span> ${escapeHtml(character.eyes)}</div>
            <div><span>Creation:</span> ${escapeHtml(character.creation)}</div>
          </div>
        </article>
      `
    )
    .join("");
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

    if (form.dataset.form === "characters") {
      data.characters.push(formData);
    }

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

notesBox.value = data.notes;
notesBox.addEventListener("input", () => {
  data.notes = notesBox.value;
  saveData();
});

carSearch.addEventListener("input", renderCars);
categoryFilter.addEventListener("change", renderCars);

renderAll();
