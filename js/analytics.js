function initAnalytics(data) {
    renderGoalsTrend(data);
    renderAllTimeDominance(data);
    renderIntensityTrend(data);
    renderContinentalAdvantage(data);
}

function renderGoalsTrend(data) {
    const container = d3.select("#goals-trend-chart");
    container.html("");

    const stats = data.tournaments.map(t => {
        const tm = data.matches.filter(m => m.tournament_id === t.tournament_id);
        const tg = data.goals.filter(g => g.tournament_id === t.tournament_id);
        return {
            year: +t.year,
            gpm: tm.length > 0 ? tg.length / tm.length : 0,
            totalGoals: tg.length,
            totalMatches: tm.length
        };
    });

    const width = 900, height = 260;
    const margin = { top: 20, right: 20, bottom: 35, left: 45 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain(d3.extent(stats, d => d.year)).range([0, w]);
    const y = d3.scaleLinear().domain([0, d3.max(stats, d => d.gpm) * 1.15]).range([h, 0]);

    g.append("g").attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickValues(stats.filter((_, i) => i % 4 === 0).map(d => d.year)).tickFormat(d3.format("d")))
        .attr("class", "analytics-axis");

    g.append("g")
        .call(d3.axisLeft(y).ticks(4).tickFormat(d => d.toFixed(1)))
        .attr("class", "analytics-axis");

    const avgGpm = d3.mean(stats, d => d.gpm);
    g.append("line")
        .attr("x1", 0).attr("x2", w)
        .attr("y1", y(avgGpm)).attr("y2", y(avgGpm))
        .attr("class", "analytics-avg-line");

    g.append("text")
        .attr("x", w).attr("y", y(avgGpm) - 5)
        .attr("class", "analytics-avg-label")
        .text(`avg ${avgGpm.toFixed(2)}`);

    const area = d3.area()
        .x(d => x(d.year))
        .y0(h)
        .y1(d => y(d.gpm))
        .curve(d3.curveMonotoneX);

    g.append("path")
        .datum(stats)
        .attr("class", "analytics-area")
        .attr("d", area);

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.gpm))
        .curve(d3.curveMonotoneX);

    const trendPath = g.append("path")
        .datum(stats)
        .attr("class", "analytics-line")
        .attr("d", line);

    const totalLength = trendPath.node().getTotalLength();
    trendPath.attr("stroke-dasharray", totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition().duration(1500).ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

    g.selectAll("circle")
        .data(stats)
        .join("circle")
        .attr("class", "analytics-dot")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.gpm))
        .attr("r", 5)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 8);
            d3.select("#tooltip").style("display", "block")
                .style("left", (event.clientX + 12) + "px")
                .style("top", (event.clientY - 10) + "px")
                .html(`<strong>${d.year}</strong><br>${d.gpm.toFixed(2)} goals/match<br><span style="color:var(--text-muted)">${d.totalGoals} goals in ${d.totalMatches} matches</span>`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 5);
            d3.select("#tooltip").style("display", "none");
        });
}

