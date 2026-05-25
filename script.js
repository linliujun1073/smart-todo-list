// 存储键名
const STORAGE_KEY = 'smart-todo-list';

const STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    DUE_SOON: 'due-soon',
    EXPIRED: 'expired',
    COMPLETED: 'completed'
};

const CATEGORIES = {
    work: { label: '工作', color: 'blue' },
    study: { label: '学习', color: 'green' },
    life: { label: '生活', color: 'purple' },
    other: { label: '其他', color: 'gray' }
};

const PRIORITIES = {
    high: { label: '高', order: 1 },
    medium: { label: '中', order: 2 },
    low: { label: '低', order: 3 }
};

function getTasks() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getTaskStatus(task) {
    if (task.completed) return STATUS.COMPLETED;
    if (task.status === STATUS.IN_PROGRESS) return STATUS.IN_PROGRESS;
    if (!task.dueDate) return STATUS.PENDING;
    
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 0) return STATUS.EXPIRED;
    if (diffHours <= 24) return STATUS.DUE_SOON;
    return STATUS.PENDING;
}

function getStatusLabel(status) {
    const labels = {
        [STATUS.PENDING]: '待处理',
        [STATUS.IN_PROGRESS]: '进行中',
        [STATUS.DUE_SOON]: '即将到期',
        [STATUS.EXPIRED]: '已过期',
        [STATUS.COMPLETED]: '已完成'
    };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr;
}

function getTodayCompletedCount(tasks) {
    const today = new Date().toDateString();
    return tasks.filter(task => {
        if (!task.completed || !task.completedAt) return false;
        return new Date(task.completedAt).toDateString() === today;
    }).length;
}

function getWeekCompletionRate(tasks) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const weekTasks = tasks.filter(task => {
        const createdAt = new Date(task.createdAt);
        return createdAt >= startOfWeek && createdAt <= endOfWeek;
    });
    const completedWeekTasks = weekTasks.filter(task => task.completed);
    
    if (weekTasks.length === 0) return 0;
    return Math.round((completedWeekTasks.length / weekTasks.length) * 100);
}

function getPendingCount(tasks) {
    return tasks.filter(task => !task.completed && getTaskStatus(task) === STATUS.PENDING).length;
}

function getDueSoonCount(tasks) {
    return tasks.filter(task => !task.completed && getTaskStatus(task) === STATUS.DUE_SOON).length;
}

function getCategoryStats(tasks) {
    const stats = { work: 0, study: 0, life: 0, other: 0 };
    const total = tasks.length;
    if (total === 0) return { work: 0, study: 0, life: 0, other: 0 };
    tasks.forEach(task => stats[task.category]++);
    return {
        work: Math.round((stats.work / total) * 100),
        study: Math.round((stats.study / total) * 100),
        life: Math.round((stats.life / total) * 100),
        other: Math.round((stats.other / total) * 100)
    };
}

function renderStats(tasks) {
    document.getElementById('today-completed').textContent = getTodayCompletedCount(tasks);
    document.getElementById('week-completion').textContent = getWeekCompletionRate(tasks) + '%';
    document.getElementById('pending-count').textContent = getPendingCount(tasks);
    document.getElementById('due-soon-count').textContent = getDueSoonCount(tasks);
    
    const categoryStats = getCategoryStats(tasks);
    document.getElementById('cat-work').textContent = categoryStats.work + '%';
    document.getElementById('cat-study').textContent = categoryStats.study + '%';
    document.getElementById('cat-life').textContent = categoryStats.life + '%';
    document.getElementById('cat-other').textContent = categoryStats.other + '%';
}

function filterTasks(tasks, category, status) {
    return tasks.filter(task => {
        if (category !== 'all' && task.category !== category) return false;
        const taskStatus = getTaskStatus(task);
        if (status === 'all') return true;
        return taskStatus === status;
    });
}

