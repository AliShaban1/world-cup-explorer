# The World Cup Atlas

An interactive visualization of every FIFA Men's World Cup from 1930 to 2022. Built with D3.js.

**[Live Demo →](https://csc316-student.github.io/world-cup-explorer/)**

## What It Does

Click any host nation on the map to explore its World Cup history. Drill into individual tournaments to see group tables, knockout brackets, top scorers, and full match results. Click any team badge to trace their journey through the tournament — every match lights up with W/D/L coloring.

Scroll down for cross-tournament analytics: how goals per match have changed over 92 years, which nations dominate, whether World Cups are getting more aggressive, and whether hosting on your own continent really helps you win.

## Running Locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`

## Data

[The Fjelstul World Cup Database](https://github.com/jfjelstul/worldcup) by Joshua C. Fjelstul, Ph.D. (CC-BY-SA 4.0)

Map geometry from [Natural Earth](https://www.naturalearthdata.com/) via [world-atlas](https://github.com/topojson/world-atlas).
