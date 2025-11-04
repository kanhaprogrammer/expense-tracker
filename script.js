// Kanha Expense Tracker - script.js
// Author: Generated for Kanha
// Key features: add, delete, sort, filter, localStorage persistence

(() => {
  const LS_KEY = "kanha_expenses_v1";

  // Elements
  const form = document.getElementById("expense-form");
  const titleInput = document.getElementById("title");
  const amountInput = document.getElementById("amount");
  const quantityInput = document.getElementById("quantity");
  const categoryInput = document.getElementById("category");
  const dateInput = document.getElementById("date");
  const addBtn = document.getElementById("add-btn");
  const clearFormBtn = document.getElementById("clear-form");

  const tableBody = document.querySelector("#expense-table tbody");
  const expenseCountEl = document.getElementById("expense-count");
  const totalAmountEl = document.getElementById("total-amount");

  const sortSelect = document.getElementById("sort-select");
  const sortBtn = document.getElementById("sort-btn");
  const filterSelect = document.getElementById("filter-category");
  const filterBtn = document.getElementById("filter-btn");
  const clearAllBtn = document.getElementById("clear-all");

  // In-memory array
  let expenses = [];

  // Utility functions
  function saveToLocalStorage() {
    localStorage.setItem(LS_KEY, JSON.stringify(expenses));
  }

  function loadFromLocalStorage() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      console.error("Failed to parse localStorage:", e);
      return [];
    }
  }

  function formatCurrency(n) {
    const num = Number(n) || 0;
    return "₹" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    // Human-friendly: DD MMM YYYY
    const options = { year: "numeric", month: "short", day: "2-digit" };
    return d.toLocaleDateString(undefined, options);
  }

  function uid() {
    // simple unique id using timestamp + random
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8);
  }

  // Render functions
  function populateFilterCategories() {
    const categories = Array.from(new Set(expenses.map(e => e.category.trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
    // Clear existing (preserve first 'all' option)
    filterSelect.innerHTML = `<option value="all">All Categories</option>`;
    categories.forEach(cat=>{
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      filterSelect.appendChild(opt);
    });
  }

  function renderTable({ filterCategory = "all", sortKey = sortSelect.value } = {}) {
    // copy
    let rows = expenses.slice();

    // Filter
    if (filterCategory && filterCategory !== "all") {
      rows = rows.filter(r => r.category.toLowerCase() === filterCategory.toLowerCase());
    }

    // Sort
    switch (sortKey) {
      case "date-desc":
        rows.sort((a,b)=>new Date(b.date) - new Date(a.date));
        break;
      case "date-asc":
        rows.sort((a,b)=>new Date(a.date) - new Date(b.date));
        break;
      case "amount-desc":
        rows.sort((a,b)=> (b.amount*b.quantity) - (a.amount*a.quantity));
        break;
      case "amount-asc":
        rows.sort((a,b)=> (a.amount*a.quantity) - (b.amount*b.quantity));
        break;
      case "category-asc":
        rows.sort((a,b)=> a.category.localeCompare(b.category));
        break;
      case "category-desc":
        rows.sort((a,b)=> b.category.localeCompare(a.category));
        break;
      default:
        break;
    }

    // Render rows
    tableBody.innerHTML = "";
    rows.forEach(exp => {
      const tr = document.createElement("tr");

      // Title
      const titleTd = document.createElement("td");
      titleTd.textContent = exp.title;
      tr.appendChild(titleTd);

      // Category
      const catTd = document.createElement("td");
      catTd.innerHTML = `<span class="muted">${exp.category}</span>`;
      tr.appendChild(catTd);

      // Amount single
      const amountTd = document.createElement("td");
      amountTd.textContent = formatCurrency(exp.amount);
      tr.appendChild(amountTd);

      // Quantity
      const qtyTd = document.createElement("td");
      qtyTd.textContent = exp.quantity;
      tr.appendChild(qtyTd);

      // Total
      const totalTd = document.createElement("td");
      totalTd.textContent = formatCurrency(Number(exp.amount) * Number(exp.quantity));
      tr.appendChild(totalTd);

      // Date
      const dateTd = document.createElement("td");
      dateTd.textContent = formatDate(exp.date);
      tr.appendChild(dateTd);

      // Delete
      const delTd = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.title = "Delete expense";
      delBtn.setAttribute("data-id", exp.id);

      // Trash icon svg + label
      delBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      delTd.appendChild(delBtn);
      tr.appendChild(delTd);

      tableBody.appendChild(tr);
    });

    // summary
    const filteredTotals = rows.reduce((acc, e) => {
      const tot = Number(e.amount) * Number(e.quantity);
      acc.count += 1;
      acc.total += isFinite(tot) ? tot : 0;
      return acc;
    }, { count: 0, total: 0 });

    expenseCountEl.textContent = filteredTotals.count;
    totalAmountEl.textContent = formatCurrency(filteredTotals.total);
  }

  // Data operations
  function addExpense({ title, amount, quantity, category, date }) {
    const newExpense = {
      id: uid(),
      title: title.trim(),
      amount: Number(amount),
      quantity: Number(quantity),
      category: category.trim(),
      date: date
    };
    expenses.push(newExpense);
    saveToLocalStorage();
    populateFilterCategories();
    renderTable({ filterCategory: filterSelect.value, sortKey: sortSelect.value });
  }

  function deleteExpenseById(id) {
    expenses = expenses.filter(e => e.id !== id);
    saveToLocalStorage();
    populateFilterCategories();
    renderTable({ filterCategory: filterSelect.value, sortKey: sortSelect.value });
  }

  function clearAllExpenses() {
    expenses = [];
    saveToLocalStorage();
    populateFilterCategories();
    renderTable();
  }

  // Event listeners
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    // gather values
    const title = titleInput.value;
    const amount = parseFloat(amountInput.value);
    const quantity = parseInt(quantityInput.value, 10);
    const category = categoryInput.value;
    const date = dateInput.value;

    // basic validation
    if (!title || !category || !date || isNaN(amount) || isNaN(quantity) || amount < 0 || quantity <= 0) {
      alert("Please provide valid details for all fields.");
      return;
    }

    addExpense({ title, amount, quantity, category, date });
    form.reset();
    // set quantity to 1 default
    quantityInput.value = 1;
    // set date to today
    dateInput.value = (new Date()).toISOString().slice(0,10);
  });

  clearFormBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    form.reset();
    quantityInput.value = 1;
    dateInput.value = (new Date()).toISOString().slice(0,10);
  });

  // Delegate delete clicks on tbody
  tableBody.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".delete-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    if (!id) return;
    const found = expenses.find(e => e.id === id);
    const confirmed = confirm(`Delete "${found ? found.title : 'this expense'}"? This cannot be undone.`);
    if (confirmed) {
      deleteExpenseById(id);
    }
  });

  sortBtn.addEventListener("click", () => {
    renderTable({ filterCategory: filterSelect.value, sortKey: sortSelect.value });
  });

  filterBtn.addEventListener("click", () => {
    renderTable({ filterCategory: filterSelect.value, sortKey: sortSelect.value });
  });

  clearAllBtn.addEventListener("click", () => {
    if (!expenses.length) {
      alert("No expenses to clear.");
      return;
    }
    const confirmed = confirm("Are you sure you want to CLEAR ALL expenses? This will remove everything stored locally.");
    if (confirmed) {
      clearAllExpenses();
    }
  });

  // Utility: set default date input to today
  function setDefaultDate() {
    dateInput.value = (new Date()).toISOString().slice(0,10);
  }

  // Initialize app
  function init() {
    expenses = loadFromLocalStorage();
    if (!Array.isArray(expenses)) expenses = [];
    setDefaultDate();
    populateFilterCategories();
    renderTable({ filterCategory: "all", sortKey: sortSelect.value });
  }

  // Expose a small debug hook (optional)
  window.__kanhaExpenseDebug = {
    getExpenses: () => expenses.slice(),
    clearAll: () => { clearAllExpenses(); }
  };

  // Run init
  init();
})();