function sortTasks(tasks, sortBy) {
    const sorted = [...tasks];
    switch (sortBy) {
        case 'created-desc':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'created-asc':
            sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'priority':
            sorted.sort((a, b) => PRIORITIES[a.priority].order - PRIORITIES[b.priority].order);
            break;
        case 'due-date':
            sorted.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
            break;
    }
    return sorted;
}

function createTaskCard(task) {
    const status = getTaskStatus(task);
    return `
        <div class="bg-white rounded-xl shadow-sm p-4 task-card ${task.completed ? 'task-completed' : ''}" data-id="${task.id}">
            <div class="flex items-start gap-4">
                <input type="checkbox" class="task-checkbox mt-1" ${task.completed ? 'checked' : ''}>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="task-title font-medium text-gray-800 truncate">${escapeHtml(task.title)}</h3>
                        <span class="status-${status} text-xs px-2 py-0.5 rounded-full">${getStatusLabel(status)}</span>
                        <span class="priority-${task.priority} text-xs px-2 py-0.5 rounded-full border">${PRIORITIES[task.priority].label}优先级</span>
                    </div>
                    ${task.description ? `<p class="task-description text-sm text-gray-500 mb-2">${escapeHtml(task.description)}</p>` : ''}
                    <div class="flex flex-wrap items-center gap-3 text-sm">
                        <span class="category-${task.category} px-2 py-0.5 rounded-full">${CATEGORIES[task.category].label}</span>
                        ${task.dueDate ? `<span class="due-date text-gray-500"><i class="fa fa-calendar"></i>${formatDate(task.dueDate)}${task.reminder ? `<i class="fa fa-bell ml-2"></i>${formatTime(task.reminder)}` : ''}</span>` : ''}
                        <span class="text-gray-400 text-xs">创建于 ${formatDate(task.createdAt)}</span>
                    </div>
                </div>
                <div class="task-actions flex flex-col gap-2">
                    <button class="edit-btn text-gray-400 hover:text-indigo-600 p-1" title="编辑"><i class="fa fa-pencil"></i></button>
                    <button class="delete-btn text-gray-400 hover:text-red-600 p-1" title="删除"><i class="fa fa-trash"></i></button>
                    ${!task.completed && status !== STATUS.IN_PROGRESS ? `<button class="start-btn text-gray-400 hover:text-blue-600 p-1" title="开始任务"><i class="fa fa-play"></i></button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderTaskList(tasks) {
    const container = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const emptyTitle = document.getElementById('empty-title');
    const emptyDesc = document.getElementById('empty-desc');
    
    const category = document.getElementById('filter-category').value;
    const status = document.getElementById('filter-status').value;
    const sortBy = document.getElementById('sort-by').value;
    
    let filtered = filterTasks(tasks, category, status);
    filtered = sortTasks(filtered, sortBy);
    
    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        const hasFilter = category !== 'all' || status !== 'all';
        if (hasFilter) {
            emptyTitle.textContent = '没有找到匹配的任务';
            emptyDesc.textContent = '尝试调整筛选条件';
        } else {
            emptyTitle.textContent = '暂无任务';
            emptyDesc.textContent = '点击右上角添加你的第一个任务';
        }
    } else {
        emptyState.classList.add('hidden');
        container.innerHTML = filtered.map(createTaskCard).join('');
    }
}

function showModal(task = null) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');
    if (task) {
        title.textContent = '编辑任务';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-category').value = task.category;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-reminder').value = task.reminder || '';
    } else {
        title.textContent = '添加任务';
        document.getElementById('task-form').reset();
        document.getElementById('task-id').value = '';
    }
    modal.classList.remove('hidden');
}

