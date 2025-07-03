document.addEventListener("DOMContentLoaded", () => {
    const categorySelect = document.getElementById("category-select");
    const newCategoryInput = document.getElementById("new-category-input");
    const toggleModeBtn = document.getElementById("toggle-mode");
    const searchInput = document.getElementById("search");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const expenseItems = document.querySelectorAll(".expense-item");
    const profileBtn = document.getElementById("profile-btn");
    const dropdown = document.getElementById('dropdown-menu');
    const fab = document.getElementById("fab");
    const modal = document.getElementById("fab-modal");
    const close = document.getElementById("fab-close");

    // === Restore Mode on Load ===
    const currentMode = localStorage.getItem("mode") || "light";
    applyMode(currentMode);

    function applyMode(mode) {
        if (mode === "dark") {
            document.body.classList.add("dark-mode");
            toggleModeBtn.textContent = "☀️";
        } else {
            document.body.classList.remove("dark-mode");
            toggleModeBtn.textContent = "🌙";
        }
    }

    // === Toggle Mode Button ===
    toggleModeBtn.addEventListener("click", () => {
        const newMode = document.body.classList.contains("dark-mode") ? "light" : "dark";
        localStorage.setItem("mode", newMode);
        applyMode(newMode); 
    });

    // === Show/hide new category input ===
    categorySelect.addEventListener("change", () => {
        if (categorySelect.value === "__new__") {
            newCategoryInput.style.display = "block";
            newCategoryInput.required = true;
        } else {
            newCategoryInput.style.display = "none";
            newCategoryInput.required = false;
        }
    });

    profileBtn.addEventListener("click", () => {
        dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
    });

    // Optional: Click outside to close dropdown
    document.addEventListener("click", (e) => {
        if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });

     fab.addEventListener("click", () => {
    modal.style.display = "block";
  });

  close.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Optional: click outside modal to close
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });


    // === Category filter ===
    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedCategory = button.getAttribute("data-category");
            filterButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");

            expenseItems.forEach((item) => {
                const itemCategory = item.getAttribute("data-category");
                const match =
                    selectedCategory === "All" || itemCategory === selectedCategory;
                item.style.display = match ? "flex" : "none";
            });
        });
    });

    // === Search filter ===
    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.toLowerCase();
        expenseItems.forEach((item) => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? "flex" : "none";
        });
    });
});

// === Pie Chart Rendering ===
document.addEventListener("DOMContentLoaded", function () {
    const pie = document.getElementById("piechart");
    if (!pie) return;

    const ctx = pie.getContext("2d");
    const labels = JSON.parse(pie.dataset.labels || "[]");
    const data = JSON.parse(pie.dataset.values || "[]");

    new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                label: "Expense by category",
                data: data,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                    '#9966FF', '#FF9F40', '#00B894', '#E84393'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" },
                title: {
                    display: true,
                    text: "Spending by Category"
                }
            }
        }
    });
});
