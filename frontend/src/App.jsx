import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, ArrowUpDown, BookMarked, BookOpen,
  BookPlus, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, CircleCheck, CircleHelp, Clock3, GraduationCap,
  Layers3, LayoutDashboard, LibraryBig, LoaderCircle, Mail, Menu, Plus, Search, Settings2,
  SlidersHorizontal, Sparkles, Users, UserRoundPlus, X, RotateCcw,
  Bookmark, Pencil, Trash2, Sun, Moon, House, LockKeyhole, LogOut
} from 'lucide-react';

const API =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8080/api';

async function api(path, options = {}) {
  const token = sessionStorage.getItem('shelfwise-token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || 'Unexpected server response.' }; }
  if (response.status === 401 && token) {
    sessionStorage.removeItem('shelfwise-token');
    sessionStorage.removeItem('shelfwise-user');
    window.dispatchEvent(new Event('shelfwise-auth-expired'));
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

const navItems = [
  { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'Books', icon: BookOpen, label: 'Books' },
  { id: 'Members', icon: Users, label: 'Members' },
  { id: 'Circulation', icon: RotateCcw, label: 'Circulation' },
];
const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const formatDate = (s) => s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function App() {
  const [page, setPage] = useState('Dashboard');
  // Always open the public-style welcome screen on a fresh page load.
  const [showWelcome, setShowWelcome] = useState(true);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [dashboard, setDashboard] = useState({ totalTitles: 0, totalCopies: 0, members: 0, activeIssues: 0, overdue: 0, popularBooks: [] });
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [selectedBook, setSelectedBook] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('shelfwise-theme') || 'dark');
  const [authChecked, setAuthChecked] = useState(() => !sessionStorage.getItem('shelfwise-token'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem('shelfwise-token')));
  const [authUser, setAuthUser] = useState(() => sessionStorage.getItem('shelfwise-user') || '');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('shelfwise-theme', theme);
  }, [theme]);

  // Validate a previously signed-in session with the Java backend.
  useEffect(() => {
    const token = sessionStorage.getItem('shelfwise-token');
    if (!token) {
      setAuthChecked(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    api('/auth/me')
      .then(data => {
        if (cancelled) return;
        setAuthUser(data.username || sessionStorage.getItem('shelfwise-user') || '');
        setIsAuthenticated(true);
      })
      .catch(() => {
        sessionStorage.removeItem('shelfwise-token');
        sessionStorage.removeItem('shelfwise-user');
        if (cancelled) return;
        setAuthUser('');
        setIsAuthenticated(false);
      })
      .finally(() => { if (!cancelled) setAuthChecked(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setIsAuthenticated(false);
      setAuthUser('');
      setAuthError('Your session has expired. Please sign in again.');
      setLoading(false);
    };
    window.addEventListener('shelfwise-auth-expired', onExpired);
    return () => window.removeEventListener('shelfwise-auth-expired', onExpired);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [d, b, m, i] = await Promise.all([
        api('/dashboard'), api('/books'), api('/members'), api('/issues')
      ]);
      setDashboard(d); setBooks(b); setMembers(m); setIssues(i); setError('');
    } catch (e) {
      setError('The Java backend is not connected. Start the backend terminal, then refresh this page.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (isAuthenticated) {
      setLoading(true);
      refreshData();
    } else {
      setLoading(false);
    }
  }, [authChecked, isAuthenticated, refreshData]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3600);
    return () => clearTimeout(timer);
  }, [notice]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return books;
    return books.filter(b => `${b.title} ${b.author} ${b.id}`.toLowerCase().includes(q));
  }, [books, search]);
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => `${m.name} ${m.email} ${m.type} ${m.id} ${m.department || ''} ${m.yearOfStudy || ''} ${m.registerNumber || ''} ${m.phone || ''} ${m.designation || ''}`.toLowerCase().includes(q));
  }, [members, search]);

  const openDialog = (type, record = null) => {
    if (type === 'issue') {
      setSelectedBook(record ? String(record) : '');
      setEditingRecord(null);
    } else {
      setSelectedBook('');
      setEditingRecord(record);
    }
    setDialog(type);
  };
  const goTo = (id) => { setPage(id); setSearch(''); setMobileNav(false); };

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      if (dialog === 'book' || dialog === 'editBook') {
        const payload = { title: form.get('title'), author: form.get('author'), copies: Number(form.get('copies')) };
        if (dialog === 'editBook') {
          await api(`/books/${editingRecord.id}`, { method: 'PUT', body: JSON.stringify(payload) });
          setNotice({ kind: 'success', text: 'Book details and available copies updated.' });
        } else {
          await api('/books', { method: 'POST', body: JSON.stringify(payload) });
          setNotice({ kind: 'success', text: 'Book added to your collection.' });
        }
      } else if (dialog === 'member' || dialog === 'editMember') {
        const payload = { name: form.get('name'), email: form.get('email'), type: form.get('type'), department: form.get('department'), yearOfStudy: form.get('yearOfStudy') || '', registerNumber: form.get('registerNumber') || '', phone: form.get('phone') || '', designation: form.get('designation') || '' };
        if (dialog === 'editMember') {
          await api(`/members/${editingRecord.id}`, { method: 'PUT', body: JSON.stringify(payload) });
          setNotice({ kind: 'success', text: 'Member details updated.' });
        } else {
          await api('/members', { method: 'POST', body: JSON.stringify(payload) });
          setNotice({ kind: 'success', text: 'Member registered successfully.' });
        }
      } else if (dialog === 'issue') {
        await api('/issues', { method: 'POST', body: JSON.stringify({ memberId: Number(form.get('memberId')), bookId: Number(form.get('bookId')) }) });
        setNotice({ kind: 'success', text: 'Book issued. Due date is 14 days from today.' });
      }
      setDialog(null); await refreshData();
    } catch (e) { setNotice({ kind: 'error', text: e.message }); }
    finally { setSaving(false); }
  }

  async function deleteBook(book) {
    if (!window.confirm(`Delete “${book.title}”? This is only allowed when the book has no circulation history.`)) return;
    try {
      await api(`/books/${book.id}`, { method: 'DELETE' });
      setNotice({ kind: 'success', text: 'Book deleted.' });
      await refreshData();
    } catch (e) { setNotice({ kind: 'error', text: e.message }); }
  }

  async function deleteMember(member) {
    if (!window.confirm(`Delete ${member.name}? This is only allowed when the member has no circulation history.`)) return;
    try {
      await api(`/members/${member.id}`, { method: 'DELETE' });
      setNotice({ kind: 'success', text: 'Member deleted.' });
      await refreshData();
    } catch (e) { setNotice({ kind: 'error', text: e.message }); }
  }

  async function returnBook(issue) {
    try {
      const result = await api(`/issues/${issue.id}/return`, { method: 'POST', body: '{}' });
      setNotice({ kind: 'success', text: result.fine > 0 ? `Returned. Fine: ₹${Number(result.fine).toFixed(2)}` : 'Book returned successfully — no fine.' });
      await refreshData();
    } catch (e) { setNotice({ kind: 'error', text: e.message }); }
  }

  async function handleLogin(username, password) {
    setAuthBusy(true);
    setAuthError('');
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      sessionStorage.setItem('shelfwise-token', data.token);
      sessionStorage.setItem('shelfwise-user', data.username);
      setAuthUser(data.username);
      setIsAuthenticated(true);
      setShowWelcome(false);
      setPage('Dashboard');
      setSearch('');
      setLoading(true);
    } catch (e) {
      setAuthError(e.message || 'Unable to sign in. Check your user ID and password.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      if (sessionStorage.getItem('shelfwise-token')) {
        await api('/auth/logout', { method: 'POST', body: '{}' });
      }
    } catch (_) {
      // Clear the local session even if the backend is temporarily unreachable.
    } finally {
      sessionStorage.removeItem('shelfwise-token');
      sessionStorage.removeItem('shelfwise-user');
      setIsAuthenticated(false);
      setAuthUser('');
      setAuthError('');
      setShowWelcome(true);
      setPage('Dashboard');
      setBooks([]); setMembers([]); setIssues([]);
      setDashboard({ totalTitles: 0, totalCopies: 0, members: 0, activeIssues: 0, overdue: 0, popularBooks: [] });
      setLoading(false);
    }
  }

  const title = page === 'Dashboard' ? 'Dashboard' : page;
  const toggleTheme = () => setTheme(current => current === 'light' ? 'dark' : 'light');
  const subtitle = {
    Dashboard: 'A clear picture of what’s happening in your library.',
    Books: 'Manage your collection, check availability, and find a title.',
    Members: 'Keep your student and faculty registrations in one place.',
    Circulation: 'Track active loans, due dates, and book returns.',
  }[page];

  if (!authChecked) {
    return <main className={`welcome-screen ${theme === 'dark' ? 'welcome-dark' : 'welcome-light'}`} data-theme={theme} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><LoaderCircle className="spin" size={22} /> Checking your Shelfwise session…</div>
    </main>;
  }

  if (showWelcome) {
    return <WelcomeHome
      theme={theme}
      onToggleTheme={toggleTheme}
      onEnter={() => { setPage('Dashboard'); setShowWelcome(false); setSearch(''); setAuthError(''); }}
      onExplore={() => document.getElementById('welcome-features')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
    />;
  }

  if (!isAuthenticated) {
    return <LoginScreen theme={theme} onToggleTheme={toggleTheme} onBack={() => { setShowWelcome(true); setAuthError(''); }} onLogin={handleLogin} busy={authBusy} error={authError} />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><LibraryBig size={22} strokeWidth={2.2} /></div>
          <div className="brand-copy"><span>Shelfwise</span><small>LIBRARY SPACE</small></div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">C</div><div className="workspace-text"><b>Campus Library</b><small>Workspace</small></div><ChevronDown size={15} className="muted-icon" />
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => goTo(item.id)} className={`nav-item ${page === item.id ? 'active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'Circulation' && dashboard.activeIssues > 0 && <span className="nav-count">{dashboard.activeIssues}</span>}
            </button>;
          })}
        </nav>
        <button className="nav-item welcome-nav-item" onClick={() => { setShowWelcome(true); setMobileNav(false); }}><House size={18} strokeWidth={1.8} /><span>Welcome home</span></button>
        <div className="side-label collection-label">YOUR LIBRARY</div>
        <button className="nav-item" onClick={() => { goTo('Books'); setSearch(''); }}><Bookmark size={18} strokeWidth={1.8} /><span>Book collection</span></button>
        <button className="nav-item" onClick={() => goTo('Members')}><GraduationCap size={18} strokeWidth={1.8} /><span>Student & faculty</span></button>
        <div className="sidebar-spacer" />
        <div className="help-card">
          <div className="help-icon"><Sparkles size={17} /></div><div><b>Little things add up.</b><p>A well-organised library starts with one good system.</p></div>
        </div>
        <div className="profile-row">
          <div className="profile-avatar">{(authUser || 'Admin').slice(0, 2).toUpperCase()}</div><div className="profile-info"><b>{authUser || 'Library Admin'}</b><small>Authenticated team member</small></div><button className="icon-button" onClick={handleLogout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
        </div>
      </aside>
      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><b>{title}</b></div>
          <div className="topbar-right">
            <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}><span className="theme-toggle-icon">{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</span><span className="theme-toggle-label">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span><span className={`theme-switch ${theme === 'dark' ? 'is-dark' : ''}`}><i /></span></button>
            <div className="date-chip"><CalendarDays size={15} /><span>{today}</span></div>
            <div className="connection-state"><span className={`status-dot ${error ? 'offline' : ''}`} />{error ? 'Offline' : 'Connected'}</div>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="backend-alert"><AlertCircle size={17} /><div><b>Backend connection needed</b><span>{error}</span></div><button onClick={refreshData}>Retry connection</button></div>}
          <section className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR LIBRARY, AT A GLANCE</div><h1>{page === 'Dashboard' ? 'Your library, beautifully organised.' : title}</h1><p>{subtitle}</p></div>
            <div className="heading-actions">
              {page === 'Dashboard' && <button className="button button-secondary" onClick={() => goTo('Circulation')}><Activity size={16} /> View activity</button>}
              {page === 'Books' && <button className="button button-primary" onClick={() => openDialog('book')}><Plus size={17} /> Add book</button>}
              {page === 'Members' && <button className="button button-primary" onClick={() => openDialog('member')}><UserRoundPlus size={17} /> Add member</button>}
              {page === 'Circulation' && <button className="button button-primary" onClick={() => openDialog('issue')}><BookPlus size={17} /> Issue a book</button>}
            </div>
          </section>

          {page === 'Dashboard' && <DashboardView dashboard={dashboard} issues={issues} books={books} loading={loading} onPage={goTo} onReturn={returnBook} onIssue={() => openDialog('issue')} />}
          {page === 'Books' && <BooksView books={filteredBooks} search={search} setSearch={setSearch} onAdd={() => openDialog('book')} onEdit={(book) => openDialog('editBook', book)} onDelete={deleteBook} onIssue={(id) => openDialog('issue', id)} loading={loading} />}
          {page === 'Members' && <MembersView members={filteredMembers} search={search} setSearch={setSearch} onAdd={() => openDialog('member')} onEdit={(member) => openDialog('editMember', member)} onDelete={deleteMember} loading={loading} />}
          {page === 'Circulation' && <CirculationView issues={issues} onReturn={returnBook} onIssue={() => openDialog('issue')} loading={loading} />}
          <footer className="page-footer"><span><span className="footer-dot" /> All changes are saved to your library database</span><span>Made for better reading days <BookMarked size={14} /></span></footer>
        </div>
      </main>

      {notice && <div className={`toast ${notice.kind}`} role="status"><span className="toast-icon">{notice.kind === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}</span><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={15} /></button></div>}
      {dialog && <Dialog type={dialog} books={books} members={members} selectedBook={selectedBook} record={editingRecord} saving={saving} onClose={() => setDialog(null)} onSubmit={handleSubmit} />}
    </div>
  );
}

function LoginScreen({ theme, onToggleTheme, onBack, onLogin, busy, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dark = theme === 'dark';
  const card = {
    width: 'min(100%, 430px)', boxSizing: 'border-box', padding: 'clamp(24px, 5vw, 38px)',
    borderRadius: 24, border: `1px solid ${dark ? 'rgba(148,163,184,.24)' : 'rgba(100,116,139,.22)'}`,
    background: dark ? 'rgba(15, 28, 51, .88)' : 'rgba(255,255,255,.92)',
    boxShadow: dark ? '0 24px 70px rgba(0,0,0,.28)' : '0 24px 70px rgba(30,64,175,.12)',
    color: dark ? '#eef4ff' : '#172b49',
  };
  const field = {
    width: '100%', boxSizing: 'border-box', marginTop: 8, padding: '13px 14px', borderRadius: 12,
    border: `1px solid ${dark ? 'rgba(148,163,184,.30)' : '#cbd5e1'}`,
    background: dark ? '#0b172b' : '#ffffff', color: dark ? '#eef4ff' : '#172b49', fontSize: 15,
    outlineOffset: 2,
  };
  return <main className={`welcome-screen ${dark ? 'welcome-dark' : 'welcome-light'}`} data-theme={theme} style={{ minHeight: '100vh', boxSizing: 'border-box', padding: '0 5vw 32px' }}>
    <header className="welcome-header">
      <div className="welcome-brand"><div className="welcome-brand-mark"><LibraryBig size={25} strokeWidth={2.1} /></div><div><b>Shelfwise</b><span>LIBRARY SPACE</span></div></div>
      <div className="welcome-header-actions">
        <button className="theme-toggle welcome-theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}><span className="theme-toggle-icon">{dark ? <Sun size={16} /> : <Moon size={16} />}</span><span className="theme-toggle-label">{dark ? 'Light mode' : 'Dark mode'}</span><span className={`theme-switch ${dark ? 'is-dark' : ''}`}><i /></span></button>
      </div>
    </header>
    <section style={{ display: 'grid', placeItems: 'center', padding: 'clamp(36px, 7vh, 72px) 0 24px' }}>
      <div style={card}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 15, background: 'linear-gradient(135deg,#4f65f5,#14b8c8)', color: '#fff', marginBottom: 20 }}><LockKeyhole size={23} /></div>
        <div style={{ color: dark ? '#67d3ef' : '#3268e8', fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 10 }}>TEAM ACCESS</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.15, letterSpacing: '-.7px' }}>Sign in to Shelfwise</h1>
        <p style={{ margin: '0 0 26px', lineHeight: 1.65, color: dark ? '#aebed5' : '#607086', fontSize: 14 }}>Use the account provided to you by your Shelfwise team administrator. Public registration is disabled.</p>
        {error && <div role="alert" style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, color: dark ? '#fecaca' : '#991b1b', background: dark ? 'rgba(127,29,29,.35)' : '#fee2e2', border: '1px solid #ef444455', fontSize: 13 }}>{error}</div>}
        <form onSubmit={e => { e.preventDefault(); onLogin(username.trim(), password); }}>
          <label style={{ display: 'block', marginBottom: 18, fontSize: 13, fontWeight: 700 }}>User ID<input autoComplete="username" name="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your user ID" required maxLength={60} style={field} /></label>
          <label style={{ display: 'block', marginBottom: 22, fontSize: 13, fontWeight: 700 }}>Password<input autoComplete="current-password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required maxLength={200} style={field} /></label>
          <button type="submit" className="welcome-enter-button" disabled={busy} style={{ width: '100%', justifyContent: 'center', opacity: busy ? .75 : 1 }}>{busy && <LoaderCircle size={17} className="spin" />}{busy ? 'Signing in…' : 'Sign in to dashboard'} <ArrowRight size={18} /></button>
        </form>
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${dark ? 'rgba(148,163,184,.18)' : '#e2e8f0'}`, color: dark ? '#8ea1bd' : '#64748b', fontSize: 12, lineHeight: 1.6 }}>Only the four configured team accounts can sign in. Contact the administrator if you need access.</div>
        <button className="welcome-explore-button" onClick={onBack} style={{ marginTop: 16 }}><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to welcome page</button>
      </div>
    </section>
  </main>;
}