function renderAllTimeDominance(data) {
    const container = d3.select("#all-time-chart");
    container.html("");

    const teamStats = {};
    data.tournaments.forEach(t => {
        const w = t.winner;
        if (!teamStats[w]) teamStats[w] = { titles: 0, appearances: 0 };
        teamStats[w].titles++;
    });

    const appearanceCounts = d3.rollup(
        data.qualifiedTeams,
        v => new Set(v.map(d => d.tournament_id)).size,
        d => d.team_name
    );
    appearanceCounts.forEach((count, team) => {
        if (!teamStats[team]) teamStats[team] = { titles: 0, appearances: 0 };
        teamStats[team].appearances = count;
    });

    let ranked = Object.entries(teamStats)
        .map(([team, s]) => ({ team, ...s }))
        .filter(d => d.titles > 0 || d.appearances >= 10)
        .sort((a, b) => b.titles - a.titles || b.appearances - a.appearances)
        .slice(0, 10);

    const width = 900, height = 300;
    const margin = { top: 15, right: 70, bottom: 10, left: 110 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const maxTitles = d3.max(ranked, d => d.titles);
    const starSpace = maxTitles * 16 + 15;

    const yBand = d3.scaleBand().domain(ranked.map(d => d.team)).range([0, h]).padding(0.2);
    const xScale = d3.scaleLinear().domain([0, d3.max(ranked, d => d.appearances)]).range([0, w - starSpace]);

    g.selectAll("text.at-label")
        .data(ranked).join("text")
        .attr("class", "at-label")
        .attr("x", -6)
        .attr("y", d => yBand(d.team) + yBand.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => d.team);

    g.selectAll("rect.at-bar-appearances")
        .data(ranked).join("rect")
        .attr("class", "at-bar-appearances")
        .attr("x", 0).attr("y", d => yBand(d.team))
        .attr("height", yBand.bandwidth()).attr("rx", 3)
        .attr("width", 0)
        .transition().delay((d, i) => i * 60).duration(600)
        .attr("width", d => xScale(d.appearances));

    const starsX = w - starSpace + 10;
    g.selectAll("text.at-titles")
        .data(ranked.filter(d => d.titles > 0)).join("text")
        .attr("class", "at-titles")
        .attr("x", starsX)
        .attr("y", d => yBand(d.team) + yBand.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => "★".repeat(d.titles))
        .style("opacity", 0)
        .transition().delay((d, i) => i * 60 + 400).duration(400)
        .style("opacity", 1);

    g.selectAll("rect.at-bar-appearances")
        .on("mouseover", function(event, d) {
            d3.select("#tooltip").style("display", "block")
                .style("left", (event.clientX + 12) + "px")
                .style("top", (event.clientY - 10) + "px")
                .html(`<strong>${d.team}</strong><br>
                    <span style="color:var(--warm-gold)">${d.titles} title${d.titles !== 1 ? "s" : ""}</span><br>
                    ${d.appearances} tournament appearances`);
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("display", "none");
        });
}

function renderIntensityTrend(data) {
    const container = d3.select("#intensity-chart");
    container.html("");

    const bookings = data.bookings || [];

    const cardStats = data.tournaments.map(t => {
        const tm = data.matches.filter(m => m.tournament_id === t.tournament_id);
        const tb = bookings.filter(b => b.tournament_id === t.tournament_id);
        const n = tm.length;
        const yellows = tb.filter(b => b.yellow_card === "1").length;
        const reds = tb.filter(b => b.red_card === "1" || b.second_yellow_card === "1" || b.sending_off === "1").length;
        return {
            year: +t.year,
            yellowsPerMatch: n > 0 ? yellows / n : 0,
            redsPerMatch: n > 0 ? reds / n : 0,
            totalPerMatch: n > 0 ? (yellows + reds) / n : 0,
            yellows, reds, matches: n,
            hasCards: yellows + reds > 0
        };
    }).filter(d => d.hasCards);

    if (cardStats.length === 0) return;

    const width = 900, height = 280;
    const margin = { top: 20, right: 20, bottom: 35, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(cardStats, d => d.year))
        .range([0, w]);

    const maxY = d3.max(cardStats, d => d.totalPerMatch) * 1.15;
    const yScale = d3.scaleLinear().domain([0, maxY]).range([h, 0]);

    g.append("g").attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickValues(cardStats.map(d => d.year)).tickFormat(d3.format("d")))
        .attr("class", "analytics-axis")
        .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");

    g.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d.toFixed(1)))
        .attr("class", "analytics-axis");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -h / 2).attr("y", -35)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-muted)")
        .attr("font-size", "11px")
        .text("cards per match");

    const areaYellow = d3.area()
        .x(d => x(d.year))
        .y0(h)
        .y1(d => yScale(d.yellowsPerMatch))
        .curve(d3.curveMonotoneX);

    const areaRed = d3.area()
        .x(d => x(d.year))
        .y0(d => yScale(d.yellowsPerMatch))
        .y1(d => yScale(d.totalPerMatch))
        .curve(d3.curveMonotoneX);

    const gradY = svg.append("defs").append("linearGradient")
        .attr("id", "yellow-grad").attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
    gradY.append("stop").attr("offset", "0%").attr("stop-color", "#e8c430").attr("stop-opacity", 0.8);
    gradY.append("stop").attr("offset", "100%").attr("stop-color", "#e8c430").attr("stop-opacity", 0.15);

    const gradR = svg.select("defs").append("linearGradient")
        .attr("id", "red-grad").attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
    gradR.append("stop").attr("offset", "0%").attr("stop-color", "#d94f4f").attr("stop-opacity", 0.85);
    gradR.append("stop").attr("offset", "100%").attr("stop-color", "#d94f4f").attr("stop-opacity", 0.3);

    g.append("path").datum(cardStats)
        .attr("d", areaYellow)
        .attr("fill", "url(#yellow-grad)");

    g.append("path").datum(cardStats)
        .attr("d", areaRed)
        .attr("fill", "url(#red-grad)");

    const totalLine = d3.line()
        .x(d => x(d.year))
        .y(d => yScale(d.totalPerMatch))
        .curve(d3.curveMonotoneX);

    g.append("path").datum(cardStats)
        .attr("d", totalLine)
        .attr("fill", "none")
        .attr("stroke", "#d94f4f")
        .attr("stroke-width", 2);

    const yellowLine = d3.line()
        .x(d => x(d.year))
        .y(d => yScale(d.yellowsPerMatch))
        .curve(d3.curveMonotoneX);

    g.append("path").datum(cardStats)
        .attr("d", yellowLine)
        .attr("fill", "none")
        .attr("stroke", "#e8c430")
        .attr("stroke-width", 2);

    g.selectAll(".hover-dot")
        .data(cardStats)
        .join("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => yScale(d.totalPerMatch))
        .attr("r", 14)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select("#tooltip").style("display", "block")
                .style("left", (event.clientX + 12) + "px")
                .style("top", (event.clientY - 10) + "px")
                .html(`<strong>${d.year}</strong> · ${d.matches} matches<br>
                    <span style="color:#e8c430">\u25A0 Yellow:</span> ${d.yellows} (${d.yellowsPerMatch.toFixed(1)}/m)<br>
                    <span style="color:#d94f4f">\u25A0 Red:</span> ${d.reds} (${d.redsPerMatch.toFixed(2)}/m)<br>
                    <strong>Total: ${d.totalPerMatch.toFixed(1)} cards/match</strong>`);
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("display", "none");
        });

    g.selectAll(".total-dot")
        .data(cardStats)
        .join("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => yScale(d.totalPerMatch))
        .attr("r", 3.5)
        .attr("fill", "#d94f4f")
        .attr("stroke", "var(--bg-dark)")
        .attr("stroke-width", 1.5)
        .style("pointer-events", "none");

    const peak = cardStats.reduce((max, d) => d.totalPerMatch > max.totalPerMatch ? d : max, cardStats[0]);
    if (peak) {
        const peakX = x(peak.year);
        const peakY = yScale(peak.totalPerMatch);
        g.append("line")
            .attr("x1", peakX).attr("x2", peakX)
            .attr("y1", peakY - 5).attr("y2", peakY - 22)
            .attr("stroke", "var(--text-secondary)")
            .attr("stroke-width", 1);
        g.append("text")
            .attr("x", peakX).attr("y", peakY - 26)
            .attr("text-anchor", "middle")
            .attr("fill", "var(--warm-red)")
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .text(`Peak: ${peak.totalPerMatch.toFixed(1)}/match`);
    }

    const legend = container.append("div").style("display", "flex").style("gap", "16px")
        .style("font-size", "0.7rem").style("color", "var(--text-secondary)").style("margin-top", "6px")
        .style("justify-content", "center");
    legend.html(
        `<span><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#e8c430;vertical-align:middle;margin-right:4px"></span> Yellow cards/match</span>` +
        `<span><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#d94f4f;vertical-align:middle;margin-right:4px"></span> Red cards/match</span>`
    );
}

