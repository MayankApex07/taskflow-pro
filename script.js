document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const categorySelect = document.getElementById('categorySelect');
    const dateInput = document.getElementById('dateInput');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');
    
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const clearCompletedBtn = document.getElementById('clearCompletedBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');

    // Stats Elements
    const statTotal = document.getElementById('statTotal');
    const statPending = document.getElementById('statPending');
    const statCompleted = document.getElementById('statCompleted');
    const statUrgent = document.getElementById('statUrgent');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');

    // Modal Elements
    const editModal = document.getElementById('editModal');
    const editTaskText = document.getElementById('editTaskText');
    const editTaskPriority = document.getElementById('editTaskPriority');
    const editTaskCategory = document.getElementById('editTaskCategory');
    const editTaskDate = document.getElementById('editTaskDate');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // State
    let tasks = JSON.parse(localStorage.getItem('taskflow_pro_tasks')) || [];
    let currentFilter = 'All';
    let editingTaskId = null;

    // Theme Setup
    const savedTheme = localStorage.getItem('taskflow_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const nextTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('taskflow_theme', nextTheme);
        updateThemeIcon(nextTheme);
    });

    function updateThemeIcon(theme) {
        themeToggleBtn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }

    // Persistence & Render
    function saveAndRender() {
        localStorage.setItem('taskflow_pro_tasks', JSON.stringify(tasks));
        renderTasks();
    }

    function renderTasks() {
        taskList.innerHTML = '';
        const query = searchInput.value.toLowerCase().trim();

        let filtered = tasks.filter(task => {
            const matchesFilter = currentFilter === 'All' ? true : currentFilter === 'Active' ? !task.completed : task.completed;
            const matchesSearch = task.text.toLowerCase().includes(query) || task.category.toLowerCase().includes(query);
            return matchesFilter && matchesSearch;
        });

        // Sorting Logic
        const sortVal = sortSelect.value;
        filtered.sort((a, b) => {
            if (sortVal === 'priority') {
                const map = { high: 1, medium: 2, low: 3 };
                return map[a.priority] - map[b.priority];
            } else if (sortVal === 'dueDate') {
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(a.date) - new Date(b.date);
            }
            return b.id - a.id; // Newest first default
        });

        if (filtered.length === 0) {
            taskList.innerHTML = `<li class="empty-state">No matching tasks found.</li>`;
        }

        const todayStr = new Date().toISOString().split('T')[0];

        filtered.forEach(task => {
            const isOverdue = task.date && task.date < todayStr && !task.completed;
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
                <div class="task-details">
                    <span class="task-title">${escapeHtml(task.text)}</span>
                    <div class="task-meta">
                        <span class="badge priority-${task.priority}">${task.priority}</span>
                        <span class="tag">${task.category}</span>
                        ${task.date ? `<span class="due-tag ${isOverdue ? 'overdue' : ''}"><i class="fa-regular fa-calendar"></i> ${task.date} ${isOverdue ? '(Overdue)' : ''}</span>` : ''}
                    </div>
                </div>
                <div class="action-btns">
                    <button class="icon-action" onclick="openEditModal(${task.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="icon-action" onclick="deleteTask(${task.id})" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
            taskList.appendChild(li);
        });

        updateDashboard();
    }

    function updateDashboard() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const urgent = tasks.filter(t => t.priority === 'high' && !t.completed).length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        statTotal.textContent = total;
        statPending.textContent = pending;
        statCompleted.textContent = completed;
        statUrgent.textContent = urgent;

        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
    }

    // Task Actions
    window.addTask = function() {
        const text = taskInput.value.trim();
        if (!text) return;

        tasks.unshift({
            id: Date.now(),
            text: text,
            priority: prioritySelect.value,
            category: categorySelect.value,
            date: dateInput.value,
            completed: false
        });

        taskInput.value = '';
        dateInput.value = '';
        saveAndRender();
    };

    window.deleteTask = function(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveAndRender();
    };

    window.toggleTask = function(id) {
        tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        saveAndRender();
    };

    // Modal Edit Operations
    window.openEditModal = function(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        editingTaskId = id;
        editTaskText.value = task.text;
        editTaskPriority.value = task.priority;
        editTaskCategory.value = task.category;
        editTaskDate.value = task.date || '';

        editModal.classList.remove('hidden');
    };

    function closeModal() {
        editModal.classList.add('hidden');
        editingTaskId = null;
    }

    saveEditBtn.addEventListener('click', () => {
        if (!editingTaskId) return;
        tasks = tasks.map(t => {
            if (t.id === editingTaskId) {
                return {
                    ...t,
                    text: editTaskText.value.trim() || t.text,
                    priority: editTaskPriority.value,
                    category: editTaskCategory.value,
                    date: editTaskDate.value
                };
            }
            return t;
        });
        closeModal();
        saveAndRender();
    });

    closeModalBtn.addEventListener('click', closeModal);
    cancelEditBtn.addEventListener('click', closeModal);

    // Filter, Search & Export
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

    searchInput.addEventListener('input', renderTasks);
    sortSelect.addEventListener('change', renderTasks);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    clearCompletedBtn.addEventListener('click', () => {
        tasks = tasks.filter(t => !t.completed);
        saveAndRender();
    });

    // CSV Export Feature
    exportCsvBtn.addEventListener('click', () => {
        if (tasks.length === 0) return alert('No tasks to export!');
        let csv = 'ID,Task Title,Priority,Category,Due Date,Status\n';
        tasks.forEach(t => {
            csv += `"${t.id}","${t.text.replace(/"/g, '""')}","${t.priority}","${t.category}","${t.date || 'N/A'}","${t.completed ? 'Completed' : 'Pending'}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TaskFlow_Export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    });

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    renderTasks();
});