function WelcomeHome({ theme, onToggleTheme, onEnter, onExplore }) {
  const dark = theme === 'dark';
  return <main className={`welcome-screen ${dark ? 'welcome-dark' : 'welcome-light'}`} data-theme={theme}>
    <header className="welcome-header">
      <div className="welcome-brand">
        <div className="welcome-brand-mark"><LibraryBig size={25} strokeWidth={2.1} /></div>
        <div><b>Shelfwise</b><span>LIBRARY SPACE</span></div>
      </div>
      <div className="welcome-header-actions">
        <span className="welcome-live"><i /> Your campus library</span>
        <button className="theme-toggle welcome-theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}>
          <span className="theme-toggle-icon">{dark ? <Sun size={16} /> : <Moon size={16} />}</span>
          <span className="theme-toggle-label">{dark ? 'Light mode' : 'Dark mode'}</span>
          <span className={`theme-switch ${dark ? 'is-dark' : ''}`}><i /></span>
        </button>
      </div>
    </header>
    <section className="welcome-hero">
      <div className="welcome-copy">
        <div className="welcome-eyebrow"><Sparkles size={15} /> YOUR CAMPUS LIBRARY, REIMAGINED</div>
        <h1>Welcome to <span>Shelfwise</span><br />Library Space.</h1>
        <p className="welcome-subtitle">A calmer, smarter space to manage your library. Keep books organised, make member management easy, and track every issue and return in one place.</p>
        <div className="welcome-actions">
          <button className="welcome-enter-button" onClick={onEnter}>Enter Dashboard <ArrowRight size={19} /></button>
          <button className="welcome-explore-button" onClick={onExplore}><BookOpen size={18} /> Discover the workspace</button>
        </div>
        <div className="welcome-trust-row"><span><Check size={14} /> Real-time library records</span><span><Check size={14} /> Student & faculty rules</span><span><Check size={14} /> Quick issue & return</span></div>
      </div>
      <div className="welcome-art" aria-label="Illustration of a library collection">
        <div className="art-halo halo-one" /><div className="art-halo halo-two" />
        <div className="art-window"><div className="window-glow" /><div className="window-mullion" /><div className="window-sill" /></div>
        <div className="art-shelf shelf-top"><span /><span /><span /><span /><span /><span /></div>
        <div className="art-shelf shelf-bottom"><span /><span /><span /><span /><span /><span /><span /></div>
        <div className="art-plant"><i /><i /><i /><b /></div>
        <div className="art-book-card card-atomic"><div className="mini-book-cover cover-sapphire">A</div><div><b>Atomic Habits</b><span>James Clear</span><em><i /></em><small>Personal growth</small></div></div>
        <div className="art-book-card card-alchemist"><div className="mini-book-cover cover-amber">✦</div><div><b>The Alchemist</b><span>Paulo Coelho</span><em><i /></em><small>Fiction & discovery</small></div></div>
        <div className="art-stat-pill"><BookMarked size={16} /><div><b>One organised space</b><span>Books · Members · Circulation</span></div></div>
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
      </div>
    </section>
    <section id="welcome-features" className="welcome-feature-grid">
      <article className="welcome-feature feature-blue"><span><BookOpen size={20} /></span><div><b>Books & inventory</b><p>Organise your collection and keep stock up to date.</p></div><ArrowUpRight size={17} /></article>
      <article className="welcome-feature feature-violet"><span><Users size={20} /></span><div><b>Student & faculty</b><p>Keep campus member information easy to manage.</p></div><ArrowUpRight size={17} /></article>
      <article className="welcome-feature feature-amber"><span><RotateCcw size={20} /></span><div><b>Issue & return</b><p>Stay on top of loan periods and overdue fines.</p></div><ArrowUpRight size={17} /></article>
      <article className="welcome-feature feature-teal"><span><ChartNoAxesCombined size={20} /></span><div><b>Clear insights</b><p>See the library activity at a glance.</p></div><ArrowUpRight size={17} /></article>
    </section>
    <footer className="welcome-footer"><span>© {new Date().getFullYear()} Shelfwise Library Space</span><span>Built for better reading days <BookMarked size={14} /></span></footer>
  </main>;
}