function hideModal() {
    document.getElementById('task-modal').classList.add('hidden');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    
    if (!title) { alert('请输入任务标题'); return; }
    if (title.length > 100) { alert('标题不能超过100个字符'); return; }
    if (description.length > 500) { alert('描述不能超过500个字符'); return; }
    
    const id = document.getElementById('task-id').value;
    const tasks = getTasks();
    
    const taskData = {
        title: title,
        description: description,
        category: document.getElementById('task-category').value,
        priority: document.getElementById('task-priority').value,
        dueDate: document.getElementById('task-due-date').value || null,
        reminder: document.getElementById('task-reminder').value || null
    };
    
    if (id) {
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) tasks[index] = { ...tasks[index], ...taskData };
    } else {
        tasks.push({
            ...taskData,
            id: generateId(),
            createdAt: new Date().toISOString(),
            completed: false,
            completedAt: null,
            status: STATUS.PENDING
        });
    }
    saveTasks(tasks);
    hideModal();
    renderTasks();
}

let pendingDeleteId = null;

function showConfirmModal(id) {
    pendingDeleteId = id;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

function hideConfirmModal() {
    pendingDeleteId = null;
    document.getElementById('confirm-modal').classList.add('hidden');
}

function handleDelete(id) {
    showConfirmModal(id);
}

function confirmDelete() {
    if (pendingDeleteId) {
        const tasks = getTasks().filter(t => t.id !== pendingDeleteId);
        saveTasks(tasks);
        renderTasks();
    }
    hideConfirmModal();
}

function handleToggleComplete(id) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        saveTasks(tasks);
        renderTasks();
    }
}

function handleStartTask(id) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = STATUS.IN_PROGRESS;
        saveTasks(tasks);
        renderTasks();
    }
}

function handleEdit(id) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) showModal(task);
}

function renderTasks() {
    const tasks = getTasks();
    renderStats(tasks);
    renderTaskList(tasks);
}

function initEventListeners() {
    document.getElementById('add-task-btn').addEventListener('click', () => showModal());
    document.getElementById('close-modal').addEventListener('click', hideModal);
    document.getElementById('cancel-btn').addEventListener('click', hideModal);
    document.getElementById('task-modal').addEventListener('click', (e) => { if (e.target === document.getElementById('task-modal')) hideModal(); });
    document.getElementById('task-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('filter-category').addEventListener('change', renderTasks);
    document.getElementById('filter-status').addEventListener('change', renderTasks);
    document.getElementById('sort-by').addEventListener('change', renderTasks);
    
    document.getElementById('task-list').addEventListener('change', (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            const id = e.target.closest('.task-card').dataset.id;
            handleToggleComplete(id);
        }
    });
    
    document.getElementById('task-list').addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const id = card.dataset.id;
        if (e.target.closest('.delete-btn')) handleDelete(id);
        else if (e.target.closest('.edit-btn')) handleEdit(id);
        else if (e.target.closest('.start-btn')) handleStartTask(id);
    });
    
    document.getElementById('confirm-cancel').addEventListener('click', hideConfirmModal);
    document.getElementById('confirm-ok').addEventListener('click', confirmDelete);
    document.getElementById('confirm-modal').addEventListener('click', (e) => { if (e.target === document.getElementById('confirm-modal')) hideConfirmModal(); });
}

function initApp() {
    const tasks = getTasks();
    if (tasks.length === 0) {
        const sampleTasks = [
            { id: generateId(), title: '完成项目报告', description: '整理Q1季度的项目进展和成果报告', category: 'work', priority: 'high', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reminder: '09:00', createdAt: new Date().toISOString(), completed: false, completedAt: null, status: STATUS.PENDING },
            { id: generateId(), title: '学习TypeScript', description: '完成TypeScript基础语法学习', category: 'study', priority: 'medium', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reminder: null, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), completed: false, completedAt: null, status: STATUS.IN_PROGRESS },
            { id: generateId(), title: '购买生活用品', description: '购买牛奶、面包、鸡蛋等日常用品', category: 'life', priority: 'low', dueDate: null, reminder: null, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), completed: true, completedAt: new Date().toISOString(), status: STATUS.COMPLETED }
        ];
        saveTasks(sampleTasks);
    }
    renderTasks();
    initEventListeners();
}

document.addEventListener('DOMContentLoaded', initApp);