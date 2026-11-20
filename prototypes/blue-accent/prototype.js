// Throwaway UI study: four structural variants of a document-and-notes home,
// switchable via ?variant=. All sample state lives in this page only.
const variants = [
  { id: 'showcase', name: 'Showcase', description: 'A featured document carousel and recent activity, closest to the reference.' },
  { id: 'folders', name: 'Folders', description: 'Layered, horizontally scrollable folder cards lead the home screen.' },
  { id: 'library', name: 'Library', description: 'A practical document grid with the blue accent concentrated in a quick-access strip.' },
  { id: 'timeline', name: 'Timeline', description: 'A task-first home led by the next expiry and a chronological document list.' }
];
const documents = [
  { id: 1, name: 'Emirates ID', detail: 'Personal', changed: 'Changed 7 seconds ago', type: 'ID card', color: 'lilac', pinned: true, expires: '24 Nov 2026' },
  { id: 2, name: 'Driving licence', detail: 'Personal', changed: 'Changed 36 seconds ago', type: 'Licence', color: 'mint', pinned: true, expires: '18 Aug 2028' },
  { id: 3, name: 'Health insurance', detail: 'Family', changed: 'Changed 49 minutes ago', type: 'Insurance', color: 'rose', pinned: false, expires: '03 Mar 2027' },
  { id: 4, name: 'Apartment contract', detail: 'Home', changed: 'Changed yesterday', type: 'PDF · 4 pages', color: 'sand', pinned: false, expires: '30 Jun 2027' }
];
const notes = [
  { id: 1, title: 'For the next trip', body: 'Passport, residency and travel insurance. Check the expiry dates before booking.', space: 'Travel', changed: 'Changed 2 minutes ago', pinned: true },
  { id: 2, title: 'Insurance helpline', body: 'Keep the policy number handy when calling. Coverage renews in March.', space: 'Family', changed: 'Changed this morning', pinned: false },
  { id: 3, title: 'Moving checklist', body: 'Transfer utilities, update the address and keep the apartment contract nearby.', space: 'Home', changed: 'Changed yesterday', pinned: true },
  { id: 4, title: 'Important numbers', body: 'Keep local contacts and reference numbers together for quick access.', space: 'Personal', changed: 'Changed Monday', pinned: false }
];
const spaceColors = { Personal: 'folder-lilac', Family: 'folder-sage', Home: 'folder-sand', Travel: 'folder-blue' };
const icons = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 5 5"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  arrow: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  more: '<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  shield: '<path d="m12 2 8 4v5c0 5-3 8-8 11-5-3-8-6-8-11V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  pin: '<path d="M8 3h8l-1 6 3 3v2H6v-2l3-3zM12 14v8"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>'
  ,note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h4M8 12h8M8 16h6"/>'
};
const svg = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
const params = new URLSearchParams(location.search);
let variant = variants.some(v => v.id === params.get('variant')) ? params.get('variant') : 'showcase';
let tab = ['Home', 'Documents', 'Notes', 'Spaces'].includes(params.get('tab')) ? params.get('tab') : 'Home';
let activeSlide = 0;
let searchOpen = false;
let query = '';
let sheetMode = null;
let selectedDoc = params.get('view') === 'document' && documents.some(d => d.id === Number(params.get('id'))) ? Number(params.get('id')) : null;
let selectedNote = params.get('view') === 'note' && notes.some(n => n.id === Number(params.get('id'))) ? Number(params.get('id')) : null;
let activeSpace = null;
let pinnedOnly = false;

