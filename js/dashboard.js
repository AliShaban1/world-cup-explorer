const STAGE_ORDER = [
    "group stage",
    "second group stage",
    "final round",
    "round of 16",
    "quarter-finals",
    "semi-finals",
    "third-place match",
    "final"
];

function perfClass(performance) {
    if (!performance) return "group-stage";
    const p = performance.toLowerCase().replace(/\s+/g, "-");
    if (p === "champions" || p === "winner") return "champions";
    return p;
}

let lockedTeam = null;

function showDashboard(tournamentId, data) {
    const tournament = data.tournaments.find(t => t.tournament_id === tournamentId);
    if (!tournament) return;

    if (lockedTeam) {
        clearTeamFilter(d3.select("#teams-grid"));
    }
    lockedTeam = null;

    const matches = data.matches.filter(m => m.tournament_id === tournamentId);
    const goals = data.goals.filter(g => g.tournament_id === tournamentId);
    const teams = data.qualifiedTeams.filter(t => t.tournament_id === tournamentId);

    renderNav();
    renderHeader(tournament, matches, goals);
    renderTeams(teams, matches);
    renderTopScorers(goals);
    renderInsights(tournamentId, data);
    renderGroupTables(tournamentId, data);
    renderBracket(matches, goals);
    renderMatches(matches, goals);
}

function renderNav() {
    d3.select("#back-btn").on("click", () => goBackToMap());
}

function renderHeader(tournament, matches, goals) {
    const totalGoals = goals.length;
    const totalMatches = matches.length;
    const goalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : 0;
    const hostWon = tournament.host_won === "1";

    d3.select("#tournament-header").html(`
        <div class="year">${tournament.year}</div>
        <div class="host">Hosted by ${tournament.host_country}</div>
        <div class="winner">
            🏆 ${tournament.winner}
            ${hostWon ? '<span style="font-size: 0.85rem; color: var(--text-muted);"> (host nation)</span>' : ""}
        </div>
        <div class="stats-row">
            <div class="stat">
                <div class="stat-value">${tournament.count_teams}</div>
                <div class="stat-label">Teams</div>
            </div>
            <div class="stat">
                <div class="stat-value">${totalMatches}</div>
                <div class="stat-label">Matches</div>
            </div>
            <div class="stat">
                <div class="stat-value">${totalGoals}</div>
                <div class="stat-label">Goals</div>
            </div>
            <div class="stat">
                <div class="stat-value">${goalsPerMatch}</div>
                <div class="stat-label">Goals / Match</div>
            </div>
        </div>
    `);
}

function renderTeams(teams, matches) {
    const perfOrder = ["champions", "final", "semi-finals", "third-place", "quarter-finals",
                       "round of 16", "second group stage", "group stage"];

    teams.sort((a, b) => {
        const ai = perfOrder.indexOf(a.performance);
        const bi = perfOrder.indexOf(b.performance);
        if (ai !== bi) return ai - bi;
        return a.team_name.localeCompare(b.team_name);
    });

    const grid = d3.select("#teams-grid");
    grid.html("");

    d3.select("#team-journey-bar").remove();

    const section = d3.select("#teams-section");
    section.select("#team-filter-hint").remove();
    section.select("h2").insert("div", ":first-child")
        .attr("id", "team-filter-hint")
        .text("");

    grid.selectAll("div.team-badge")
        .data(teams)
        .join("div")
        .attr("class", d => `team-badge ${perfClass(d.performance)}`)
        .text(d => d.team_name)
        .attr("title", d => `${d.team_name} — ${d.performance}`)
        .on("click", function(event, d) {
            if (lockedTeam === d.team_name) {
                lockedTeam = null;
                clearTeamFilter(grid);
            } else {
                lockedTeam = d.team_name;
                applyTeamFilter(grid, d.team_name);
            }
        })
        .on("mouseover", function(event, d) {
            if (lockedTeam) return;

            applyTeamHighlight(grid, d.team_name);

            d3.select("#tooltip")
                .style("display", "block")
                .style("left", (event.clientX + 12) + "px")
                .style("top", (event.clientY - 10) + "px")
                .html(`
                    <strong>${d.team_name}</strong><br>
                    Result: ${d.performance}<br>
                    Matches played: ${d.count_matches}<br>
                    <span style="color: var(--text-muted); font-size: 0.75rem;">Click to filter matches</span>
                `);
        })
        .on("mousemove", function(event) {
            if (lockedTeam) return;
            d3.select("#tooltip")
                .style("left", (event.clientX + 12) + "px")
                .style("top", (event.clientY - 10) + "px");
        })
        .on("mouseout", function() {
            if (lockedTeam) return;
            clearTeamHighlight(grid);
            d3.select("#tooltip").style("display", "none");
        });
}