// handles the sankey flow for continental advantage
function renderContinentalAdvantage(data) {
    const container = d3.select("#continental-chart");
    container.html("");

    const saTeams = ["Uruguay", "Argentina", "Brazil", "Paraguay", "Colombia", "Chile", "Peru", "Ecuador", "Bolivia", "Venezuela"];
    const saHosts = ["Uruguay", "Brazil", "Argentina", "Chile", "Colombia", "Mexico"];
    const euHosts = ["Italy", "France", "Switzerland", "Sweden", "England", "West Germany", "Germany", "Spain", "Russia"];

    const results = data.tournaments.map(t => {
        const hc = t.host_country;
        const winner = t.winner;
        const winnerIsSa = saTeams.includes(winner);
        let hostCont = "Other";
        if (saHosts.includes(hc)) hostCont = "Americas";
        else if (euHosts.includes(hc)) hostCont = "Europe";
        const winnerCont = winnerIsSa ? "S. America" : "Europe";
        return { year: +t.year, host: hc, winner, hostCont, winnerCont };
    });

    const flowCounts = {};
    results.forEach(d => {
        const key = `${d.hostCont}→${d.winnerCont}`;
        flowCounts[key] = (flowCounts[key] || 0) + 1;
    });

    const width = 900, height = 260;
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block")
        .style("margin", "0 auto");

    const leftX = 230, rightX = 640;
    const nodeW = 18;
    const totalH = 200;
    const topPad = 35;

    const leftNodes = [
        { id: "Americas", label: "Hosted in Americas", count: results.filter(d => d.hostCont === "Americas").length },
        { id: "Europe", label: "Hosted in Europe", count: results.filter(d => d.hostCont === "Europe").length },
        { id: "Other", label: "Hosted elsewhere", count: results.filter(d => d.hostCont === "Other").length }
    ].filter(n => n.count > 0);

    const rightNodes = [
        { id: "S. America", label: "S. American winner", color: "#5fd89a", count: results.filter(d => d.winnerCont === "S. America").length },
        { id: "Europe", label: "European winner", color: "#e8a838", count: results.filter(d => d.winnerCont === "Europe").length }
    ];

    const totalTournaments = results.length;
    const nodeGap = 12;

    function positionNodes(nodes) {
        const usableH = totalH - nodeGap * (nodes.length - 1);
        let yPos = topPad;
        nodes.forEach(n => {
            n.h = (n.count / totalTournaments) * usableH;
            n.y = yPos;
            yPos += n.h + nodeGap;
        });
    }
    positionNodes(leftNodes);
    positionNodes(rightNodes);

    const flowData = [];
    const leftOffsets = {};
    const rightOffsets = {};
    leftNodes.forEach(n => { leftOffsets[n.id] = 0; });
    rightNodes.forEach(n => { rightOffsets[n.id] = 0; });

    const flowOrder = [
        { from: "Americas", to: "S. America" },
        { from: "Europe", to: "Europe" },
        { from: "Americas", to: "Europe" },
        { from: "Europe", to: "S. America" },
        { from: "Other", to: "S. America" },
        { from: "Other", to: "Europe" }
    ];

    flowOrder.forEach(({ from, to }) => {
        const key = `${from}→${to}`;
        const count = flowCounts[key] || 0;
        if (count === 0) return;

        const leftNode = leftNodes.find(n => n.id === from);
        const rightNode = rightNodes.find(n => n.id === to);
        if (!leftNode || !rightNode) return;

        const usableHL = totalH - nodeGap * (leftNodes.length - 1);
        const usableHR = totalH - nodeGap * (rightNodes.length - 1);
        const flowHL = (count / totalTournaments) * usableHL;
        const flowHR = (count / totalTournaments) * usableHR;

        const y0Top = leftNode.y + leftOffsets[from];
        const y0Bot = y0Top + flowHL;
        const y1Top = rightNode.y + rightOffsets[to];
        const y1Bot = y1Top + flowHR;

        leftOffsets[from] += flowHL;
        rightOffsets[to] += flowHR;

        const isSame = (from === "Americas" && to === "S. America") || (from === "Europe" && to === "Europe");
        const color = rightNode.color;
        const pct = Math.round((count / leftNode.count) * 100);

        flowData.push({ from, to, count, y0Top, y0Bot, y1Top, y1Bot, color, isSame, pct, fromCount: leftNode.count });
    });

    const x0 = leftX + nodeW;
    const x1 = rightX;
    const cp1 = x0 + (x1 - x0) * 0.4;
    const cp2 = x0 + (x1 - x0) * 0.6;

    flowData.forEach(f => {
        const p = `M${x0},${f.y0Top}
            C${cp1},${f.y0Top} ${cp2},${f.y1Top} ${x1},${f.y1Top}
            L${x1},${f.y1Bot}
            C${cp2},${f.y1Bot} ${cp1},${f.y0Bot} ${x0},${f.y0Bot}
            Z`;

        svg.append("path")
            .attr("d", p)
            .attr("fill", f.color)
            .attr("opacity", f.isSame ? 0.45 : 0.15)
            .attr("stroke", f.color)
            .attr("stroke-width", f.isSame ? 0 : 1)
            .attr("stroke-opacity", 0.4)
            .style("cursor", "pointer")
            .on("mouseover", function(event) {
                d3.select(this).attr("opacity", f.isSame ? 0.7 : 0.35);
                d3.select("#tooltip").style("display", "block")
                    .style("left", (event.clientX + 12) + "px")
                    .style("top", (event.clientY - 10) + "px")
                    .html(`<strong>${f.from} → ${f.to}</strong><br>${f.count} of ${f.fromCount} tournaments (${f.pct}%)`);
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", f.isSame ? 0.45 : 0.15);
                d3.select("#tooltip").style("display", "none");
            });
    });

    leftNodes.forEach(n => {
        svg.append("rect")
            .attr("x", leftX).attr("y", n.y)
            .attr("width", nodeW).attr("height", n.h)
            .attr("rx", 4)
            .attr("fill", "var(--text-secondary)")
            .attr("opacity", 0.7);

        svg.append("text")
            .attr("x", leftX - 12).attr("y", n.y + n.h / 2 - 7)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "central")
            .attr("fill", "var(--text-primary)")
            .attr("font-size", "13px")
            .attr("font-weight", "600")
            .text(n.label);

        svg.append("text")
            .attr("x", leftX - 12).attr("y", n.y + n.h / 2 + 10)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "central")
            .attr("fill", "var(--text-muted)")
            .attr("font-size", "11px")
            .text(`${n.count} tournaments`);
    });

    rightNodes.forEach(n => {
        svg.append("rect")
            .attr("x", rightX).attr("y", n.y)
            .attr("width", nodeW).attr("height", n.h)
            .attr("rx", 4)
            .attr("fill", n.color)
            .attr("opacity", 0.85);

        svg.append("text")
            .attr("x", rightX + nodeW + 12).attr("y", n.y + n.h / 2 - 7)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "central")
            .attr("fill", "var(--text-primary)")
            .attr("font-size", "13px")
            .attr("font-weight", "600")
            .text(n.label);

        svg.append("text")
            .attr("x", rightX + nodeW + 12).attr("y", n.y + n.h / 2 + 10)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "central")
            .attr("fill", "var(--text-muted)")
            .attr("font-size", "11px")
            .text(`${n.count} titles`);
    });

    svg.append("text")
        .attr("x", leftX + nodeW / 2).attr("y", 22)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-muted)")
        .attr("font-size", "11px")
        .attr("letter-spacing", "1px")
        .text("HOST CONTINENT");

    svg.append("text")
        .attr("x", rightX + nodeW / 2).attr("y", 22)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-muted)")
        .attr("font-size", "11px")
        .attr("letter-spacing", "1px")
        .text("WINNER");
}

