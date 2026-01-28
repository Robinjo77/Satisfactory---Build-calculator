import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const statusOptions = ['Concept', 'Planned', 'Built'];
const tierOptions = [
  'Tier 0 - HUB Upgrade 1',
  'Tier 1 - Base Building',
  'Tier 2 - Part Assembly',
  'Tier 3 - Coal Power',
  'Tier 4 - Advanced Steel Production',
];
const missionOptions = [
  'Space Elevator - Phase 1',
  'Space Elevator - Phase 2',
  'Space Elevator - Phase 3',
];

const initialSections = [
  {
    id: 'section-smelting',
    name: 'Smelting Block A',
    status: 'Built',
    output: 'Iron Ingots',
    outputRate: 240,
    inputs: [
      { id: 'miner-1', type: 'Miner', label: 'Iron Node - Pure (Mk.2)', rate: 240 },
    ],
    destinations: ['Constructor Row 1', 'Storage Buffer'],
  },
  {
    id: 'section-plates',
    name: 'Plate Line',
    status: 'Planned',
    output: 'Iron Plates',
    outputRate: 120,
    inputs: [
      { id: 'section-smelting', type: 'Section', label: 'Smelting Block A', rate: 120 },
      { id: 'miner-2', type: 'Miner', label: 'Iron Node - Normal (Mk.1)', rate: 60 },
    ],
    destinations: ['Assembler Cluster'],
  },
  {
    id: 'section-rods',
    name: 'Rod + Screw Line',
    status: 'Concept',
    output: 'Rods & Screws',
    outputRate: 90,
    inputs: [
      { id: 'section-smelting', type: 'Section', label: 'Smelting Block A', rate: 90 },
    ],
    destinations: ['Storage Buffer'],
  },
];

const summaryCards = [
  {
    label: 'Total sections',
    helper: 'Concept + planned + built',
  },
  {
    label: 'Incoming sources',
    helper: 'Miner nodes + upstream sections',
  },
  {
    label: 'Throughput tracked',
    helper: 'Items per minute scheduled',
  },
];