function StatCard({ icon: Icon, label, value, note, trend, tone }) {
  return <article className="stat-card"><div className="stat-top"><div className={`stat-icon ${tone}`}><Icon size={19} strokeWidth={1.9} /></div><span className="stat-note">{note}</span></div><div className="stat-number">{value}</div><div className="stat-bottom"><span>{label}</span>{trend && <span className="tiny-trend"><ArrowUpRight size={13} /> Live</span>}</div></article>;
}

function DashboardView({ dashboard, issues, books, loading, onPage, onReturn, onIssue }) {
  const maxIssued = Math.max(1, ...(dashboard.popularBooks || []).map(b => b.issued || 0));
  return <>
    <section className="stats-grid">
      <StatCard icon={BookOpen} tone="mint" label="Book titles" value={dashboard.totalTitles ?? 0} note="In collection" trend />
      <StatCard icon={Layers3} tone="lavender" label="Physical copies" value={dashboard.totalCopies ?? 0} note="Available stock" />
      <StatCard icon={Users} tone="peach" label="Registered members" value={dashboard.members ?? 0} note="Students & faculty" />
      <StatCard icon={Clock3} tone="blue" label="Books on loan" value={dashboard.activeIssues ?? 0} note="Currently issued" />
    </section>
    <section className="content-grid dashboard-grid">
      <article className="panel collection-panel">
        <div className="panel-heading"><div><span className="panel-kicker">YOUR COLLECTION</span><h2>Popular reads</h2><p>The books your readers keep coming back to.</p></div><button className="text-action" onClick={() => onPage('Books')}>All books <ArrowRight size={15} /></button></div>
        {(dashboard.popularBooks || []).length ? <div className="popular-list">{dashboard.popularBooks.map((book, index) => <div className="popular-row" key={book.id}><div className={`book-cover cover-${index % 5}`}><BookOpen size={20} /></div><div className="popular-info"><b>{book.title}</b><span>{book.author}</span></div><div className="popular-count"><b>{book.issued}</b><span>loans</span></div><div className="popular-bar"><span style={{ width: `${Math.max(7, (book.issued / maxIssued) * 100)}%` }} /></div></div>)}</div> : <EmptyState icon={BookOpen} title="Your shelves are waiting" text="Add a few books and they’ll show up here." action="Add your first book" onClick={() => onPage('Books')} />}
        <div className="collection-footer"><div className="mini-stack"><span><BookOpen size={13} /></span><span><BookMarked size={13} /></span><span><Bookmark size={13} /></span></div><span><b>{dashboard.totalTitles ?? 0} titles</b> living in your collection</span><button className="round-arrow" onClick={() => onPage('Books')} aria-label="View books"><ArrowRight size={16} /></button></div>
      </article>
      <article className="panel needs-panel">
        <div className="panel-heading"><div><span className="panel-kicker">A QUICK CHECK-IN</span><h2>Circulation pulse</h2><p>Know what needs a little attention.</p></div><div className="pulse-icon"><ChartNoAxesCombined size={18} /></div></div>
        <div className="pulse-number-row"><div><div className="pulse-number">{dashboard.activeIssues ?? 0}</div><span className="pulse-label">active loans</span></div><div className="pulse-divider" /><div><div className={`pulse-number ${dashboard.overdue > 0 ? 'warning-number' : ''}`}>{dashboard.overdue ?? 0}</div><span className="pulse-label">past due</span></div></div>
        <div className={`attention-note ${dashboard.overdue > 0 ? 'attention-warning' : ''}`}><span className="attention-bullet">{dashboard.overdue > 0 ? <AlertCircle size={15} /> : <CircleCheck size={15} />}</span><div><b>{dashboard.overdue > 0 ? 'A few books need a nudge' : 'Everything looks in order'}</b><p>{dashboard.overdue > 0 ? `${dashboard.overdue} active loan(s) are past their due date.` : 'No overdue books have been recorded right now.'}</p></div></div>
        <button className="button button-secondary full-button" onClick={() => onPage('Circulation')}>Review circulation <ArrowRight size={16} /></button>
      </article>
    </section>
    <section className="panel loans-panel">
      <div className="panel-heading loan-panel-heading"><div><span className="panel-kicker">OUT IN THE WORLD</span><h2>Currently on loan</h2><p>A peek at the books readers are enjoying.</p></div><button className="button button-light" onClick={onIssue}><Plus size={16} /> Issue book</button></div>
      <IssueTable issues={issues.slice(0, 5)} onReturn={onReturn} compact />
      <div className="table-bottom"><span>Showing {Math.min(issues.length, 5)} of {issues.length} active loan(s)</span><button className="text-action" onClick={() => onPage('Circulation')}>See all activity <ArrowRight size={15} /></button></div>
    </section>
  </>;
}