function applyTeamHighlight(grid, teamName) {
    grid.selectAll(".team-badge")
        .classed("dimmed", t => t.team_name !== teamName);

    d3.selectAll(".match-row").each(function(m) {
        const row = d3.select(this);
        const isTeam = m.home_team_name === teamName || m.away_team_name === teamName;
        row.classed("highlighted", isTeam);
        row.style("opacity", isTeam ? 1 : 0.25);
    });
}

function clearTeamHighlight(grid) {
    grid.selectAll(".team-badge").classed("dimmed", false);
    d3.selectAll(".match-row")
        .classed("highlighted", false)
        .style("opacity", 1);
}

function applyTeamFilter(grid, teamName) {
    grid.selectAll(".team-badge")
        .classed("locked", t => t.team_name === teamName)
        .classed("dimmed", t => t.team_name !== teamName);

    const teamMatches = [];
    d3.selectAll(".match-row").each(function(m) {
        const row = d3.select(this);
        const isTeam = m.home_team_name === teamName || m.away_team_name === teamName;
        row.classed("filtered-out", !isTeam);
        row.classed("highlighted", false);
        row.classed("journey-reveal", false);
        row.classed("journey-win", false).classed("journey-draw", false).classed("journey-loss", false);
        row.style("opacity", isTeam ? 0 : 1);
        if (isTeam) {
            const isHome = m.home_team_name === teamName;
            const won = (isHome && m.home_team_win === "1") || (!isHome && m.away_team_win === "1");
            const drew = m.draw === "1";
            row.classed(won ? "journey-win" : (drew ? "journey-draw" : "journey-loss"), true);
            teamMatches.push(this);
        }
    });

    d3.selectAll(".match-detail").each(function(m) {
        const detail = d3.select(this);
        const isTeam = m.home_team_name === teamName || m.away_team_name === teamName;
        detail.classed("filtered-out", !isTeam);
    });

    d3.selectAll(".stage-group").each(function() {
        const group = d3.select(this);
        const visibleMatches = group.selectAll(".match-row:not(.filtered-out)");
        group.style("display", visibleMatches.size() > 0 ? "block" : "none");
    });

    teamMatches.forEach((node, i) => {
        const row = d3.select(node);
        setTimeout(() => {
            row.classed("journey-reveal", true)
                .style("opacity", null);
        }, i * 200);
    });

    d3.selectAll(".bracket-match").each(function(m) {
        if (!m) return;
        const card = d3.select(this);
        const isTeam = m.home_team_name === teamName || m.away_team_name === teamName;
        card.classed("bracket-dimmed", !isTeam);
        card.classed("bracket-highlighted", isTeam);
        card.classed("bracket-win", false).classed("bracket-draw", false).classed("bracket-loss", false);
        if (isTeam) {
            const isHome = m.home_team_name === teamName;
            const won = (isHome && m.home_team_win === "1") || (!isHome && m.away_team_win === "1");
            const drew = m.draw === "1";
            card.classed(won ? "bracket-win" : (drew ? "bracket-draw" : "bracket-loss"), true);

            card.selectAll(".bracket-team").each(function() {
                const teamRow = d3.select(this);
                const name = teamRow.select(".bracket-team-name").text();
                teamRow.classed("journey-team", name === teamName);
            });
        }
    });

    d3.selectAll(".group-table tr[data-team]").each(function() {
        const tr = d3.select(this);
        const isTeam = tr.attr("data-team") === teamName;
        tr.classed("journey-group-highlight", isTeam);
        tr.classed("journey-group-dimmed", !isTeam);
    });

    d3.select("#team-journey-bar").remove();
    const journeyData = [];
    teamMatches.forEach(node => {
        const m = d3.select(node).datum();
        const isHome = m.home_team_name === teamName;
        const won = (isHome && m.home_team_win === "1") || (!isHome && m.away_team_win === "1");
        const drew = m.draw === "1";
        journeyData.push({
            stage: m.stage_name,
            opponent: isHome ? m.away_team_name : m.home_team_name,
            score: m.score,
            result: won ? "W" : (drew ? "D" : "L")
        });
    });

    if (journeyData.length > 0) {
        const hint = d3.select("#team-filter-hint");
        hint.classed("active", true)
            .html(`<strong>${teamName}</strong>'s journey — click badge again to clear`);

        const bar = d3.select("#teams-section").append("div").attr("id", "team-journey-bar");
        journeyData.forEach((jd, i) => {
            const step = bar.append("div").attr("class", "journey-step")
                .style("opacity", 0);

            const resultClass = jd.result === "W" ? "journey-win" : (jd.result === "D" ? "journey-draw" : "journey-loss");

            step.html(`
                <div class="journey-stage">${jd.stage}</div>
                <div class="journey-result ${resultClass}">${jd.result}</div>
                <div class="journey-vs">vs ${jd.opponent}</div>
                <div class="journey-score">${jd.score}</div>
            `);

            if (i < journeyData.length - 1) {
                bar.append("div").attr("class", "journey-arrow").text("→").style("opacity", 0)
                    .transition().delay(i * 200 + 150).duration(300).style("opacity", 1);
            }

            step.transition().delay(i * 200).duration(400)
                .style("opacity", 1);
        });
    }

    d3.select("#tooltip").style("display", "none");
}

