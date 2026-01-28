import { useMemo, useState } from 'react';

const defaultRecipes = [
  {
    id: 'iron-plate',
    name: 'Iron Plates',
    costPerMin: 30,
    outputPerMin: 20,
    constructors: 11,
  },
  {
    id: 'iron-rod',
    name: 'Iron Rods',
    costPerMin: 15,
    outputPerMin: 15,
    constructors: 8,
  },
];

const tierOptions = [
  'Tier 0 - HUB Upgrade 1',
  'Tier 1 - Base Building',
  'Tier 2 - Part Assembly',
  'Tier 3 - Coal Power',
  'Tier 4 - Advanced Steel Production',
];

const facilityOptions = [
  { id: 'smart-splitter', label: 'Include smart splitters' },
  { id: 'mk2-belt', label: 'Include Mk.2 belts' },
  { id: 'alt-recipes', label: 'Allow alternate recipes' },
];

function clampNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function buildSuggestions(recipes, totalIngots, maxResults = 6) {
  if (!Number.isFinite(totalIngots) || totalIngots <= 0) {
    return [];
  }

  const maxCounts = recipes.map((recipe) =>
    recipe.costPerMin > 0 ? Math.floor(totalIngots / recipe.costPerMin) : 0,
  );

  const results = [];

  function dfs(index, currentCounts, totalCost, totalOutput) {
    if (totalCost > totalIngots) {
      return;
    }

    if (index === recipes.length) {
      results.push({
        counts: [...currentCounts],
        totalCost,
        totalOutput,
        leftover: totalIngots - totalCost,
        efficiency: totalIngots > 0 ? (totalCost / totalIngots) * 100 : 0,
      });
      return;
    }

    const maxCount = maxCounts[index];
    for (let count = 0; count <= maxCount; count += 1) {
      const nextCost = totalCost + count * recipes[index].costPerMin;
      const nextOutput = totalOutput + count * recipes[index].outputPerMin;
      if (nextCost > totalIngots) {
        break;
      }
      currentCounts[index] = count;
      dfs(index + 1, currentCounts, nextCost, nextOutput);
    }
  }

  dfs(0, Array(recipes.length).fill(0), 0, 0);

  return results
    .filter((result) => result.totalCost > 0)
    .sort((a, b) => {
      if (a.leftover !== b.leftover) {
        return a.leftover - b.leftover;
      }
      return b.totalOutput - a.totalOutput;
    })
    .slice(0, maxResults);
}