function SearchBox({ value, onChange, placeholder = 'Search by title, author...' }) {
  return <div className="search-box"><Search size={17} /><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /><kbd>⌘ K</kbd></div>;
}

function BooksView({ books, search, setSearch, onAdd, onEdit, onDelete, onIssue, loading }) {
  return <section className="panel data-panel"><div className="data-toolbar"><div><h2>Your book collection</h2><p>{books.length} result(s) in your current view · edit details or adjust available stock</p></div><div className="toolbar-actions"><SearchBox value={search} onChange={setSearch} /><button className="icon-square" title="Sort by ID"><ArrowUpDown size={17} /></button></div></div>
    <div className="table-wrap"><table><thead><tr><th>BOOK</th><th>AUTHOR</th><th>BOOK ID</th><th>AVAILABLE COPIES</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      {loading ? <LoadingRow cols={6} /> : books.length ? books.map(book => <tr key={book.id}><td><div className="book-cell"><div className={`book-cover small-cover cover-${book.id % 5}`}><BookOpen size={17} /></div><div><b>{book.title}</b><span>Library collection</span></div></div></td><td>{book.author}</td><td><span className="id-pill">BK-{String(book.id).padStart(3, '0')}</span></td><td><b className="copy-count">{book.copies}</b></td><td><span className={`status-pill ${book.copies > 0 ? 'available' : 'unavailable'}`}><span />{book.copies > 0 ? 'Available' : 'Out of stock'}</span></td><td><div className="row-actions"><button className="row-action" onClick={() => onEdit(book)} title="Edit book"><Pencil size={14} /> Edit</button><button className="row-action danger-action" onClick={() => onDelete(book)} title="Delete book"><Trash2 size={14} /> Delete</button><button className="row-action" disabled={book.copies < 1} onClick={() => onIssue(book.id)} title="Issue book">Issue <ArrowRight size={14} /></button></div></td></tr>) : <tr><td colSpan="6"><EmptyState icon={BookOpen} title="No books found" text={search ? 'Try a different title or author.' : 'Add a book to start your collection.'} action="Add a book" onClick={onAdd} /></td></tr>}
    </tbody></table></div>
    <div className="table-bottom"><span><span className="footer-dot" /> Synced with the SQLite database</span><span>{books.reduce((sum, b) => sum + Number(b.copies || 0), 0)} available copies in visible results</span></div>
  </section>;
}