function clearTeamFilter(grid) {
    grid.selectAll(".team-badge")
        .classed("locked", false)
        .classed("dimmed", false);

    d3.selectAll(".match-row")
        .classed("filtered-out", false)
        .classed("highlighted", false)
        .classed("journey-reveal", false)
        .classed("journey-win", false)
        .classed("journey-draw", false)
        .classed("journey-loss", false)
        .style("opacity", 1);

    d3.selectAll(".match-detail")
        .classed("filtered-out", false);

    d3.selectAll(".stage-group")
        .style("display", "block");

    d3.selectAll(".bracket-match")
        .classed("bracket-dimmed", false)
        .classed("bracket-highlighted", false)
        .classed("bracket-win", false)
        .classed("bracket-draw", false)
        .classed("bracket-loss", false);
    d3.selectAll(".bracket-team")
        .classed("journey-team", false);

    d3.selectAll(".group-table tr[data-team]")
        .classed("journey-group-highlight", false)
        .classed("journey-group-dimmed", false);

    d3.select("#team-journey-bar").remove();

    d3.select("#team-filter-hint")
        .classed("active", false)
        .text("");
}

function renderTopScorers(goals) {
    const container = d3.select("#top-scorers");
    container.html("");

    const goalCounts = d3.rollup(goals, v => v.length, d => `${d.given_name} ${d.family_name}`);
    let scorers = Array.from(goalCounts, ([name, count]) => ({ name, count }));
    scorers.sort((a, b) => b.count - a.count);
    scorers = scorers.slice(0, 8);

    if (scorers.length === 0) {
        container.html('<p style="color: var(--text-muted); font-size: 0.85rem;">No goal data available.</p>');
        return;
    }

    const maxGoals = scorers[0].count;

    const rows = container.selectAll("div.scorer-row")
        .data(scorers)
        .join("div")
        .attr("class", "scorer-row");

    rows.append("div")
        .attr("class", "scorer-name")
        .attr("title", d => d.name)
        .text(d => d.name);

    const barContainers = rows.append("div")
        .attr("class", "scorer-bar-container");

    barContainers.append("div")
        .attr("class", "scorer-bar")
        .style("width", "0%")
        .transition()
        .delay((d, i) => 800 + i * 80)
        .duration(600)
        .ease(d3.easeCubicOut)
        .style("width", d => `${(d.count / maxGoals) * 100}%`);

    rows.append("div")
        .attr("class", "scorer-goals")
        .text(d => d.count);
}