function renderInsights(tournamentId, data) {
    const container = d3.select("#insights-container");
    container.html("");

    const tournament = data.tournaments.find(t => t.tournament_id === tournamentId);
    const matches = data.matches.filter(m => m.tournament_id === tournamentId);

    if (!tournament || matches.length === 0) return;

    const allStats = data.tournaments.map(t => {
        const tm = data.matches.filter(m => m.tournament_id === t.tournament_id);
        const tg = data.goals.filter(g => g.tournament_id === t.tournament_id);
        const gpm = tm.length > 0 ? tg.length / tm.length : 0;
        const margins = tm.map(m => Math.abs(+m.home_team_score - +m.away_team_score));
        const closeCount = tm.filter(m => Math.abs(+m.home_team_score - +m.away_team_score) <= 1).length;
        const closePct = tm.length > 0 ? (closeCount / tm.length) * 100 : 0;
        const avgMargin = margins.length > 0 ? d3.mean(margins) : 0;
        const hc = t.host_country;
        const hm = tm.filter(m => m.home_team_name === hc || m.away_team_name === hc);
        let hWins = 0;
        hm.forEach(m => {
            const isH = m.home_team_name === hc;
            if ((isH && m.home_team_win === "1") || (!isH && m.away_team_win === "1")) hWins++;
        });
        return {
            tid: t.tournament_id, year: +t.year, host: hc, winner: t.winner,
            gpm, closePct, avgMargin,
            hostWinPct: hm.length > 0 ? (hWins / hm.length) * 100 : 0,
            hostMatches: hm.length, hostWins: hWins,
            hostWonCup: t.winner === hc
        };
    });
    const total = allStats.length;

    const hostCountry = tournament.host_country;
    const hostMatches = matches.filter(m =>
        m.home_team_name === hostCountry || m.away_team_name === hostCountry
    );
    let hostWins = 0, hostDraws = 0, hostLosses = 0;
    hostMatches.forEach(m => {
        const isHome = m.home_team_name === hostCountry;
        const won = (isHome && m.home_team_win === "1") || (!isHome && m.away_team_win === "1");
        if (won) hostWins++;
        else if (m.draw === "1") hostDraws++;
        else hostLosses++;
    });
    const hostWinPct = hostMatches.length > 0 ? (hostWins / hostMatches.length) * 100 : 0;

    let awayWins = 0, awayTotal = 0;
    data.tournaments.forEach(t => {
        if (t.host_country === hostCountry) return;
        data.matches.filter(m =>
            m.tournament_id === t.tournament_id &&
            (m.home_team_name === hostCountry || m.away_team_name === hostCountry)
        ).forEach(m => {
            awayTotal++;
            const isH = m.home_team_name === hostCountry;
            if ((isH && m.home_team_win === "1") || (!isH && m.away_team_win === "1")) awayWins++;
        });
    });
    const awayWinPct = awayTotal > 0 ? (awayWins / awayTotal) * 100 : 0;
    const boost = hostWinPct - awayWinPct;
    const hostWonCup = tournament.winner === hostCountry;

    const hostRank = allStats.slice().sort((a, b) => b.hostWinPct - a.hostWinPct)
        .findIndex(s => s.tid === tournamentId) + 1;

    let hostVerdict;
    if (hostWonCup) hostVerdict = `<span class="insight-highlight">Yes — ${hostCountry} won the tournament as hosts!</span>`;
    else if (boost > 15) hostVerdict = `<span class="insight-positive">Strong boost — performed significantly better than their non-host average</span>`;
    else if (boost > 0) hostVerdict = `<span class="insight-positive">Slight boost — performed somewhat better than usual</span>`;
    else hostVerdict = `<span class="insight-negative">No advantage — performed at or below their non-host level</span>`;

    if (hostMatches.length > 0) {
        container.append("div").attr("class", "insight-card insight-wide").html(`
            <div class="insight-content">
                <div class="insight-title">Did Hosting Help ${hostCountry}?</div>
                <div class="insight-verdict">${hostVerdict}</div>
                <div class="insight-compare">
                    <div class="insight-compare-item">
                        <div class="insight-compare-label">As host (${tournament.year})</div>
                        <div class="insight-compare-bar-wrap">
                            <div class="insight-compare-bar host-bar" style="width:${hostWinPct}%"></div>
                        </div>
                        <div class="insight-compare-value">${hostWinPct.toFixed(0)}% wins</div>
                        <div class="insight-compare-sub">${hostWins}W ${hostDraws}D ${hostLosses}L</div>
                    </div>
                    <div class="insight-compare-item">
                        <div class="insight-compare-label">${hostCountry} as non-host (all time)</div>
                        <div class="insight-compare-bar-wrap">
                            <div class="insight-compare-bar away-bar" style="width:${awayWinPct}%"></div>
                        </div>
                        <div class="insight-compare-value">${awayWinPct.toFixed(0)}% wins</div>
                        <div class="insight-compare-sub">${awayWins}W in ${awayTotal} matches</div>
                    </div>
                </div>
                <div class="insight-footnote">
                    ${boost >= 0 ? "+" : ""}${boost.toFixed(0)}pp boost from hosting · Ranked #${hostRank} of ${total} host performances
                </div>
            </div>
        `);
    }

    const etMatches = matches.filter(m => m.extra_time === "1");
    const penMatches = matches.filter(m => m.penalty_shootout === "1");
    const oneGoalGames = matches.filter(m => Math.abs(+m.home_team_score - +m.away_team_score) <= 1 && m.draw !== "1");
    const draws = matches.filter(m => m.draw === "1");

    const allTightness = data.tournaments.map(t => {
        const tm = data.matches.filter(m => m.tournament_id === t.tournament_id);
        const et = tm.filter(m => m.extra_time === "1").length;
        const pen = tm.filter(m => m.penalty_shootout === "1").length;
        const close = tm.filter(m => Math.abs(+m.home_team_score - +m.away_team_score) <= 1).length;
        const score = tm.length > 0 ? ((et * 2 + pen * 3 + close) / tm.length) * 100 : 0;
        return { tid: t.tournament_id, score };
    });
    const tightnessRank = allTightness.slice().sort((a, b) => b.score - a.score)
        .findIndex(d => d.tid === tournamentId) + 1;

    let tightnessVerdict;
    if (tightnessRank <= 3) tightnessVerdict = `<span class="insight-positive">One of the tightest World Cups — packed with nail-biters and extra time</span>`;
    else if (tightnessRank <= total / 2) tightnessVerdict = `<span class="insight-highlight">Tighter than average — plenty of close calls and decisive moments</span>`;
    else tightnessVerdict = `<span class="insight-negative">A more one-sided tournament — fewer close games than usual</span>`;

    container.append("div").attr("class", "insight-card insight-wide").html(`
        <div class="insight-content">
            <div class="insight-title">How Tight Were The Games?</div>
            <div class="insight-verdict">${tightnessVerdict}</div>
            <div class="insight-stats-row">
                <div class="insight-mini-stat">
                    <div class="insight-mini-value">${etMatches.length}</div>
                    <div class="insight-mini-label">went to extra time</div>
                </div>
                <div class="insight-mini-stat">
                    <div class="insight-mini-value">${penMatches.length}</div>
                    <div class="insight-mini-label">penalty shootouts</div>
                </div>
                <div class="insight-mini-stat">
                    <div class="insight-mini-value">${oneGoalGames.length}</div>
                    <div class="insight-mini-label">decided by 1 goal</div>
                </div>
                <div class="insight-mini-stat">
                    <div class="insight-mini-value">#${tightnessRank}</div>
                    <div class="insight-mini-label">of ${total} tightest</div>
                </div>
            </div>
            <div class="insight-footnote">${draws.length} draws · ${matches.length} total matches</div>
        </div>
    `);
}