function MembersView({ members, search, setSearch, onAdd, onEdit, onDelete, loading }) {
  return <section className="panel data-panel"><div className="data-toolbar"><div><h2>Library members</h2><p>Students and faculty with borrowing access. Edit member details anytime.</p></div><div className="toolbar-actions"><SearchBox value={search} onChange={setSearch} placeholder="Search name, email..." /><button className="icon-square" title="Filter members"><SlidersHorizontal size={17} /></button></div></div>
    <div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>MEMBER ID</th><th>TYPE</th><th>BOOK LIMIT</th><th>FINE / DAY</th><th>EMAIL</th><th>ACTIONS</th></tr></thead><tbody>
      {loading ? <LoadingRow cols={7} /> : members.length ? members.map((m, index) => <tr key={m.id}><td><div className="member-cell"><div className={`member-avatar avatar-${index % 5}`}>{m.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}</div><div><b>{m.name}</b><span>{m.department || 'Department not set'}{m.type === 'STUDENT' && m.yearOfStudy ? ` · ${m.yearOfStudy}` : ''}{m.type === 'FACULTY' && m.designation ? ` · ${m.designation}` : ''}</span>{m.registerNumber && <span>ID: {m.registerNumber}</span>}{m.phone && <span>Phone: {m.phone}</span>}</div></div></td><td><span className="id-pill">MB-{String(m.id).padStart(3, '0')}</span></td><td><span className={`role-pill ${m.type === 'FACULTY' ? 'faculty' : 'student'}`}>{m.type === 'FACULTY' ? 'Faculty' : 'Student'}</span></td><td>{m.maxBooks} books</td><td><span className="fine-rate-pill">₹{Number(m.finePerDay).toFixed(0)}<small>/day</small></span></td><td><span className="email-cell"><Mail size={14} />{m.email}</span></td><td><div className="row-actions"><button className="row-action" onClick={() => onEdit(m)} title="Edit member"><Pencil size={14} /> Edit</button><button className="row-action danger-action" onClick={() => onDelete(m)} title="Delete member"><Trash2 size={14} /> Delete</button></div></td></tr>) : <tr><td colSpan="7"><EmptyState icon={Users} title="No members yet" text={search ? 'Try a different name or email.' : 'Register students and faculty to begin issuing books.'} action="Add a member" onClick={onAdd} /></td></tr>}
    </tbody></table></div><div className="table-bottom"><span><span className="footer-dot" /> Member rules are applied automatically</span><span>{members.filter(m => m.type === 'STUDENT').length} students · {members.filter(m => m.type === 'FACULTY').length} faculty</span></div>
  </section>;
}

