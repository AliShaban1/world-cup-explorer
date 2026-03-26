const HOST_COUNTRY_INFO = {
    "Uruguay":       { id: "858", lat: -34.9, lon: -56.2 },
    "Italy":         { id: "380", lat: 42.5,  lon: 12.5 },
    "France":        { id: "250", lat: 46.6,  lon: 2.3 },
    "Brazil":        { id: "076", lat: -14.2, lon: -51.9 },
    "Switzerland":   { id: "756", lat: 46.8,  lon: 8.2 },
    "Sweden":        { id: "752", lat: 62.0,  lon: 15.0 },
    "Chile":         { id: "152", lat: -35.7, lon: -71.5 },
    "England":       { id: "826", lat: 52.4,  lon: -1.5 },
    "Mexico":        { id: "484", lat: 23.6,  lon: -102.5 },
    "West Germany":  { id: "276", lat: 51.2,  lon: 10.4 },
    "Germany":       { id: "276", lat: 51.2,  lon: 10.4 },
    "Argentina":     { id: "032", lat: -38.4, lon: -63.6 },
    "Spain":         { id: "724", lat: 40.5,  lon: -3.7 },
    "United States": { id: "840", lat: 39.8,  lon: -98.6 },
    "South Africa":  { id: "710", lat: -30.6, lon: 22.9 },
    "Russia":        { id: "643", lat: 55.8,  lon: 37.6 },
    "Qatar":         { id: "634", lat: 25.3,  lon: 51.2 },
    "South Korea":   { id: "410", lat: 36.5,  lon: 127.8 },
    "Japan":         { id: "392", lat: 36.2,  lon: 138.3 },
};

function getEraColor(year) {
    const y = +year;
    if (y <= 1950) return "#7a3b10";
    if (y <= 1970) return "#b86820";
    if (y <= 1990) return "#e8a838";
    if (y <= 2006) return "#f0c040";
    return "#ffe566";
}

let globalData;

function getHostCountryIds(t) {
    const ids = [];
    if (t.host_country.includes("Korea")) {
        ids.push(HOST_COUNTRY_INFO["South Korea"].id);
        ids.push(HOST_COUNTRY_INFO["Japan"].id);
    } else {
        const info = HOST_COUNTRY_INFO[t.host_country];
        if (info) ids.push(info.id);
    }
    return ids;
}

function initMap(data) {
    const width = 1100;
    const height = 620;
    globalData = data;

    const svg = d3.select("#map-container")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g");

    const projection = d3.geoNaturalEarth1()
        .scale(190)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);
    const countries = topojson.feature(data.world, data.world.objects.countries);

    const hostIds = new Set();
    data.tournaments.forEach(t => {
        getHostCountryIds(t).forEach(id => hostIds.add(id));
    });

    const hostTournaments = {};
    data.tournaments.forEach(t => {
        getHostCountryIds(t).forEach(id => {
            (hostTournaments[id] = hostTournaments[id] || []).push(t);
        });
    });

    const hostLatestYear = {};
    data.tournaments.forEach(t => {
        getHostCountryIds(t).forEach(id => {
            if (!hostLatestYear[id] || +t.year > hostLatestYear[id]) {
                hostLatestYear[id] = +t.year;
            }
        });
    });

    const countryPaths = g.selectAll("path.country")
        .data(countries.features)
        .join("path")
        .attr("class", d => `country${hostIds.has(String(d.id)) ? " host" : ""}`)
        .attr("d", path)
        .style("fill", d => {
            const id = String(d.id);
            if (hostLatestYear[id]) return getEraColor(hostLatestYear[id]);
            return null;
        });

    countryPaths.filter(d => hostIds.has(String(d.id)))
        .on("mouseover", function(event, d) {
            const tournaments = hostTournaments[String(d.id)];
            if (!tournaments) return;
            const hostName = tournaments[0].host_country.includes("Korea")
                ? "South Korea & Japan" : tournaments[0].host_country;
            let html = `<strong>${hostName}</strong><br>`;
            tournaments.forEach(t => {
                const tm = data.matches.filter(m => m.tournament_id === t.tournament_id);
                const tg = data.goals.filter(gl => gl.tournament_id === t.tournament_id);
                html += `<div style="margin-top:4px">` +
                    `<strong style="color:${getEraColor(t.year)}">${t.year}</strong> · ` +
                    `Winner: ${t.winner}<br>` +
                    `<span style="color:var(--text-secondary)">Teams: ${t.count_teams} · Matches: ${tm.length} · Goals: ${tg.length}</span></div>`;
            });
            d3.select("#tooltip").style("display", "block").html(html);
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip")
                .style("left", (event.clientX + 15) + "px")
                .style("top", (event.clientY - 10) + "px");
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("display", "none");
        })
        .on("click", function(event, d) {
            d3.select("#tooltip").style("display", "none");
            const tournaments = hostTournaments[String(d.id)];
            if (!tournaments) return;
            navigateToCountry(tournaments, data);
        });

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            const { transform } = event;
            const k = transform.k;
            g.attr("transform", transform);

            g.selectAll("path.country:not(.highlighted)")
                .style("stroke-width", (0.5 / k) + "px");
        });

    svg.call(zoom);

    svg.on("dblclick.zoom", null);
    svg.on("dblclick", () => {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });

    setupTimeline(data, g);
}