function renderMatches(matches, goals) {
    const filterContainer = d3.select("#stage-filter");
    const listContainer = d3.select("#matches-list");

    const stages = [];
    STAGE_ORDER.forEach(s => {
        if (matches.some(m => m.stage_name === s)) stages.push(s);
    });

    filterContainer.html("");

    filterContainer.append("button")
        .attr("class", "stage-btn active")
        .text("All")
        .on("click", function() {
            filterContainer.selectAll(".stage-btn").classed("active", false);
            d3.select(this).classed("active", true);
            renderMatchList(matches, goals, listContainer, "all");
            if (lockedTeam) {
                applyTeamFilter(d3.select("#teams-grid"), lockedTeam);
            }
        });

    stages.forEach(stage => {
        filterContainer.append("button")
            .attr("class", "stage-btn")
            .text(stage.charAt(0).toUpperCase() + stage.slice(1))
            .on("click", function() {
                filterContainer.selectAll(".stage-btn").classed("active", false);
                d3.select(this).classed("active", true);
                renderMatchList(matches, goals, listContainer, stage);
                if (lockedTeam) {
                    applyTeamFilter(d3.select("#teams-grid"), lockedTeam);
                }
            });
    });

    renderMatchList(matches, goals, listContainer, "all");
}

function renderMatchList(matches, goals, container, stageFilter) {
    container.html("");

    const filtered = stageFilter === "all" ? matches : matches.filter(m => m.stage_name === stageFilter);

    const stages = [];
    STAGE_ORDER.forEach(s => {
        const stageMatches = filtered.filter(m => m.stage_name === s);
        if (stageMatches.length > 0) stages.push({ stage: s, matches: stageMatches });
    });

    stages.forEach(stageGroup => {
        const group = container.append("div").attr("class", "stage-group");

        group.append("div")
            .attr("class", "stage-group-title")
            .text(stageGroup.stage.charAt(0).toUpperCase() + stageGroup.stage.slice(1));

        stageGroup.matches.forEach(match => {
            const matchGoals = goals.filter(g => g.match_id === match.match_id);

            const row = group.append("div")
                .attr("class", "match-row")
                .datum(match);

            row.append("span")
                .attr("class", "match-home")
                .style("font-weight", match.home_team_win === "1" ? "700" : "400")
                .text(match.home_team_name);

            row.append("span")
                .attr("class", "match-score")
                .text(match.score);

            row.append("span")
                .attr("class", "match-away")
                .style("font-weight", match.away_team_win === "1" ? "700" : "400")
                .text(match.away_team_name);

            if (matchGoals.length > 0) {
                const detail = group.append("div")
                    .attr("class", "match-detail")
                    .datum(match);

                let detailHtml = buildGoalTimeline(matchGoals, match);

                const homeGoals = matchGoals.filter(g => g.player_team_name === match.home_team_name);
                const awayGoals = matchGoals.filter(g => g.player_team_name === match.away_team_name);

                if (homeGoals.length > 0) {
                    detailHtml += `<div class="goal-team-header home-team">${match.home_team_name}</div>`;
                    homeGoals.forEach(g => {
                        detailHtml += `<div class="goal-entry home-goal"><span class="goal-minute">${g.minute_label}</span> ${g.given_name} ${g.family_name}${g.penalty === "1" ? " (pen)" : ""}${g.own_goal === "1" ? " (og)" : ""}</div>`;
                    });
                }
                if (awayGoals.length > 0) {
                    if (homeGoals.length > 0) detailHtml += `<div class="goal-separator"></div>`;
                    detailHtml += `<div class="goal-team-header away-team">${match.away_team_name}</div>`;
                    awayGoals.forEach(g => {
                        detailHtml += `<div class="goal-entry away-goal"><span class="goal-minute">${g.minute_label}</span> ${g.given_name} ${g.family_name}${g.penalty === "1" ? " (pen)" : ""}${g.own_goal === "1" ? " (og)" : ""}</div>`;
                    });
                }

                detail.html(detailHtml);

                row.on("click", function() {
                    const isOpen = detail.classed("open");
                    container.selectAll(".match-detail").classed("open", false);
                    detail.classed("open", !isOpen);
                });
            }
        });
    });
}