function CirculationView({ issues, onReturn, onIssue, loading }) {
  return <section className="panel data-panel"><div className="data-toolbar"><div><h2>Active loans</h2><p>Every book currently checked out, with its due date.</p></div><div className="toolbar-actions"><span className="table-summary"><span className="status-indicator" /> {issues.length} active</span><button className="button button-primary" onClick={onIssue}><Plus size={16} /> Issue a book</button></div></div>
    <IssueTable issues={issues} onReturn={onReturn} loading={loading} />
    <div className="table-bottom"><span><span className="footer-dot" /> Loan period: 14 days</span><span>Student limit: 3 books · Faculty limit: 10 books</span></div>
  </section>;
}

function IssueTable({ issues, onReturn, compact = false, loading = false }) {
  return <div className="table-wrap"><table className="issue-table"><thead><tr><th>BOOK & MEMBER</th><th>ISSUE DATE</th><th>DUE DATE</th><th>STATUS</th><th></th></tr></thead><tbody>
    {loading ? <LoadingRow cols={5} /> : issues.length ? issues.map(issue => {
      const overdue = new Date(`${issue.dueDate}T23:59:59`) < new Date();
      return <tr key={issue.id}><td><div className="loan-cell"><div className={`book-cover tiny-cover cover-${issue.bookId % 5}`}><BookOpen size={15} /></div><div><b>{issue.bookTitle}</b><span>{issue.memberName} <i>·</i> {issue.memberType === 'FACULTY' ? 'Faculty' : 'Student'}</span></div></div></td><td>{formatDate(issue.issueDate)}</td><td><span className={overdue ? 'due-overdue' : ''}>{formatDate(issue.dueDate)}</span></td><td><span className={`status-pill ${overdue ? 'late' : 'on-loan'}`}><span />{overdue ? 'Overdue' : 'On loan'}</span></td><td><button className="row-action" onClick={() => onReturn(issue)}>Return <ArrowRight size={14} /></button></td></tr>;
    }) : <tr><td colSpan="5"><div className="empty-inline"><div className="empty-icon"><CircleCheck size={22} /></div><div><b>No active loans</b><span>All books are back on the shelves. Nice work.</span></div></div></td></tr>}
  </tbody></table></div>;
}

