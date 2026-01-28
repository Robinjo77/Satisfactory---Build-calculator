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

const sourceTypes = [
  { id: 'miner', label: 'Miner' },
  { id: 'section', label: 'From another section' },
];

const defaultSections = [
  {
    id: 'section-iron',
    name: 'Iron Smelting + Basics',
    status: 'concept',
    description: 'Feed iron ingots into plates + rods at 100% efficiency.',
    sources: [
      { id: 'source-iron-1', type: 'miner', label: 'Pure iron node (Mk.2)' },
    ],
    outputs: ['Iron plates', 'Iron rods'],
  },
  {
    id: 'section-reinforced',
    name: 'Reinforced Plates',
    status: 'built',
    description: 'Consumes plates + screws from upstream sections.',
    sources: [
      { id: 'source-plates', type: 'section', label: 'Iron Smelting + Basics' },
    ],
    outputs: ['Reinforced iron plates'],
  },
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
  const [sections, setSections] = useState(defaultSections);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [newSection, setNewSection] = useState({
    name: '',
    status: 'concept',
    description: '',
    sourceType: 'miner',
    sourceLabel: '',
    outputs: '',
  });

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

  const totalSections = sections.length;
  const builtSections = sections.filter((section) => section.status === 'built').length;
  const conceptSections = totalSections - builtSections;

  const addSection = () => {
    if (!newSection.name.trim() || !newSection.sourceLabel.trim()) {
      return;
    }
    const now = Date.now();
    const outputs = newSection.outputs
      .split(',')
      .map((output) => output.trim())
      .filter(Boolean);

    const created = {
      id: `section-${now}`,
      name: newSection.name.trim(),
      status: newSection.status,
      description: newSection.description.trim() || 'New production section.',
      sources: [
        {
          id: `source-${now}`,
          type: newSection.sourceType,
          label: newSection.sourceLabel.trim(),
        },
      ],
      outputs,
    };

    setSections((prev) => [...prev, created]);
    setNewSection({
      name: '',
      status: 'concept',
      description: '',
      sourceType: 'miner',
      sourceLabel: '',
      outputs: '',
    });
    setShowSectionForm(false);
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
        <div className="auth-card">
          <span className="status-label">Account access</span>
          <h3>Private projects (roadmap)</h3>
          <p>
            Log in and registration flows will protect each player&apos;s plan.
            This UI is a placeholder for the future auth service.
          </p>
          <div className="auth-actions">
            <button type="button">Log in</button>
            <button type="button" className="ghost">
              Create account
            </button>
          </div>
        </div>
      </header>

      <section className="panel dashboard">
        <div className="dashboard-header">
          <div>
            <h2>Dashboard</h2>
            <p className="subtle">
              Sections organize your flows. Each section has one or more incoming
              sources from miners or other sections.
            </p>
          </div>
          <button type="button" onClick={() => setShowSectionForm((prev) => !prev)}>
            {showSectionForm ? 'Close form' : 'Add section'}
          </button>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <span>Total sections</span>
            <strong>{totalSections}</strong>
          </div>
          <div className="summary-card">
            <span>Concept</span>
            <strong>{conceptSections}</strong>
          </div>
          <div className="summary-card">
            <span>Built</span>
            <strong>{builtSections}</strong>
          </div>
        </div>

        {showSectionForm && (
          <div className="section-form">
            <div className="grid two">
              <label className="field">
                Section name
                <input
                  value={newSection.name}
                  onChange={(event) =>
                    setNewSection((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                Status
                <select
                  value={newSection.status}
                  onChange={(event) =>
                    setNewSection((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  <option value="concept">Concept</option>
                  <option value="built">Built</option>
                </select>
              </label>
              <label className="field">
                Source type
                <select
                  value={newSection.sourceType}
                  onChange={(event) =>
                    setNewSection((prev) => ({
                      ...prev,
                      sourceType: event.target.value,
                    }))
                  }
                >
                  {sourceTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Source label
                <input
                  value={newSection.sourceLabel}
                  placeholder="e.g. Pure iron node (Mk.2)"
                  onChange={(event) =>
                    setNewSection((prev) => ({
                      ...prev,
                      sourceLabel: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className="field">
              Outputs (comma-separated)
              <input
                value={newSection.outputs}
                placeholder="Iron plates, Iron rods"
                onChange={(event) =>
                  setNewSection((prev) => ({ ...prev, outputs: event.target.value }))
                }
              />
            </label>
            <label className="field">
              Section notes
              <textarea
                rows="3"
                value={newSection.description}
                onChange={(event) =>
                  setNewSection((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <button type="button" onClick={addSection}>
              Save section
            </button>
          </div>
        )}

        <div className="section-grid">
          {sections.map((section) => (
            <article className="section-card" key={section.id}>
              <div className="section-header">
                <h3>{section.name}</h3>
                <span className={`status ${section.status}`}>
                  {section.status === 'built' ? 'Built' : 'Concept'}
                </span>
              </div>
              <p className="subtle">{section.description}</p>
              <div className="section-meta">
                <div>
                  <span className="meta-label">Incoming sources</span>
                  <ul>
                    {section.sources.map((source) => (
                      <li key={source.id}>
                        <strong>{source.type}</strong> · {source.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="meta-label">Outputs</span>
                  {section.outputs.length === 0 ? (
                    <p className="subtle">Define outputs for this section.</p>
                  ) : (
                    <ul>
                      {section.outputs.map((output) => (
                        <li key={output}>{output}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

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
