Promise.all([
    d3.csv("data/tournaments.csv"),
    d3.csv("data/matches.csv"),
    d3.csv("data/goals.csv"),
    d3.csv("data/qualified_teams.csv"),
    d3.csv("data/group_standings.csv"),
    d3.csv("data/bookings.csv").catch(() => []),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
]).then(([tournaments, matches, goals, qualifiedTeams, groupStandings, bookings, world]) => {

    const mensTournaments = tournaments.filter(d => d.tournament_name.includes("Men's"));
    mensTournaments.sort((a, b) => +a.year - +b.year);

    const data = {
        tournaments: mensTournaments,
        matches,
        goals,
        qualifiedTeams,
        groupStandings,
        bookings,
        world
    };

    initMap(data);
    initAnalytics(data);

}).catch(error => {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 4rem; color: #d94f4f;">
            <h2>Error loading data</h2>
            <p>Make sure you are running a local server:<br>
            <code style="color: #e8a838;">python3 -m http.server 8000</code></p>
            <p style="margin-top: 1rem; color: #a89e8c;">${error}</p>
        </div>
    `;
});
