# The World Cup Atlas Write-Up

**CSC316 — Assignment 3**

**Deployment Link:** https://alishaban1.github.io/world-cup-explorer/

## Design Rationale

The World Cup Atlas is an interactive visualization to explore every FIFA Men's World Cup from 1930 to 2022. The data set (from The Fjelstul World Cup Database) includes detailed data about the matches, goals, and records across 22 tournaments. Instead of a single linear story, this visualization is a structured exploration tool where users can look at a global overview and progressively dive into the details by selecting their target country, tournament, and team.

**Entry Point: World Map**

I chose a geographic map as the main entry point because the World Cup is directly tied to countries that host the tournament and is central to its identity. The countries in the map are color-coded by era using a sequential warm palette from brown to gold. This shows the historical spread of hosting across the world over the years. I also considered, a simpler timeline appraoch, but the map creates a stronger sense of curiosity and exploration and is easy to interact with by dragging around and zooming into countries. This map also reveals that hosting has been mostly concentrated in Europe and the Americas which is further explored in the continental advantage analysis below the page. Host countries are highlighted on hover with blue to create a contrast with the base palette (avoids confusions) and distinguish the target when interacting. There are also summary information revealed once you hover over a country or a tournament.

**Intermediate Country View.**

When you click a host country, the tool transitions into that country to focus on its hosting years with a zooming animation. I added this intermediate layer because some countries like Italy and Brazil hosted multiple tournaments, and the viewer needs a way to choose between them without losing context. This way, if you are interested to only observe a particular host's data, you can do so. The animated zoom was a good choice to show that the focus is shifting to a specific country before presenting the details of the tournaments.

**Tournament Dashboard with Team Journey Filter.**

The tournament view has a two-column layout showing qualified teams, top scorers, group score tables, knockout bracket and full list of matches. One of the key interactions here is clicking on a qualified team which filters the entire dashboard to only show that team's matches and results that are color-coded and labeled with W/D/L. The colors are picked based on the result (red for a loss, green for a win, gold for a draw). There is a revealing animation as well to show the journey of the team at one glance. In the early versions of the tool, there wasn't a filtering mechanism which felt overwhelming, especially when the viewer is only interested in a particular team's data and path throughout the tournament. Matches appearing sequentially in the journey section creates a narrative of the team's progress and the rest of the dashboard provides additional views and details of the matches.

**Analytics: Goals Trend.**

A line chart shows goals per match across the tournaments. I believe that a line chart like this clearly reveals the trend over time. I used a monotone curve interpolation to make it smoother and added an average dashed line for reference. The animated line drawing leads the viewer's attention to the historical trajectory, and shows a clear decline from high scoring 1950s and a defensive shift in 1990s with a slight recovery since then.

**Analytics: All-Time Dominance.**

This is a horizontal bar chart with star annotations to show tournament appearances and titles. I chose simple bars because this comparision is one-dimensional and titles can be a secondary annotation. The stars are more immediately readable than a second axis.

**Analytics: Aggression Trend.**

This is a stacked area chart showing yellow and red cards per match from 1970 onward (cards were introduced in 1970). I used gradient fills to create visual depth and hover targets for tooltip access. The peak is also annotated to emphasize its significance as it is a turning point in the trend when the "Battle of Nuremberg" happened in 2006. I also tried a grouped bar chart but I found that the stacked area attracts more attention, especially to the peak and the subsequent decline as standards changed.

**Analytics: Continental Advantage.**

This went through the most iteration. I wanted a unique visualization while still being able to clearly convey the message. I explored multiple types of visualiation like dot charts, grouped blocks, donut charts, unit charts, and many more. But I settled on a flow diagram because it is effective in showing the relationship between two categorical variables: host continent and winner continent. The bandwidths encode the proportion of tournaments following each path which communicates the main message of the diagram (percentages are shown on hover to avoid visual clutter). This immediately reveals the home-continent advantage pattern that holds across most years.

**Tournament Insights.**

Each tournament dashboard includes two insights that are computed. "Did Hosting Help?" addresses the effect of hosting on a nation's win rate with a bar chart and a ranking across all tournaments. "How Tight Were The Games?" is a weighted tightness score (extra time, penalties, close results) and shows how competitive the tournament was. I initially had a "Champion's Run" insight as well but I removed it since it felt redundant as each country's journey is displayed through the filtering approach.

## Development Process

I spent about 20-25 hours on this project over 10 days. The work roughly included:

1. Finding my favorite dataset and overall goals of the project (~1 hour)
2. Exploring the data and deciding which stories to tell (~4 hours)
3. Building the map and page navigation structure (~4 hours)
4. The tournament dashboard (~5 hours)
5. The analytics section and more iterations on the visualizations (~6 hours)
6. Polishing, cleanup, and testing (~2 hours)

The biggest challenge was scoping. The dataset was very rich containing matches, goals, squads, etc. Early on I spent some time exploring what patterns existed and whether they were interesting enough for a viewer to explore. I also didn't want this tool to be only exploratory so the user can leave with some insights even if they don't spend much time reading about the details. This process was especially challenging because it was time consuming to explore each file and find trends. For example, I downloaded the bookings dataset later separately and only then discovered that there is a clear aggression trend. And some patterns did not hold generally over the full dataset, particularly the scoring habits and timing.

Another challenge was choosing unique and creative visualizations to avoid boring and traditional styles. This particularly took a lot of time for the continental advantage visualization as one of my requirements for this diagram was creativity. The reason this was challenging was that the dataset and the messages I chose to communicate were simple and needed to be immediately visible without too much effort as the main goal of this project is really to explore the data and not have to parse through and analyze overwhelming charts.

I used an LLM to help with the initial code structure like setting up the D3 data loading, the basic SVG bindings, and the skeleton of the visualization functions. This was great for getting a working prototype quickly and helped me a lot in deciding what pieces of data to display. From there, I iterated on my own: tested each visualization in the browser, adjusted layouts and encodings to my preferences, added and removed features based on what actually looked good with real data. The LLM was also helpful for iterating through different visualization approaches (such as during the continental advantage exploration, where I tried many alternatives). I found working with an LLM very effective for this kind of iterative visual design. Being able to explain what I wanted changed and quickly see the result made it possible to explore way more alternatives than I could have explored manually. That said, all the design decisions (what to show, what encodings to use, when something looked bad and needed to change) were made by me. The LLM wrote code, I directed the design and manually improved on it over many iterations.

**Data source:** The Fjelstul World Cup Database by Joshua C. Fjelstul, Ph.D. (CC-BY-SA 4.0), available at github.com/jfjelstul/worldcup. Map data from Natural Earth via world-atlas (topojson).