function LoadingRow({ cols }) { return <tr><td colSpan={cols}><div className="loading-inline"><LoaderCircle size={18} className="spin" /> Loading your library data…</div></td></tr>; }
function EmptyState({ icon: Icon, title, text, action, onClick }) { return <div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><b>{title}</b><p>{text}</p>{action && <button className="text-action" onClick={onClick}>{action} <ArrowRight size={15} /></button>}</div>; }

function Dialog({ type, books, members, selectedBook, record, saving, onClose, onSubmit }) {
  const [memberType, setMemberType] = useState(record?.type || 'STUDENT');
  useEffect(() => { setMemberType(record?.type || 'STUDENT'); }, [type, record?.id]);
  const config = {
    book: { title: 'Add a new book', desc: 'Make a little more room on your digital shelves.', button: 'Add to collection' },
    editBook: { title: 'Edit book details', desc: 'Update the title, author, or available copies on the shelf.', button: 'Save book changes' },
    member: { title: 'Register a member', desc: 'Add contact and campus profile details for a student or faculty member.', button: 'Register member' },
    editMember: { title: 'Edit member details', desc: 'Update contact details, department, academic year, ID, and membership type.', button: 'Save member changes' },
    issue: { title: 'Issue a book', desc: 'Choose a member and an available book to create a loan.', button: 'Confirm issue' },
  }[type];
  const bookForm = type === 'book' || type === 'editBook';
  const memberForm = type === 'member' || type === 'editMember';
  const icon = bookForm ? (type === 'editBook' ? <Settings2 size={21} /> : <BookPlus size={21} />)
    : memberForm ? (type === 'editMember' ? <Settings2 size={21} /> : <UserRoundPlus size={21} />) : <RotateCcw size={21} />;
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={`modal ${memberForm ? 'modal-member' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="modal-top"><div className="modal-icon">{icon}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div><h2 id="dialog-title">{config.title}</h2><p className="modal-description">{config.desc}</p>
    <form onSubmit={onSubmit}>
      {bookForm && <><label className="field-label">Book title<input name="title" placeholder="e.g. Atomic Habits" required maxLength="180" defaultValue={record?.title || ''} autoFocus /></label><label className="field-label">Author<input name="author" placeholder="e.g. James Clear" required maxLength="120" defaultValue={record?.author || ''} /></label><label className="field-label">Available copies<input name="copies" type="number" min="0" max="9999" defaultValue={record?.copies ?? 1} required /></label><div className="field-hint"><CircleHelp size={14} /> Available copies are books currently on the shelf. Issuing a book reduces this count; returning it increases the count.</div></>}
      {memberForm && <>
        <div className="member-form-grid">
          <label className="field-label">Full name<input name="name" placeholder="e.g. Priya Kumar" required maxLength="120" defaultValue={record?.name || ''} autoFocus /></label>
          <label className="field-label">Email address<input name="email" type="email" placeholder="name@college.edu" required maxLength="180" defaultValue={record?.email || ''} /></label>
          <label className="field-label">Member type<select name="type" value={memberType} onChange={e => setMemberType(e.target.value)}><option value="STUDENT">Student · 3 books · ₹20/day fine</option><option value="FACULTY">Faculty · 10 books · ₹100/day fine</option></select></label>
          <label className="field-label">Department<input name="department" placeholder="e.g. CSE, AIML, ECE" required maxLength="100" defaultValue={record?.department || ''} /></label>
          <label className="field-label">Register number / Staff ID<input name="registerNumber" placeholder="e.g. 312323205001" maxLength="60" defaultValue={record?.registerNumber || ''} /></label>
          <label className="field-label">Phone number<input name="phone" type="tel" placeholder="e.g. 9876543210" maxLength="25" defaultValue={record?.phone || ''} /></label>
          {memberType === 'STUDENT'
            ? <label className="field-label">Year of study<select name="yearOfStudy" required defaultValue={record?.yearOfStudy || ''}><option value="" disabled>Select year</option><option value="First Year">First Year</option><option value="Second Year">Second Year</option><option value="Third Year">Third Year</option><option value="Fourth Year">Fourth Year</option><option value="PG / Other">PG / Other</option></select></label>
            : <label className="field-label">Designation<input name="designation" placeholder="e.g. Assistant Professor" maxLength="100" defaultValue={record?.designation || ''} /></label>}
        </div>
        <div className="field-hint member-rule-hint"><CircleHelp size={14} /> Students can borrow up to 3 books and are charged ₹20 per overdue day. Faculty can borrow up to 10 books and are charged ₹100 per overdue day.</div>
      </>}
      {type === 'issue' && <><label className="field-label">Member<select name="memberId" defaultValue="" required><option value="" disabled>Select a registered member</option>{members.map(m => <option value={m.id} key={m.id}>{m.name} — {m.type === 'FACULTY' ? 'Faculty' : 'Student'} (ID {m.id})</option>)}</select></label><label className="field-label">Book<select name="bookId" defaultValue={selectedBook || ''} required><option value="" disabled>Select an available book</option>{books.filter(b => b.copies > 0).map(b => <option value={b.id} key={b.id}>{b.title} — {b.copies} available (ID {b.id})</option>)}</select></label><div className="issue-note"><CalendarDays size={16} /><span><b>14-day loan period</b><small>Fine per late day: ₹20 for students and ₹100 for faculty.</small></span></div>{(!members.length || !books.some(b => b.copies > 0)) && <p className="form-warning">You need at least one registered member and one book with available copies.</p>}</>}
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saving || (type === 'issue' && (!members.length || !books.some(b => b.copies > 0)))}>{saving && <LoaderCircle size={16} className="spin" />}{saving ? 'Saving…' : config.button}</button></div>
    </form>
  </div></div>;
}
