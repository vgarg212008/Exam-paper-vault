const API_BASE = 'https://sliet-pyq.onrender.com';


// Store all papers from the database and current filter choices
let papersList = [];
const currentFilters = {
  search: '',
  semester: 'All',
  examType: 'All',
};

// Grab HTML elements once so we can update them easily
const searchInput = document.getElementById('searchInput');
const semFilters = document.getElementById('semFilters');
const typeFilters = document.getElementById('typeFilters');
const uploadForm = document.getElementById('uploadForm');
const submitBtn = document.getElementById('submitBtn');
const formMsg = document.getElementById('formMsg');
const resultCount = document.getElementById('resultCount');
const statusBox = document.getElementById('statusBox');
const paperListEl = document.getElementById('paperList');

// 1. Fetch all papers from backend (GET /papers)
async function fetchPapers() {
  showLoadingState();
  try {
    const response = await fetch(`${API_BASE}/papers`);
    if (!response.ok) {
      throw new Error('Failed to load papers');
    }
    papersList = await response.json();
    renderPapers();
  } catch (error) {
    console.error(error);
    showErrorState();
  }
}

// 2. Save a new paper to backend (POST /papers)
async function createPaper(paperData) {
  const response = await fetch(`${API_BASE}/papers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paperData),
  });
  if (!response.ok) {
    throw new Error('Failed to save paper');
  }
}

// 3. Delete a paper by ID (DELETE /papers/:id)
async function removePaperById(id) {
  const response = await fetch(`${API_BASE}/papers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete paper');
  }
}

// Filter papers based on search text, semester, and exam type
function getFilteredPapers() {
  const query = currentFilters.search.trim().toLowerCase();

  return papersList.filter((paper) => {
    const matchesSemester =
      currentFilters.semester === 'All' ||
      String(paper.semester) === currentFilters.semester;

    const matchesExamType =
      currentFilters.examType === 'All' ||
      paper.examType === currentFilters.examType;

    const searchableText = [
      paper.subject,
      paper.batch,
      paper.examType,
      paper.level,
    ]
      .join(' ')
      .toLowerCase();

    const matchesSearch = !query || searchableText.includes(query);

    return matchesSemester && matchesExamType && matchesSearch;
  });
}

// Render matching paper cards on the page
function renderPapers() {
  const filtered = getFilteredPapers();
  paperListEl.innerHTML = '';

  if (filtered.length === 0) {
    statusBox.hidden = false;
    statusBox.className = 'status-box';
    statusBox.textContent =
      papersList.length === 0
        ? 'No question papers uploaded yet. Open the form above to add one.'
        : 'No matching question papers found for your current filter.';
    resultCount.textContent = '';
    return;
  }

  statusBox.hidden = true;
  resultCount.textContent = `Showing ${filtered.length} question paper${filtered.length === 1 ? '' : 's'}`;

  filtered.forEach((paper) => {
    paperListEl.appendChild(buildPaperCard(paper));
  });
}

// Create a single card element safely using textContent
function buildPaperCard(paper) {
  const card = document.createElement('article');
  card.className = 'paper-card';

  const topPart = document.createElement('div');

  const title = document.createElement('h2');
  title.className = 'paper-title';
  title.textContent = paper.subject || 'Untitled Subject';

  const badges = document.createElement('div');
  badges.className = 'badge-row';

  const semBadge = document.createElement('span');
  semBadge.className = 'badge';
  semBadge.textContent = `Sem ${paper.semester}`;

  const typeBadge = document.createElement('span');
  typeBadge.className = 'badge badge-exam';
  typeBadge.textContent = paper.examType || 'Exam';

  const levelBadge = document.createElement('span');
  levelBadge.className = 'badge';
  levelBadge.textContent = paper.level || 'Diploma';

  badges.append(semBadge, typeBadge, levelBadge);

  const meta = document.createElement('p');
  meta.className = 'paper-meta';
  meta.textContent = `Batch: ${paper.batch || 'N/A'}`;

  topPart.append(title, badges, meta);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const link = document.createElement('a');
  link.className = 'btn btn-primary';
  link.href = getSafeLink(paper.pdfUrl);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View / Download PDF';

  actions.append(link);
  card.append(topPart, actions);

  return card;
}

// Allow only normal http/https links
function getSafeLink(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.href
      : '#';
  } catch {
    return '#';
  }
}

function showLoadingState() {
  paperListEl.innerHTML = '';
  resultCount.textContent = '';
  statusBox.hidden = false;
  statusBox.className = 'status-box';
  statusBox.innerHTML = '<div class="spinner"></div>Loading question papers...';
}

function showErrorState() {
  paperListEl.innerHTML = '';
  resultCount.textContent = '';
  statusBox.hidden = false;
  statusBox.className = 'status-box error';
  statusBox.textContent =
    'Could not connect to the backend server yet. Start the backend server or check your API URL.';
}

function setMessage(text, type = '') {
  formMsg.textContent = text;
  formMsg.className = type ? `form-msg ${type}` : 'form-msg';
}

// Event listeners for search and filter chips
searchInput.addEventListener('input', () => {
  currentFilters.search = searchInput.value;
  renderPapers();
});

function setupChipGroup(container, filterKey) {
  container.addEventListener('click', (event) => {
    const clickedChip = event.target.closest('.chip');
    if (!clickedChip) return;

    container.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.remove('active');
    });
    clickedChip.classList.add('active');
    currentFilters[filterKey] = clickedChip.dataset.value;
    renderPapers();
  });
}

setupChipGroup(semFilters, 'semester');
setupChipGroup(typeFilters, 'examType');

// Handle form submission
uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!uploadForm.checkValidity()) {
    uploadForm.reportValidity();
    return;
  }

  const formData = new FormData(uploadForm);
  const newPaper = {
    subject: String(formData.get('subject')).trim(),
    semester: Number(formData.get('semester')),
    examType: String(formData.get('examType')),
    batch: String(formData.get('batch')).trim(),
    level: String(formData.get('level') || 'Diploma'),
    pdfUrl: String(formData.get('pdfUrl')).trim(),
  };

  submitBtn.disabled = true;
  setMessage('Saving question paper...');

  try {
    await createPaper(newPaper);
    uploadForm.reset();
    document.getElementById('level').value = 'Diploma';
    setMessage('Question paper added successfully.', 'ok');
    await fetchPapers();
  } catch (error) {
    console.error(error);
    setMessage('Could not save paper. Please check if the backend server is running.', 'err');
  } finally {
    submitBtn.disabled = false;
  }
});

// Handle deleting a paper
async function handleDeletePaper(id, subjectName) {
  const confirmed = confirm(`Delete "${subjectName}"?`);
  if (!confirmed) return;

  try {
    await removePaperById(id);
    papersList = papersList.filter((item) => (item._id || item.id) !== id);
    renderPapers();
  } catch (error) {
    console.error(error);
    alert('Failed to delete this question paper.');
  }
}

// Load papers when page first opens
fetchPapers();
