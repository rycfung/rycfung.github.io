/** @format */

/**
 * General TODOs
 * - Extract Bart data-gathering logic into separate file
 * - Combine ETD functions as they're quite similar
 * - Add keyboard nav (e.g. left, right key)
 * - DRY up code
 *
 * TODOs re: carousel nav
 * - Consider disabling the button?
 * - (Nice to have) Show loading spinner
 * - Update currentStation to next station in stationsMappedByAbbr
 * - Use getETDsByStation() to update ETD for next station
 * - (Nice to have) Once data is fetched, remove loading spinner + show updated card
 */

/**
 * Local Dev / Testing - use VSCode Live Server
 */

// Public Bart API key
const bartAPI = {
  key: "MW9S-E7SL-26DU-VV8V",
  url: "https://api.bart.gov/api/",
};

var stationsList = [];

// Key stations by abbr
var stationsMappedByAbbr = {};

// Used to keep track of selected station
var currentStationAbbr = undefined;
var currentStationIndex = undefined;

/**
 * BART data-gathering + manipulating
 */
function getAllStations() {
  // https://api.bart.gov/docs/stn/stns.aspx
  const stationsPath = buildResourcePath("stns");
  return fetch(stationsPath)
    .then((response) => response.json())
    .then((json) => json.root.stations.station);
}

function getAllETDs() {
  const allETDPath = buildResourcePath("etd");
  return fetch(allETDPath)
    .then((response) => response.json())
    .then((json) => json.root.station);
}

/**
 * station [String] abbrev
 */
function getETDsByStation(station) {
  const ETDPath = buildResourcePath("etd", { station });
  return fetch(ETDPath)
    .then((response) => response.json())
    .then((json) => json.root.station[0].etd);
}

/**
 * Helper to build Bart resource path
 * @param command [String] @see http://api.bart.gov/docs for list of commands
 * @option station [String] station abbreviation or 'ALL' @see http://api.bart.gov/docs/overview/abbrev.aspx
 * @todo DRY up code (e.g. pass in keys vs hard-coding them in the switch)
 */
function buildResourcePath(command, options = {}) {
  var path = bartAPI.url;
  switch (command) {
    case "stns":
      path += "stn.aspx?cmd=" + command;
      break;
    case "etd":
      path += "etd.aspx?cmd=" + command + "&orig=" + (options.station || "ALL");
      break;
  }
  path += "&key=" + bartAPI.key + "&json=y";
  return path;
}

/**
 * Helper to get all station-related data needed and set it up for card carousel display
 */
function setup() {
  // Get all stations
  getAllStations()
    .then((stationList) => {
      console.log("Populating stations map...");
      stationList.forEach((station) => {
        stationsMappedByAbbr[station.abbr] = {
          ...station,
        };
      });
      console.log("Done population stations map");
      return;
    })
    .then(() => {
      return getAllETDs();
    })
    .then((stationList) => {
      console.log("Adding ETD data...");
      stationList.forEach((station) => {
        stationsMappedByAbbr[station.abbr] = {
          ...stationsMappedByAbbr[station.abbr],
          nextArrivals: station.etd,
        };
      });
      console.log("Done adding ETD data");

      stationsList = Object.values(stationsMappedByAbbr);

      // Default current station shown to first one returned from API
      currentStationAbbr = stationList[0].abbr;
      currentStationIndex = 0;

      return;
    })
    .then(() => updateDisplay());
}

/**
 * @param id [String | Number]
 */
function selectStation(id) {
  // Remove selected class from current station button (should only ever have one selected)
  var selectedStationEl = document.getElementsByClassName("selected")[0];
  selectedStationEl.classList.remove("selected");

  // Update current station pointers
  currentStationIndex = parseInt(id);
  let station = stationsList[currentStationIndex];
  currentStationAbbr = station.abbr;

  // Update card
  populateCarouselCard(station);

  // Add selected class to newly selected station
  var newlySelectedEl = document.getElementById("" + currentStationIndex);
  newlySelectedEl.classList.add("selected");
}

/**
 * @param station [object]
 */
function populateCarouselCard(station) {
  var abbrEl = document.querySelector("#station-abbreviation");
  abbrEl.innerHTML = "<h3>" + station.abbr + "</h3>";
  var nameEl = document.querySelector("#station-name");
  nameEl.innerHTML = station.name;
  var addressEl = document.querySelector("#station-address");
  addressEl.innerHTML = station.address;
  var nextArrivalsEl = document.querySelector("#station-next-arrivals");
  var nextArrivalsInnerHTML = "";
  var nextArrivals = station.nextArrivals;
  nextArrivals.forEach((arrival, index) => {
    nextArrivalsInnerHTML += "<strong>" + arrival.abbreviation + "</strong>";
    // Only showing the nearest arrival for a given destination
    nextArrivalsInnerHTML += " (" + arrival.estimate[0].direction + ")";
    nextArrivalsInnerHTML += " - " + arrival.estimate[0].minutes + " minute(s)";
    if (index != nextArrivals.length - 1) {
      nextArrivalsInnerHTML += "<br>";
    }
  });
  nextArrivalsEl.innerHTML = nextArrivalsInnerHTML;
}

function populateStationsList() {
  var stationsListEl = document.querySelector("#stations-list");
  var stationsListInnerHTML = "";
  stationsList.forEach((station, index) => {
    stationsListInnerHTML += '<button id="' + index;
    if (index === currentStationIndex) {
      stationsListInnerHTML += '" class="button selected">';
    } else {
      stationsListInnerHTML += '" class="button">';
    }
    stationsListInnerHTML += station.abbr + "</button>";
    stationsListEl.innerHTML = stationsListInnerHTML;
  });
}

function updateDisplay() {
  console.log(stationsMappedByAbbr);
  populateCarouselCard(stationsList[currentStationIndex]);
  populateStationsList();
  // Set time
  const today = new Date();
  document.querySelector("#base-time").innerHTML =
    "Last calculated at " + today.toString();
}

const previousEl = document.getElementById("previous");
const nextEl = document.getElementById("next");
const stationsListEl = document.getElementById("stations-list");

previousEl.addEventListener("click", function () {
  if (currentStationIndex === 0) return;
  console.log("Go to previous card");
  currentStationIndex--;
  selectStation(currentStationIndex);
});

nextEl.addEventListener("click", function () {
  if (currentStationIndex === stationsList.length - 1) return;
  console.log("Go to next card");
  currentStationIndex++;
  selectStation(currentStationIndex);
});

stationsListEl.addEventListener("click", function (event) {
  selectStation(event.target.id);
});

setup();