function setupTimeline(data, g) {
    d3.select("#timeline").selectAll("button.timeline-btn")
        .data(data.tournaments)
        .join("button")
        .attr("class", "timeline-btn")
        .text(d => d.year)
        .style("border-left", d => `3px solid ${getEraColor(d.year)}`)
        .on("click", (event, d) => navigateToDashboard(d.tournament_id, data))
        .on("mouseover", function(event, d) {
            d3.select("#tooltip")
                .style("display", "block")
                .style("left", (event.clientX + 10) + "px")
                .style("top", (event.clientY - 40) + "px")
                .html(`<strong>${d.year}</strong> · ${d.host_country}<br>Winner: ${d.winner}`);

            const ids = new Set(getHostCountryIds(d).map(String));
            g.selectAll("path.country.host")
                .classed("highlighted", f => ids.has(String(f.id)));
        })
        .on("mouseout", () => {
            d3.select("#tooltip").style("display", "none");
            g.selectAll("path.country.host").classed("highlighted", false);
        });
}

function navigateToCountry(tournaments, data) {
    d3.select("#map-view").classed("hidden", true);
    d3.select("#country-view").classed("hidden", false);
    d3.select("#tooltip").style("display", "none");
    window.scrollTo(0, 0);

    const firstTournament = tournaments[0];
    const hostName = firstTournament.host_country.includes("Korea")
        ? "South Korea & Japan" : firstTournament.host_country;

    renderZoomedMapTo("#country-zoomed-map", firstTournament, data);

    d3.select("#country-header").html(`
        <div class="country-title">${hostName}</div>
        <div class="country-subtitle">Hosted ${tournaments.length} World Cup${tournaments.length > 1 ? "s" : ""}</div>
    `);

    const cards = d3.select("#tournament-cards");
    cards.html("");

    tournaments.forEach(t => {
        const tm = data.matches.filter(m => m.tournament_id === t.tournament_id);
        const tg = data.goals.filter(gl => gl.tournament_id === t.tournament_id);

        const card = cards.append("div")
            .attr("class", "tournament-card")
            .on("click", () => {
                d3.select("#country-view").classed("hidden", true);
                navigateToDashboard(t.tournament_id, data);
            });

        card.html(`
            <div class="tc-year">${t.year}</div>
            <div class="tc-details">
                <div class="tc-winner">Winner: <strong>${t.winner}</strong></div>
                <div class="tc-stats">${t.count_teams} teams · ${tm.length} matches · ${tg.length} goals</div>
            </div>
            <div class="tc-arrow">→</div>
        `);
    });

    d3.select("#country-back-btn").on("click", () => {
        d3.select("#country-view").classed("hidden", true);
        d3.select("#map-view").classed("hidden", false);
    });
}

function navigateToDashboard(tournamentId, data) {
    const tournament = data.tournaments.find(t => t.tournament_id === tournamentId);
    if (!tournament) return;

    d3.select("#map-view").classed("hidden", true);
    d3.select("#dashboard-view").classed("hidden", false);
    d3.select("#tooltip").style("display", "none");
    window.scrollTo(0, 0);

    d3.select("#dashboard-nav").classed("visible", false);
    d3.select("#tournament-header").classed("visible", false);
    d3.select("#dashboard-grid").classed("visible", false);

    setTimeout(() => d3.select("#dashboard-nav").classed("visible", true), 100);
    setTimeout(() => d3.select("#tournament-header").classed("visible", true), 200);
    setTimeout(() => d3.select("#dashboard-grid").classed("visible", true), 300);

    showDashboard(tournamentId, data);
}

// renderes the zoomed in map for the country page
function renderZoomedMapTo(containerSelector, tournament, data) {
    const container = d3.select(containerSelector);
    container.html("");

    const width = 1200;
    const height = 400;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const countries = topojson.feature(data.world, data.world.objects.countries);

    const hostIds = new Set();
    const info = HOST_COUNTRY_INFO[tournament.host_country];
    if (info) hostIds.add(info.id);
    if (tournament.host_country.includes("Korea")) {
        hostIds.add(HOST_COUNTRY_INFO["South Korea"].id);
        hostIds.add(HOST_COUNTRY_INFO["Japan"].id);
    }

    const hostFeatures = countries.features.filter(f => hostIds.has(String(f.id)));
    const hostCollection = { type: "FeatureCollection", features: hostFeatures };

    const startProjection = d3.geoNaturalEarth1()
        .scale(140).center([0, 20]).translate([width / 2, height / 2]);

    const padding = 80;
    const endProjection = d3.geoNaturalEarth1()
        .fitExtent([[padding, padding], [width - padding, height - padding]], hostCollection);

    const startPath = d3.geoPath().projection(startProjection);
    const endPath = d3.geoPath().projection(endProjection);

    svg.selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("class", d => `zoomed-country${hostIds.has(String(d.id)) ? " target" : ""}`)
        .attr("d", d => startPath(d));

    svg.selectAll("path")
        .transition().duration(900).ease(d3.easeCubicInOut)
        .attr("d", d => endPath(d));

    const hostName = tournament.host_country.includes("Korea") ? "South Korea & Japan" : tournament.host_country;
    const centroid = d3.geoCentroid(hostCollection);
    const [cx, cy] = endProjection(centroid);

    const hostBounds = endPath.bounds(hostCollection);
    const hostSize = Math.min(hostBounds[1][0] - hostBounds[0][0], hostBounds[1][1] - hostBounds[0][1]);
    const fontSize = Math.max(8, Math.min(18, hostSize * 0.08));

    svg.append("text")
        .attr("class", "zoomed-country-label")
        .attr("x", cx).attr("y", cy)
        .attr("font-size", fontSize + "px")
        .text(hostName)
        .style("opacity", 0)
        .transition().delay(700).duration(400).style("opacity", 0.5);
}

function goBackToMap() {
    d3.select("#dashboard-view").classed("hidden", true);
    d3.select("#country-view").classed("hidden", true);
    d3.select("#map-view").classed("hidden", false);
}