function buildGoalTimeline(matchGoals, match) {
    if (matchGoals.length === 0) return "";

    const maxMinute = Math.max(90, ...matchGoals.map(g => +g.minute_regulation || 0));

    let dotsHtml = "";
    matchGoals.forEach(g => {
        const minute = +g.minute_regulation || 0;
        const pct = 2 + (minute / maxMinute) * 96;
        const isHome = g.player_team_name === match.home_team_name;
        const isOwnGoal = g.own_goal === "1";
        const cls = isOwnGoal ? "own-goal" : (isHome ? "home" : "away");
        const label = `${g.given_name} ${g.family_name} ${g.minute_label}${g.penalty === "1" ? " (pen)" : ""}${isOwnGoal ? " (og)" : ""}`;
        dotsHtml += `<div class="goal-timeline-dot ${cls}" style="left:${pct}%" title="${label}"></div>`;
    });

    return `<div class="goal-timeline">
        <div class="goal-timeline-bar">
            <div class="goal-timeline-track"></div>
            ${dotsHtml}
        </div>
        <div class="goal-timeline-labels"><span>0'</span><span>45'</span><span>90'${maxMinute > 90 ? "+" : ""}</span></div>
        <div class="goal-timeline-legend">
            <span class="legend-home">${match.home_team_name}</span>
            <span class="legend-away">${match.away_team_name}</span>
        </div>
    </div>`;
}

function renderGroupTables(tournamentId, data) {
    const container = d3.select("#groups-container");
    container.html("");

    const standings = data.groupStandings.filter(s => s.tournament_id === tournamentId);
    if (standings.length === 0) {
        container.html('<p style="color: var(--text-muted); font-size: 0.85rem;">No group stage data available.</p>');
        return;
    }

    const groups = d3.group(standings, d => d.group_name);
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    sortedGroups.forEach(([groupName, teams]) => {
        teams.sort((a, b) => +a.position - +b.position);

        const wrapper = container.append("div").attr("class", "group-table-wrapper");
        wrapper.append("div").attr("class", "group-table-title").text(groupName);

        const table = wrapper.append("table").attr("class", "group-table");

        table.append("thead").append("tr").html(
            `<th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>`
        );

        const tbody = table.append("tbody");

        teams.forEach(t => {
            const advanced = t.advanced === "1";
            const tr = tbody.append("tr").classed("advanced", advanced).attr("data-team", t.team_name);
            tr.html(`
                <td>${t.team_name}</td>
                <td>${t.played}</td>
                <td>${t.wins}</td>
                <td>${t.draws}</td>
                <td>${t.losses}</td>
                <td>${t.goals_for}</td>
                <td>${t.goals_against}</td>
                <td>${+t.goal_difference > 0 ? "+" + t.goal_difference : t.goal_difference}</td>
                <td class="pts">${t.points}</td>
            `);
        });
    });
}

function normalizeStage(name) {
    const map = {
        "quarter-final": "quarter-finals",
        "semi-final": "semi-finals"
    };
    return map[name] || name;
}