function brand() {
  return `<div class="brand"><div class="brand-symbol" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div><strong>doc keeper</strong><span>Your private space</span></div></div>`;
}
function appHeader() {
  const subject = tab === 'Notes' ? 'notes' : tab === 'Spaces' ? 'this space' : 'documents';
  return `<header class="app-header">${brand()}<div class="header-actions"><button class="icon-button" data-action="search" aria-label="Search ${subject}">${svg('search')}</button><button class="icon-button" data-action="add" aria-label="Add document or note">${svg('plus')}</button></div></header>${searchOpen ? `<div class="search-box">${svg('search')}<input id="search-input" type="search" placeholder="Search ${subject}" aria-label="Search ${subject}" value="${escapeHtml(query)}" autofocus></div>` : ''}`;
}
function escapeHtml(value) { return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
function thumbnail(doc, large = false) {
  return `<div class="document-art ${doc.color} ${large ? 'large' : ''}" aria-hidden="true"><div class="art-top"><span class="art-seal">✦</span><span class="art-kind">${doc.type}</span></div><div class="art-lines"><span></span><span></span><span></span></div><div class="art-bars"><i></i><i></i><i></i></div></div>`;
}
function star(doc) {
  return `<button class="star-button ${doc.pinned ? 'is-pinned' : ''}" data-pin="${doc.id}" aria-label="${doc.pinned ? 'Unpin' : 'Pin'} ${doc.name}" aria-pressed="${doc.pinned}">${svg('pin')}</button>`;
}
function noteStar(note) {
  return `<button class="star-button ${note.pinned ? 'is-pinned' : ''}" data-pin-note="${note.id}" aria-label="${note.pinned ? 'Unpin' : 'Pin'} ${escapeHtml(note.title)}" aria-pressed="${note.pinned}">${svg('pin')}</button>`;
}
function noteRow(note) {
  return `<div class="recent-row note-row"><button class="row-main" data-open-note="${note.id}"><span class="note-mark ${spaceColors[note.space]}">${svg('note')}</span><span class="row-copy"><strong>${escapeHtml(note.title)}</strong><span>${note.space} space</span><small>${note.changed}</small></span></button>${noteStar(note)}</div>`;
}
function noteCard(note) {
  return `<div class="note-card ${spaceColors[note.space]}"><button data-open-note="${note.id}"><span class="note-card-top">${svg('note')}<small>${note.space}</small></span><strong>${escapeHtml(note.title)}</strong><p>${escapeHtml(note.body)}</p></button>${noteStar(note)}</div>`;
}
function featureCard(doc) {
  return `<button class="feature-card" data-open="${doc.id}"><div class="feature-art">${thumbnail(doc, true)}</div><div class="feature-label"><strong>${doc.name}</strong><span>${doc.detail} space</span><span class="feature-star">${svg('pin')}</span></div></button>`;
}
function recentRow(doc) {
  return `<div class="recent-row"><button class="row-main" data-open="${doc.id}">${thumbnail(doc)}<span class="row-copy"><strong>${doc.name}</strong><span>${doc.detail} space</span><small>${doc.changed}</small></span></button>${star(doc)}</div>`;
}
function sectionHeading(title, action) {
  return `<div class="section-heading"><h2>${title}</h2><button class="section-arrow" data-action="${action}" aria-label="View ${title.toLowerCase()}">${svg('arrow')}</button></div>`;
}
function folderCarousel() {
  return `<div class="folder-carousel" aria-label="Spaces, scroll horizontally">${Object.entries(spaceColors).map(([name, color]) => {
    const docCount = documents.filter(d => d.detail === name).length;
    const noteCount = notes.filter(n => n.space === name).length;
    const count = `${docCount} ${docCount === 1 ? 'document' : 'documents'} · ${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`;
    return `<button class="folder-card ${color}" data-folder="${name}"><span class="folder-back"><strong>${name}</strong><small>${count}</small></span><span class="folder-front"><strong>${name}</strong><small>${count}</small>${svg('arrow')}</span></button>`;
  }).join('')}</div>`;
}
function visibleDocs() { return documents.filter(d => `${d.name} ${d.detail} ${d.type}`.toLowerCase().includes(query.toLowerCase())); }
function visibleNotes() { return notes.filter(n => `${n.title} ${n.body} ${n.space}`.toLowerCase().includes(query.toLowerCase())); }
function homeNotes() { return `<section class="home-notes">${sectionHeading('Notes', 'notes')}${visibleNotes().slice(0, 2).map(noteRow).join('') || '<p class="empty">No matching notes</p>'}</section>`; }
function showcase() {
  const featured = documents.filter(d => d.pinned);
  const doc = featured[activeSlide % featured.length];
  const carousel = doc ? `<div class="carousel"><div class="active-feature">${featureCard(doc)}</div>${featured.length > 1 ? `<div class="peek-feature" aria-hidden="true">${thumbnail(featured[(activeSlide + 1) % featured.length], true)}</div>` : ''}</div><div class="dots" role="group" aria-label="Favorite document slides">${featured.map((_, i) => `<button class="dot ${i === activeSlide ? 'active' : ''}" data-slide="${i}" aria-label="Show favorite ${i + 1}" aria-current="${i === activeSlide}"></button>`).join('')}</div>` : `<div class="favorite-empty">Pin a document to keep it here.</div>`;
  return `<div class="scroll-content showcase-content"><section class="favorite-panel">${sectionHeading('My favorites', 'favorites')}${carousel}</section><section class="recent-panel">${sectionHeading('Recently visited', 'recent')}${visibleDocs().slice(0, 3).map(recentRow).join('') || '<p class="empty">No matching documents</p>'}</section>${homeNotes()}<section class="workspaces-panel">${sectionHeading('Spaces', 'spaces')}${folderCarousel()}</section></div>`;
}
function library() {
  return `<div class="scroll-content library-content"><div class="welcome"><span>Your documents</span><h1>Everything, close at hand.</h1></div><section class="quick-strip"><div>${svg('shield')}<span>Quick access</span><strong>${documents.filter(d => d.pinned).length} pinned documents</strong></div><button data-action="favorites" aria-label="View pinned documents">${svg('arrow')}</button></section><div class="library-tools"><h2>Library <span>${visibleDocs().length}</span></h2><button data-action="search">${svg('search')} Search</button></div><div class="document-grid">${visibleDocs().map(d => `<div class="grid-tile"><button class="grid-main" data-open="${d.id}">${thumbnail(d, true)}<strong>${d.name}</strong><span>${d.detail} · ${d.type}</span></button>${star(d)}</div>`).join('') || '<p class="empty">No matching documents</p>'}</div>${homeNotes()}<section class="workspaces-panel">${sectionHeading('Spaces', 'spaces')}${folderCarousel()}</section></div>`;
}
function folders() {
  return `<div class="scroll-content folders-content"><div class="welcome"><span>Your spaces</span><h1>Keep what matters close.</h1></div><section class="folder-hero"><div class="folder-hero-heading"><span>Browse by space</span><strong>Swipe to explore →</strong></div>${folderCarousel()}</section><div class="folder-summary"><span class="summary-icon">${svg('shield')}</span><div><strong>Private on this phone</strong><small>Documents and notes are kept in your encrypted library.</small></div></div>${homeNotes()}<section class="folder-recent">${sectionHeading('Recently visited', 'recent')}${visibleDocs().slice(0, 3).map(recentRow).join('')}</section></div>`;
}
function timeline() {
  const ordered = [documents[0], documents[2], documents[3], documents[1]];
  return `<div class="scroll-content timeline-content"><div class="welcome"><span>Friday, 20 November</span><h1>Good morning.</h1></div><section class="expiry-panel"><span class="expiry-icon">${svg('bell')}</span><span>Coming up</span><h2>Emirates ID expires in 4 days</h2><p>Keep this document ready when you renew it.</p><button data-open="1">Open document ${svg('arrow')}</button></section>${homeNotes()}<div class="timeline-heading"><h2>Your documents</h2><span>By expiry date</span></div><div class="timeline-list">${ordered.filter(d => visibleDocs().includes(d)).map(d => `<div class="timeline-row"><span class="timeline-date"><strong>${d.expires.slice(0, 2)}</strong><small>${d.expires.slice(3, 6)}</small></span><button data-open="${d.id}">${thumbnail(d)}<span><strong>${d.name}</strong><small>${d.detail} · ${d.type}</small></span>${svg('arrow')}</button></div>`).join('') || '<p class="empty">No matching documents</p>'}</div></div>`;
}
function nav() {
  return `<nav class="bottom-nav" aria-label="Main navigation">${[['Home','home'],['Documents','folder'],['Notes','note'],['Spaces','more']].map(([label, icon]) => `<button class="${tab === label ? 'active' : ''}" data-tab="${label}" aria-current="${tab === label ? 'page' : 'false'}">${svg(icon)}<span>${label}</span></button>`).join('')}</nav>`;
}
function documentsView() {
  const found = visibleDocs().filter(d => !pinnedOnly || d.pinned);
  return `<div class="scroll-content other-content"><div class="page-title"><h1>${pinnedOnly ? 'Pinned documents' : 'All documents'}</h1>${pinnedOnly ? '<button data-action="all-documents">Show all</button>' : `<span>${found.length} documents</span>`}</div>${found.map(recentRow).join('') || `<p class="empty">${pinnedOnly ? 'Pin a document to see it here.' : 'No matching documents.'}</p>`}</div>`;
}
function notesView() {
  const found = visibleNotes();
  const pinned = found.filter(n => n.pinned);
  if (variant === 'showcase') return `<div class="scroll-content notes-content"><div class="welcome"><span>Your thoughts, in one place</span><h1>Notes</h1></div><section class="notes-feature"><div class="section-heading"><h2>Pinned notes</h2><span>${pinned.length}</span></div>${pinned.length ? pinned.map(noteCard).join('') : '<p>Pin a note to keep it close.</p>'}</section><section class="notes-list">${sectionHeading('All notes', 'notes')}${found.map(noteRow).join('') || '<p class="empty">No matching notes.</p>'}</section></div>`;
  if (variant === 'folders') return `<div class="scroll-content folders-content notes-content"><div class="welcome"><span>Notes in every space</span><h1>Find the thought you need.</h1></div><section class="folder-hero"><div class="folder-hero-heading"><span>Note spaces</span><strong>Swipe to explore →</strong></div>${folderCarousel()}</section><section class="notes-list">${sectionHeading('All notes', 'notes')}${found.map(noteRow).join('') || '<p class="empty">No matching notes.</p>'}</section></div>`;
  if (variant === 'library') return `<div class="scroll-content notes-content"><div class="welcome"><span>Your notes</span><h1>Small details, kept safe.</h1></div><div class="notes-grid">${found.map(noteCard).join('') || '<p class="empty">No matching notes.</p>'}</div><section class="workspaces-panel">${sectionHeading('Spaces', 'spaces')}${folderCarousel()}</section></div>`;
  return `<div class="scroll-content notes-content"><div class="welcome"><span>Notes and reminders</span><h1>What’s on your mind?</h1></div><section class="notes-timeline"><div class="timeline-heading"><h2>Recent notes</h2><span>${found.length} notes</span></div>${found.map(noteRow).join('') || '<p class="empty">No matching notes.</p>'}</section><section class="workspaces-panel">${sectionHeading('Spaces', 'spaces')}${folderCarousel()}</section></div>`;
}
function spacesView() {
  const name = activeSpace || 'Personal';
  const docs = visibleDocs().filter(d => d.detail === name);
  const spaceNotes = visibleNotes().filter(n => n.space === name);
  return `<div class="scroll-content spaces-content"><div class="welcome"><span>Documents and notes together</span><h1>Your spaces.</h1></div><section class="folder-hero"><div class="folder-hero-heading"><span>Browse by space</span><strong>Swipe to explore →</strong></div>${folderCarousel()}</section><div class="space-title"><h2>${name}</h2><span>${docs.length} documents · ${spaceNotes.length} notes</span></div><section class="space-section"><h3>Documents</h3>${docs.map(recentRow).join('') || '<p class="empty">No documents here yet.</p>'}</section><section class="space-section"><h3>Notes</h3>${spaceNotes.map(noteRow).join('') || '<p class="empty">No notes here yet.</p>'}</section></div>`;
}
function detailHeader(title) {
  return `<header class="detail-header"><button data-action="back" aria-label="Go back">←</button><span>${title}</span><span class="detail-spacer"></span></header>`;
}
function documentDetail() {
  const d = documents.find(doc => doc.id === selectedDoc);
  return `<div class="full-detail document-detail">${detailHeader('Document')}<div class="detail-scroll"><div class="detail-art">${thumbnail(d, true)}</div><div class="detail-title"><span>${d.detail} space</span><h1>${d.name}</h1><p>${d.type}</p></div><div class="detail-group"><div><span>Expires</span><strong>${d.expires}</strong></div><div><span>Last update</span><strong>${d.changed.replace('Changed ', '')}</strong></div></div><div class="detail-note">${svg('shield')}<p>This sample document is shown only in the prototype. Your real documents stay on your device.</p></div></div><div class="detail-actions">${star(d)}<button class="detail-primary" data-action="back">Done</button></div></div>`;
}
function noteDetail() {
  const n = notes.find(note => note.id === selectedNote);
  return `<div class="full-detail note-detail">${detailHeader('Note')}<div class="detail-scroll"><div class="note-detail-icon ${spaceColors[n.space]}">${svg('note')}</div><span class="note-space-label">${n.space} space</span><h1>${escapeHtml(n.title)}</h1><p class="note-body">${escapeHtml(n.body).replaceAll('\n', '<br>')}</p><p class="note-updated">${n.changed}</p></div><div class="detail-actions">${noteStar(n)}<button class="detail-secondary" data-action="delete-note">Delete</button><button class="detail-primary" data-action="edit-note">Edit note</button></div></div>`;
}
function noteEditor() {
  const n = sheetMode === 'edit-note' ? notes.find(note => note.id === selectedNote) : null;
  const title = n ? 'Edit note' : 'New note';
  return `<div class="full-detail note-editor">${detailHeader(title)}<form id="note-form" class="note-form"><label>Title<input id="note-title" name="title" maxlength="80" required placeholder="Give this note a title" value="${escapeHtml(n?.title || '')}"></label><label>Space<select name="space">${Object.keys(spaceColors).map(s => `<option value="${s}" ${s === (n?.space || activeSpace || 'Personal') ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label class="body-label">Note<textarea name="body" placeholder="Write something worth keeping">${escapeHtml(n?.body || '')}</textarea></label><div class="editor-actions"><button type="button" data-action="cancel-edit">Cancel</button><button type="submit">Save note</button></div></form></div>`;
}
function addSheet() {
  return `<div class="overlay"><div class="scrim" data-action="close"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="Add to your library"><div class="grab"></div><div class="sheet-heading"><h2>Add to your library</h2><button data-action="close" aria-label="Close">×</button></div><p>Choose what to keep in a space.</p><button class="sheet-choice" data-action="sample">${svg('folder')} Add sample document ${svg('arrow')}</button><button class="sheet-choice" data-action="new-note">${svg('note')} Write a note ${svg('arrow')}</button><button class="sheet-choice" data-action="close">Cancel</button></section></div>`;
}
function render() {
  const current = variants.find(v => v.id === variant);
  const url = new URL(location.href); url.searchParams.set('variant', variant); url.searchParams.set('tab', tab);
  if (selectedDoc || selectedNote) { url.searchParams.set('view', selectedDoc ? 'document' : 'note'); url.searchParams.set('id', String(selectedDoc || selectedNote)); }
  else { url.searchParams.delete('view'); url.searchParams.delete('id'); }
  history.replaceState(null, '', url);
  document.querySelector('#variation-label').textContent = `${variants.indexOf(current) + 1} / ${variants.length} · ${current.name}`;
  document.querySelector('#state').textContent = `${current.description} · ${documents.length} documents, ${notes.length} notes`;
  document.querySelector('.phone').dataset.variant = variant;
  const app = document.querySelector('#app');
  if (sheetMode === 'add-note' || sheetMode === 'edit-note') app.innerHTML = noteEditor();
  else if (selectedDoc) app.innerHTML = documentDetail();
  else if (selectedNote) app.innerHTML = noteDetail();
  else app.innerHTML = appHeader() + ({ Home: () => ({ showcase, folders, library, timeline })[variant](), Documents: documentsView, Notes: notesView, Spaces: spacesView })[tab]() + `<button class="fab" data-action="add" aria-label="Add document or note">${svg('plus')}</button>` + nav() + (sheetMode === 'choice' ? addSheet() : '');
  if (searchOpen && !selectedDoc && !selectedNote && !sheetMode) { const input = document.querySelector('#search-input'); input?.focus(); input?.setSelectionRange(input.value.length, input.value.length); }
  if (sheetMode === 'add-note') document.querySelector('#note-title')?.focus();
}
function setVariant(id) { variant = id; activeSlide = 0; render(); }
function cycle(step) { setVariant(variants[(variants.findIndex(v => v.id === variant) + step + variants.length) % variants.length].id); }
document.querySelector('#previous').addEventListener('click', () => cycle(-1));
document.querySelector('#next').addEventListener('click', () => cycle(1));
document.addEventListener('click', event => {
  const button = event.target.closest('button, .scrim'); if (!button) return;
  if (button.dataset.slide !== undefined) { activeSlide = Number(button.dataset.slide); render(); return; }
  if (button.dataset.pin) { const d = documents.find(d => d.id === Number(button.dataset.pin)); d.pinned = !d.pinned; activeSlide = 0; render(); return; }
  if (button.dataset.pinNote) { const n = notes.find(n => n.id === Number(button.dataset.pinNote)); n.pinned = !n.pinned; render(); return; }
  if (button.dataset.open) { selectedDoc = Number(button.dataset.open); render(); return; }
  if (button.dataset.openNote) { selectedNote = Number(button.dataset.openNote); render(); return; }
  if (button.dataset.folder) { activeSpace = button.dataset.folder; tab = 'Spaces'; pinnedOnly = false; query = ''; render(); return; }
  if (button.dataset.tab) { tab = button.dataset.tab; pinnedOnly = false; query = ''; render(); return; }
  switch (button.dataset.action) {
    case 'search': searchOpen = !searchOpen; if (!searchOpen) query = ''; render(); break;
    case 'add': sheetMode = 'choice'; render(); break;
    case 'close': sheetMode = null; render(); break;
    case 'back': selectedDoc = null; selectedNote = null; render(); break;
    case 'cancel-edit': sheetMode = null; render(); break;
    case 'new-note': sheetMode = 'add-note'; render(); break;
    case 'edit-note': sheetMode = 'edit-note'; render(); break;
    case 'delete-note': if (window.confirm('Delete this sample note?')) { notes.splice(notes.findIndex(n => n.id === selectedNote), 1); selectedNote = null; render(); } break;
    case 'sample': documents.push({ id: Date.now(), name: 'Sample document', detail: activeSpace || 'Personal', changed: 'Changed just now', type: 'Document', color: 'mint', pinned: false, expires: '20 Nov 2027' }); sheetMode = null; tab = 'Documents'; render(); break;
    case 'favorites': tab = 'Documents'; pinnedOnly = true; query = ''; searchOpen = false; render(); break;
    case 'all-documents': pinnedOnly = false; render(); break;
    case 'recent': tab = 'Documents'; pinnedOnly = false; render(); break;
    case 'notes': tab = 'Notes'; render(); break;
    case 'spaces': tab = 'Spaces'; render(); break;
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'search-input') { query = event.target.value; const start = event.target.selectionStart; render(); document.querySelector('#search-input')?.setSelectionRange(start, start); }
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'note-form') return;
  event.preventDefault();
  const values = new FormData(event.target);
  const title = String(values.get('title') || '').trim();
  if (!title) { document.querySelector('#note-title')?.focus(); return; }
  const update = { title, body: String(values.get('body') || '').trim(), space: String(values.get('space')), changed: 'Changed just now' };
  if (sheetMode === 'edit-note') Object.assign(notes.find(n => n.id === selectedNote), update);
  else { const note = { id: Date.now(), ...update, pinned: false }; notes.unshift(note); selectedNote = note.id; }
  sheetMode = null; render();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && sheetMode) { sheetMode = null; render(); return; }
  if (event.key === 'Escape' && (selectedDoc || selectedNote)) { selectedDoc = null; selectedNote = null; render(); return; }
  if (event.target.closest('input, textarea, select, [contenteditable]') || selectedDoc || selectedNote || sheetMode) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); cycle(event.key === 'ArrowLeft' ? -1 : 1); }
});
render();
