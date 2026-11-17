const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_REQUEST_GAP_MS = 1100;

const form = document.querySelector("#distance-form");
const button = form.querySelector("button[type='submit']");
const statusMessage = document.querySelector("#status-message");
const resultPanel = document.querySelector("#result-panel");
const distanceValue = document.querySelector("#distance-value");
const mapLink = document.querySelector("#map-link");
const originName = document.querySelector("#origin-name");
const destinationName = document.querySelector("#destination-name");

const places = {
  origin: createPlaceField("origin"),
  destination: createPlaceField("destination"),
};

let lastRequestAt = 0;
let requestQueue = Promise.resolve();

function createPlaceField(id) {
  const input = document.querySelector(`#${id}`);
  const list = document.querySelector(`#${id}-suggestions`);
  const field = {
    input,
    list,
    selected: null,
    timer: null,
    controller: null,
  };

  input.addEventListener("input", () => {
    field.selected = null;
    closeSuggestions(field);
    clearTimeout(field.timer);
    field.controller?.abort();
    resultPanel.hidden = true;
    setStatus("");

    const query = input.value.trim();
    if (query.length < 2) return;

    field.timer = setTimeout(() => loadSuggestions(field, query), 550);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSuggestions(field);
    if (event.key === "Enter" && !list.hidden) {
      const firstOption = list.querySelector("button");
      if (firstOption) {
        event.preventDefault();
        firstOption.click();
      }
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => closeSuggestions(field), 150);
  });

  return field;
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function closeSuggestions(field) {
  field.list.hidden = true;
  field.input.setAttribute("aria-expanded", "false");
}

function openSuggestions(field) {
  field.list.hidden = false;
  field.input.setAttribute("aria-expanded", "true");
}

async function loadSuggestions(field, query) {
  const controller = new AbortController();
  field.controller = controller;

  try {
    const results = await searchPlaces(query, controller.signal);
    if (field.input.value.trim() !== query) return;
    renderSuggestions(field, results);
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus("장소를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }
}

async function searchPlaces(query, signal) {
  const search = async () => {
    const wait = Math.max(0, MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
    if (signal.aborted) throw new DOMException("Search canceled", "AbortError");

    lastRequestAt = Date.now();
    const url = new URL(NOMINATIM_URL);
    url.search = new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      limit: "5",
      "accept-language": "ko",
    });

    const response = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Place search failed: ${response.status}`);
    return response.json();
  };

  const result = requestQueue.then(search, search);
  requestQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function renderSuggestions(field, results) {
  field.list.replaceChildren();

  if (!results.length) {
    const empty = document.createElement("li");
    empty.className = "suggestion-option";
    empty.textContent = "검색 결과가 없어요. 다른 이름으로 검색해 보세요.";
    field.list.append(empty);
    openSuggestions(field);
    return;
  }

  for (const result of results) {
    const item = document.createElement("li");
    item.setAttribute("role", "option");
    const option = document.createElement("button");
    option.className = "suggestion-option";
    option.type = "button";
    option.append(
      createTextElement("span", "suggestion-title", result.name || result.display_name),
      createTextElement("span", "suggestion-detail", result.display_name),
    );
    option.addEventListener("mousedown", (event) => event.preventDefault());
    option.addEventListener("click", () => selectPlace(field, result));
    item.append(option);
    field.list.append(item);
  }

  openSuggestions(field);
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function selectPlace(field, result) {
  field.selected = {
    name: result.name || result.display_name,
    displayName: result.display_name,
    lat: Number(result.lat),
    lon: Number(result.lon),
  };
  field.input.value = field.selected.displayName;
  closeSuggestions(field);
  setStatus("");
}

function distanceInKilometers(start, end) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(end.lat - start.lat);
  const longitudeDelta = radians(end.lon - start.lon);
  const startLatitude = radians(start.lat);
  const endLatitude = radians(end.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(kilometers) {
  if (kilometers < 1) return (kilometers * 1000).toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  return kilometers.toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const start = places.origin.selected;
  const end = places.destination.selected;

  if (!start || !end) {
    setStatus("출발지와 도착지를 검색한 뒤, 목록에서 장소를 선택해 주세요.");
    (!start ? places.origin.input : places.destination.input).focus();
    return;
  }

  const kilometers = distanceInKilometers(start, end);
  const isUnderOneKilometer = kilometers < 1;
  distanceValue.textContent = formatDistance(kilometers);
  document.querySelector(".distance-unit").textContent = isUnderOneKilometer ? "m" : "km";
  originName.textContent = start.name;
  destinationName.textContent = end.name;
  mapLink.href = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(
    `${start.lat},${start.lon};${end.lat},${end.lon}`,
  )}`;
  resultPanel.hidden = false;
  setStatus("");
});