function renderBracket(matches, goals) {
    const container = d3.select("#bracket-container");
    container.html("");
    const section = d3.select("#bracket-section");

    const knockoutMatches = matches.filter(m =>
        m.stage_name !== "group stage" && m.stage_name !== "second group stage"
    );

    if (knockoutMatches.length === 0) {
        section.style("display", "none");
        return;
    }
    section.style("display", null);

    const roundOrder = ["round of 16", "quarter-finals", "semi-finals", "third-place match", "final", "final round"];
    const roundLabels = {
        "round of 16": "Round of 16",
        "quarter-finals": "Quarter-Finals",
        "semi-finals": "Semi-Finals",
        "third-place match": "3rd Place",
        "final": "Final",
        "final round": "Final Round"
    };

    const roundsMap = new Map();
    roundOrder.forEach(stage => {
        const stageMatches = knockoutMatches.filter(m => normalizeStage(m.stage_name) === stage);
        if (stageMatches.length > 0) roundsMap.set(stage, stageMatches);
    });

    knockoutMatches.forEach(m => {
        const norm = normalizeStage(m.stage_name);
        if (!roundOrder.includes(norm)) {
            if (!roundsMap.has(norm)) roundsMap.set(norm, []);
            if (!roundsMap.get(norm).includes(m)) roundsMap.get(norm).push(m);
        }
    });

    const bracket = container.append("div").attr("class", "bracket");

    roundsMap.forEach((stageMatches, stageName) => {
        const round = bracket.append("div").attr("class", "bracket-round");

        round.append("div")
            .attr("class", "bracket-round-title")
            .text(roundLabels[stageName] || stageName.charAt(0).toUpperCase() + stageName.slice(1));

        stageMatches.forEach(match => {
            const matchGoals = goals.filter(g => g.match_id === match.match_id);
            const matchCard = round.append("div").attr("class", "bracket-match").datum(match);

            const homeWin = match.home_team_win === "1";
            const awayWin = match.away_team_win === "1";

            matchCard.append("div")
                .attr("class", `bracket-team${homeWin ? " winner" : ""}`)
                .html(`<span class="bracket-team-name">${match.home_team_name}</span><span class="bracket-team-score">${match.home_team_score}${match.penalty_shootout === "1" ? " (" + match.home_team_score_penalties + ")" : ""}</span>`);

            matchCard.append("div")
                .attr("class", `bracket-team${awayWin ? " winner" : ""}`)
                .html(`<span class="bracket-team-name">${match.away_team_name}</span><span class="bracket-team-score">${match.away_team_score}${match.penalty_shootout === "1" ? " (" + match.away_team_score_penalties + ")" : ""}</span>`);

            if (match.extra_time === "1" || match.penalty_shootout === "1") {
                let tag = "";
                if (match.penalty_shootout === "1") tag = `pens ${match.score_penalties}`;
                else tag = "aet";
                matchCard.append("div")
                    .attr("class", "bracket-extra")
                    .text(tag);
            }

            matchCard.on("mouseover", function(event) {
                let html = `<strong>${match.home_team_name} ${match.score} ${match.away_team_name}</strong>`;
                if (match.extra_time === "1") html += `<br><span style="color:var(--text-muted)">After extra time</span>`;
                if (match.penalty_shootout === "1") html += `<br><span style="color:var(--text-muted)">Penalties: ${match.score_penalties}</span>`;
                if (matchGoals.length > 0) {
                    html += `<br><span style="color:var(--text-muted);font-size:0.75rem">`;
                    matchGoals.forEach(g => {
                        html += `${g.given_name} ${g.family_name} ${g.minute_label} `;
                    });
                    html += `</span>`;
                }
                d3.select("#tooltip").style("display", "block")
                    .style("left", (event.clientX + 12) + "px")
                    .style("top", (event.clientY - 10) + "px")
                    .html(html);
            })
            .on("mousemove", function(event) {
                d3.select("#tooltip")
                    .style("left", (event.clientX + 12) + "px")
                    .style("top", (event.clientY - 10) + "px");
            })
            .on("mouseout", function() {
                d3.select("#tooltip").style("display", "none");
            });
        });

    });
}