export default function App() {
  const [totalIngots, setTotalIngots] = useState(450);
  const [recipes, setRecipes] = useState(defaultRecipes);
  const [selectedTiers, setSelectedTiers] = useState(
    new Set([tierOptions[0], tierOptions[1], tierOptions[2]]),
  );
  const [facilityToggles, setFacilityToggles] = useState(
    new Set(['smart-splitter', 'mk2-belt']),
  );

  const suggestions = useMemo(
    () => buildSuggestions(recipes, totalIngots),
    [recipes, totalIngots],
  );

  const totalCost = recipes.reduce(
    (sum, recipe) => sum + recipe.costPerMin * recipe.constructors,
    0,
  );
  const totalOutput = recipes.reduce(
    (sum, recipe) => sum + recipe.outputPerMin * recipe.constructors,
    0,
  );
  const leftover = Math.max(0, totalIngots - totalCost);

  const updateRecipe = (id, field, value) => {
    setRecipes((prev) =>
      prev.map((recipe) =>
        recipe.id === id
          ? {
              ...recipe,
              [field]: field === 'name' ? value : clampNumber(value),
            }
          : recipe,
      ),
    );
  };

  const toggleTier = (tier) => {
    setSelectedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  const toggleFacility = (id) => {
    setFacilityToggles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applySuggestion = (suggestion) => {
    setRecipes((prev) =>
      prev.map((recipe, index) => ({
        ...recipe,
        constructors: suggestion.counts[index] ?? recipe.constructors,
      })),
    );
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Flow Planner Prototype</p>
          <h1>FICSIT-inspired flow planner (no logos)</h1>
          <p className="lead">
            Use this prototype to test 100% efficiency targets, try alternate
            recipe mixes, and plan sections before you commit to building.
          </p>
        </div>
        <div className="status-badge">
          <span className="status-label">Section status</span>
          <div className="status-controls">
            <span className="status concept">Concept</span>
            <span className="status built">Built</span>
          </div>
        </div>
      </header>

      <section className="panel">
        <h2>Input sources</h2>
        <div className="grid two">
          <label className="field">
            Total iron ingots per minute
            <input
              type="number"
              min="0"
              value={totalIngots}
              onChange={(event) => setTotalIngots(clampNumber(event.target.value))}
            />
          </label>
          <div className="field hint">
            <span>Source setup</span>
            <p>
              Start with deposits + miner tier, then cap with belt throughput.
              (Next step: add miners + purity calculators.)
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Recipes &amp; buildings</h2>
        <div className="table">
          <div className="row header">
            <span>Item</span>
            <span>Cost / min</span>
            <span>Creates / min</span>
            <span>Constructors</span>
            <span>Total cost</span>
            <span>Total creates</span>
          </div>
          {recipes.map((recipe) => {
            const totalCostRow = recipe.costPerMin * recipe.constructors;
            const totalOutputRow = recipe.outputPerMin * recipe.constructors;
            return (
              <div className="row" key={recipe.id}>
                <input
                  value={recipe.name}
                  onChange={(event) =>
                    updateRecipe(recipe.id, 'name', event.target.value)
                  }
                />
                <input
                  type="number"
                  min="0"
                  value={recipe.costPerMin}
                  onChange={(event) =>
                    updateRecipe(recipe.id, 'costPerMin', event.target.value)
                  }
                />
                <input
                  type="number"
                  min="0"
                  value={recipe.outputPerMin}
                  onChange={(event) =>
                    updateRecipe(recipe.id, 'outputPerMin', event.target.value)
                  }
                />
                <input
                  type="number"
                  min="0"
                  value={recipe.constructors}
                  onChange={(event) =>
                    updateRecipe(recipe.id, 'constructors', event.target.value)
                  }
                />
                <span>{totalCostRow}</span>
                <span>{totalOutputRow}</span>
              </div>
            );
          })}
        </div>

        <div className="totals">
          <div>
            <span>Total cost</span>
            <strong>{totalCost} ingots/min</strong>
          </div>
          <div>
            <span>Total output</span>
            <strong>{totalOutput} items/min</strong>
          </div>
          <div>
            <span>Ingots left</span>
            <strong>{leftover} ingots/min</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>100% efficiency suggestions</h2>
        <p className="subtle">
          Suggestions are sorted by closest match (lowest leftover first). Pick a
          layout and apply it, then adjust manually.
        </p>
        {suggestions.length === 0 ? (
          <p className="subtle">Add a positive input amount to see options.</p>
        ) : (
          <div className="suggestions">
            {suggestions.map((suggestion, index) => (
              <div className="suggestion" key={`${suggestion.totalCost}-${index}`}>
                <div className="suggestion-header">
                  <strong>
                    {suggestion.leftover === 0
                      ? 'Perfect 100%'
                      : `${suggestion.leftover} ingots left`}
                  </strong>
                  <span>{suggestion.efficiency.toFixed(1)}% efficiency</span>
                </div>
                <ul>
                  {recipes.map((recipe, recipeIndex) => (
                    <li key={recipe.id}>
                      {recipe.name}: {suggestion.counts[recipeIndex]} constructors
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => applySuggestion(suggestion)}>
                  Apply suggestion
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Unlocks &amp; constraints</h2>
        <div className="grid two">
          <div>
            <h3>Unlocked tiers / milestones</h3>
            <div className="checklist">
              {tierOptions.map((tier) => (
                <label key={tier}>
                  <input
                    type="checkbox"
                    checked={selectedTiers.has(tier)}
                    onChange={() => toggleTier(tier)}
                  />
                  {tier}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3>Section includes</h3>
            <div className="checklist">
              {facilityOptions.map((option) => (
                <label key={option.id}>
                  <input
                    type="checkbox"
                    checked={facilityToggles.has(option.id)}
                    onChange={() => toggleFacility(option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="subtle">
              These toggles will feed into recipe &amp; building filters once the
              full data catalog is wired in.
            </p>
          </div>
        </div>
      </section>

      <section className="panel note">
        <h2>Next steps</h2>
        <ul>
          <li>Add miner + purity inputs and belt throughput caps.</li>
          <li>Import full recipe dataset and alternates by tier.</li>
          <li>Link multiple sections into a global flow graph.</li>
          <li>Visualize concepts vs built sections with map overlays.</li>
        </ul>
      </section>
    </div>
  );
}