const defaultSources = [
  {
    id: 'source-1',
    type: 'Miner',
    label: 'New miner source',
    rate: 60,
  },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [sections, setSections] = useState(initialSections);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    company: '',
  });
  const [profileSettings, setProfileSettings] = useState({
    tiers: new Set([tierOptions[0], tierOptions[1]]),
    mission: missionOptions[0],
  });
  const [newSection, setNewSection] = useState({
    name: 'New Section',
    status: statusOptions[0],
    output: 'Select output',
    outputRate: 0,
    inputs: defaultSources,
  });
  const [sectionError, setSectionError] = useState('');

  const summary = useMemo(() => {
    const totalSections = sections.length;
    const totalSources = sections.reduce(
      (sum, section) => sum + section.inputs.length,
      0,
    );
    const totalThroughput = sections.reduce(
      (sum, section) => sum + section.outputRate,
      0,
    );

    return {
      totalSections,
      totalSources,
      totalThroughput,
    };
  }, [sections]);

  const statusCounts = useMemo(() => {
    return statusOptions.reduce((acc, status) => {
      acc[status] = sections.filter((section) => section.status === status).length;
      return acc;
    }, {});
  }, [sections]);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      if (error) {
        setAuthError(error.message);
      }
      setIsAuthenticated(Boolean(data.session));
      setUser(data.session?.user ?? null);
      setIsSessionLoading(false);
    };

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setUser(session?.user ?? null);
      setIsSessionLoading(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthMessage('Signed in successfully. Redirecting to your dashboard.');
    }
    setIsAuthLoading(false);
  };

  const handleRegister = async () => {
    setIsAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    const { data, error } = await supabase.auth.signUp({
      email: registerForm.email,
      password: registerForm.password,
      options: {
        data: {
          company_name: registerForm.company,
        },
      },
    });
    if (error) {
      setAuthError(error.message);
    } else if (!data.session) {
      setAuthMessage(
        'Account created. Confirm the email link to activate your workspace.',
      );
    } else {
      setAuthMessage('Account created and signed in successfully.');
    }
    setIsAuthLoading(false);
  };

  const handleLogout = async () => {
    setIsAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
    }
    setIsAuthLoading(false);
  };

  const handleOpenAddSection = () => {
    setSectionError('');
    setNewSection({
      name: 'New Section',
      status: statusOptions[0],
      output: 'Select output',
      outputRate: 0,
      inputs: defaultSources,
    });
    setIsAddOpen(true);
  };

  const addSource = () => {
    setNewSection((prev) => ({
      ...prev,
      inputs: [
        ...prev.inputs,
        {
          id: `source-${Date.now()}`,
          type: 'Section',
          label: 'Upstream section',
          rate: 60,
        },
      ],
    }));
  };

  const updateSource = (index, field, value) => {
    setNewSection((prev) => ({
      ...prev,
      inputs: prev.inputs.map((input, inputIndex) =>
        inputIndex === index
          ? {
              ...input,
              [field]: field === 'rate' ? Number(value) : value,
            }
          : input,
      ),
    }));
  };

  const removeSource = (index) => {
    setNewSection((prev) => ({
      ...prev,
      inputs: prev.inputs.filter((_, inputIndex) => inputIndex !== index),
    }));
  };

  const saveSection = () => {
    if (newSection.inputs.length === 0) {
      setSectionError('Add at least one incoming source before saving.');
      return;
    }

    setSections((prev) => [
      ...prev,
      {
        id: `section-${Date.now()}`,
        name: newSection.name,
        status: newSection.status,
        output: newSection.output,
        outputRate: Number(newSection.outputRate),
        inputs: newSection.inputs,
        destinations: ['Unassigned'],
      },
    ]);
    setIsAddOpen(false);
  };

  const toggleTier = (tier) => {
    setProfileSettings((prev) => {
      const next = new Set(prev.tiers);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return {
        ...prev,
        tiers: next,
      };
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="app auth-page">
        <div className="app-bar">
          <div className="app-bar__brand">
            <span className="brand-mark">FICSIT</span>
            <span className="brand-sub">Flow Planner</span>
          </div>
          <div className="app-bar__meta">
            <span className="app-pill">Secure workspace</span>
            <span className="app-pill">R&amp;D Verified</span>
          </div>
        </div>
        <header className="topbar">
          <div>
            <p className="eyebrow">FICSIT Flow Operations</p>
            <h1>Secure workspace access</h1>
            <p className="lead">
              Sign in to keep every build private, sync sections across devices,
              and keep your factory data locked to your user.
            </p>
          </div>
          <div className="hero-tag">
            <span>Private by default</span>
            <span>Encrypted storage</span>
            <span>Per-user workspaces</span>
          </div>
        </header>

        <section className="panel auth-panel">
          <div className="auth-grid">
            <div className="auth-card">
              <h2>Sign in</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleLogin();
                }}
              >
                <label className="field">
                  Email
                  <input
                    type="email"
                    placeholder="engineer@ficsit.io"
                    value={loginForm.email}
                    onChange={(event) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  Password
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  type="submit"
                  className="primary"
                  disabled={
                    isAuthLoading ||
                    isSessionLoading ||
                    !loginForm.email ||
                    !loginForm.password
                  }
                >
                  {isAuthLoading ? 'Signing in…' : 'Continue to dashboard'}
                </button>
                <p className="helper">
                  Protected by workspace keys and activity logs.
                </p>
              </form>
            </div>
            <div className="auth-card">
              <h2>Create account</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleRegister();
                }}
              >
                <label className="field">
                  Email
                  <input
                    type="email"
                    placeholder="new@ficsit.io"
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  Password
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  Company name
                  <input
                    type="text"
                    placeholder="FICSIT Division"
                    value={registerForm.company}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        company: event.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  type="submit"
                  className="secondary"
                  disabled={
                    isAuthLoading ||
                    isSessionLoading ||
                    !registerForm.email ||
                    !registerForm.password ||
                    !registerForm.company
                  }
                >
                  {isAuthLoading ? 'Registering…' : 'Register workspace'}
                </button>
                <p className="helper">
                  New accounts get a default profile with Tier 1 unlocked.
                </p>
              </form>
            </div>
          </div>
          {isSessionLoading && (
            <div className="notice">
              <strong>Checking session</strong>
              <p>Verifying your Supabase session before loading the workspace.</p>
            </div>
          )}
          {(authError || authMessage) && (
            <div className="notice">
              {authError && <strong>Sign-in error</strong>}
              {authMessage && <strong>Authentication update</strong>}
              <p>{authError || authMessage}</p>
            </div>
          )}
          <div className="notice">
            <strong>Supabase connected</strong>
            <p>
              Use your Supabase credentials to access the workspace and keep your
              factory data synced across devices.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-bar">
        <div className="app-bar__brand">
          <span className="brand-mark">FICSIT</span>
          <span className="brand-sub">Flow Planner</span>
        </div>
        <nav className="app-bar__nav">
          <button type="button" className="tab active">
            Dashboard
          </button>
          <button type="button" className="tab">
            Sections
          </button>
          <button type="button" className="tab">
            Milestones
          </button>
          <button type="button" className="tab">
            Logistics
          </button>
        </nav>
        <div className="app-bar__meta">
          {user?.email && <span className="app-pill">{user.email}</span>}
          <span className="app-pill">Tier 2 Active</span>
          <span className="app-pill accent">SYNC OK</span>
          <button
            type="button"
            className="ghost"
            onClick={handleLogout}
            disabled={isAuthLoading}
          >
            {isAuthLoading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
      <header className="topbar">
        <div>
          <p className="eyebrow">FICSIT Flow Operations</p>
          <h1>Production control dashboard</h1>
          <p className="lead">
            Plan structured factory sections, enforce inbound sources, and keep
            milestones aligned with your active space elevator mission.
          </p>
        </div>
        <div className="status-stack">
          <div className="status-card">
            <span className="status-label">Section status</span>
            <div className="status-controls">
              {statusOptions.map((status) => (
                <span key={status} className={`status ${status.toLowerCase()}`}>
                  {status} · {statusCounts[status]}
                </span>
              ))}
            </div>
          </div>
          <div className="toolbar">
            <button type="button" className="secondary" onClick={() => setIsSettingsOpen(true)}>
              Profile settings
            </button>
            <button type="button" className="primary" onClick={handleOpenAddSection}>
              + Add section
            </button>
          </div>
        </div>
      </header>

      <section className="panel dashboard">
        <div className="summary-grid">
          {summaryCards.map((card) => (
            <div className="summary-card" key={card.label}>
              <span className="summary-label">{card.label}</span>
              <strong>
                {card.label === 'Total sections' && summary.totalSections}
                {card.label === 'Incoming sources' && summary.totalSources}
                {card.label === 'Throughput tracked' &&
                  `${summary.totalThroughput} / min`}
              </strong>
              <p className="subtle">{card.helper}</p>
            </div>
          ))}
        </div>

        <div className="dashboard-grid">
          <div className="panel activity-panel">
            <h2>Operational alerts</h2>
            <ul className="activity-list">
              <li>
                Smelting Block A is delivering ingots to two downstream sections.
              </li>
              <li>
                Plate Line needs one more miner input to hit 100% throughput.
              </li>
              <li>
                Rod + Screw Line is still a concept and waiting on a layout
                blueprint.
              </li>
            </ul>
            <div className="alert-card">
              <strong>Incoming source rule</strong>
              <p>
                Every section needs at least one inbound miner or upstream
                section before it can be marked as planned or built.
              </p>
            </div>
          </div>
          <div className="panel settings-panel">
            <h2>Active profile</h2>
            <p className="subtle">
              Your profile controls which tiers, milestones, and missions are
              available for planning.
            </p>
            <div className="settings-summary">
              <div>
                <span className="metric-label">Unlocked tiers</span>
                <strong>{profileSettings.tiers.size}</strong>
              </div>
              <div>
                <span className="metric-label">Active mission</span>
                <strong>{profileSettings.mission}</strong>
              </div>
            </div>
            <button type="button" className="secondary" onClick={() => setIsSettingsOpen(true)}>
              Update profile settings
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Production sections</h2>
            <p className="subtle">
              Each section shows its incoming sources, output focus, and status
              so you can maintain a clear, structured flow map.
            </p>
          </div>
          <div className="section-actions">
            <button type="button" className="secondary">
              Import layout
            </button>
            <button type="button" className="secondary">
              Export graph
            </button>
          </div>
        </div>
        <div className="section-grid">
          {sections.map((section) => (
            <article className="section-card" key={section.id}>
              <div className="section-card__header">
                <div>
                  <h3>{section.name}</h3>
                  <span className={`status-pill ${section.status.toLowerCase()}`}>
                    {section.status}
                  </span>
                </div>
                <button type="button" className="ghost">
                  Edit
                </button>
              </div>
              <div className="section-metrics">
                <div>
                  <span className="metric-label">Output</span>
                  <strong>{section.output}</strong>
                  <span className="metric-sub">
                    {section.outputRate} items / min
                  </span>
                </div>
                <div>
                  <span className="metric-label">Destinations</span>
                  <strong>{section.destinations.length}</strong>
                  <span className="metric-sub">
                    {section.destinations.join(', ')}
                  </span>
                </div>
              </div>
              <div className="section-sources">
                <span className="metric-label">Incoming sources</span>
                <ul>
                  {section.inputs.map((input) => (
                    <li key={input.id}>
                      <span className={`chip ${input.type.toLowerCase()}`}>
                        {input.type}
                      </span>
                      {input.label} · {input.rate} / min
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel note">
        <h2>Next steps</h2>
        <ul>
          <li>Connect sections with a drag-and-drop flow graph view.</li>
          <li>Add miner purity calculators and belt tier auto-validation.</li>
          <li>Enable private cloud sync with per-user access controls.</li>
          <li>Surface alerts when a section loses an incoming source.</li>
        </ul>
      </section>

      {isAddOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Add new section</h2>
                <p className="subtle">
                  Sections require at least one incoming source from a miner or
                  upstream section.
                </p>
              </div>
              <button type="button" className="ghost" onClick={() => setIsAddOpen(false)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <label className="field">
                Section name
                <input
                  type="text"
                  value={newSection.name}
                  onChange={(event) =>
                    setNewSection((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="grid two">
                <label className="field">
                  Status
                  <select
                    value={newSection.status}
                    onChange={(event) =>
                      setNewSection((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Output item
                  <input
                    type="text"
                    value={newSection.output}
                    onChange={(event) =>
                      setNewSection((prev) => ({
                        ...prev,
                        output: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="field">
                Output rate (items / min)
                <input
                  type="number"
                  min="0"
                  value={newSection.outputRate}
                  onChange={(event) =>
                    setNewSection((prev) => ({
                      ...prev,
                      outputRate: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="sources-block">
                <div className="sources-header">
                  <h3>Incoming sources</h3>
                  <button type="button" className="secondary" onClick={addSource}>
                    + Add source
                  </button>
                </div>
                {newSection.inputs.map((source, index) => (
                  <div className="source-row" key={source.id}>
                    <label className="field">
                      Type
                      <select
                        value={source.type}
                        onChange={(event) =>
                          updateSource(index, 'type', event.target.value)
                        }
                      >
                        <option value="Miner">Miner</option>
                        <option value="Section">Section</option>
                      </select>
                    </label>
                    <label className="field">
                      Source label
                      <input
                        type="text"
                        value={source.label}
                        onChange={(event) =>
                          updateSource(index, 'label', event.target.value)
                        }
                      />
                    </label>
                    <label className="field">
                      Rate / min
                      <input
                        type="number"
                        min="0"
                        value={source.rate}
                        onChange={(event) =>
                          updateSource(index, 'rate', event.target.value)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => removeSource(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {sectionError && <p className="error-text">{sectionError}</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="ghost" onClick={() => setIsAddOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={saveSection}>
                Save section
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Profile settings</h2>
                <p className="subtle">
                  Configure unlocked tiers and the active space elevator mission.
                </p>
              </div>
              <button type="button" className="ghost" onClick={() => setIsSettingsOpen(false)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <div className="settings-grid">
                <div>
                  <h3>Unlocked tiers</h3>
                  <div className="checklist">
                    {tierOptions.map((tier) => (
                      <label key={tier}>
                        <input
                          type="checkbox"
                          checked={profileSettings.tiers.has(tier)}
                          onChange={() => toggleTier(tier)}
                        />
                        {tier}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Space elevator mission</h3>
                  <div className="radio-list">
                    {missionOptions.map((mission) => (
                      <label key={mission}>
                        <input
                          type="radio"
                          name="mission"
                          checked={profileSettings.mission === mission}
                          onChange={() =>
                            setProfileSettings((prev) => ({
                              ...prev,
                              mission,
                            }))
                          }
                        />
                        {mission}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="primary" onClick={() => setIsSettingsOpen(false)}>
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
