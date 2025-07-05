document.addEventListener("DOMContentLoaded", () => {
    const categorySelect = document.getElementById("category-select");
    const newCategoryInput = document.getElementById("new-category-input");
    const toggleModeBtn = document.getElementById("toggle-mode");
    const searchInput = document.getElementById("search");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const expenseItems = document.querySelectorAll(".expense-item");
    const profileBtn = document.getElementById("profile-btn");
    const dropdown = document.getElementById("dropdown-menu");
    const fab = document.getElementById("fab");
    const modal = document.getElementById("modal");
    const close = document.getElementById("close");

    // === Restore Mode on Load ===
    const currentMode = localStorage.getItem("mode") || "light";
    applyMode(currentMode);

    function applyMode(mode) {
        if (mode === "dark") {
            document.body.classList.add("dark-mode");
            if (toggleModeBtn) toggleModeBtn.textContent = "☀️";
        } else {
            document.body.classList.remove("dark-mode");
            if (toggleModeBtn) toggleModeBtn.textContent = "🌙";
        }
    }

    // === Toggle Mode Button ===
    if (toggleModeBtn) {
        toggleModeBtn.addEventListener("click", () => {
            const newMode = document.body.classList.contains("dark-mode") ? "light" : "dark";
            localStorage.setItem("mode", newMode);
            applyMode(newMode);
        });
    }

    // === Add Member Button ===
    const addMemberBtn = document.getElementById("add-member-btn");
    if (addMemberBtn) {
        addMemberBtn.addEventListener("click", () => {
            const div = document.createElement("div");
            div.classList.add("member");
            div.innerHTML = `
                <input type="text" class="member-name" placeholder="Member Name" required>
                <input type="tel" class="member-phone" placeholder="Phone Number" required>
            `;
            const membersList = document.getElementById("members-list");
            if (membersList) membersList.appendChild(div);
        });
    }

    // === Create Group Button ===
    const createGroupBtn = document.getElementById("create-group-btn");
    if (createGroupBtn) {
        createGroupBtn.addEventListener("click", () => {
            const groupName = document.getElementById("group-name").value.trim();
            const nameElems = document.querySelectorAll(".member-name");
            const phoneElems = document.querySelectorAll(".member-phone");

            const members = [];
            for (let i = 0; i < nameElems.length; i++) {
                const name = nameElems[i].value.trim();
                const phone = phoneElems[i].value.trim();
                if (name && phone) {
                    members.push({ name, phone });
                }
            }

            if (!groupName || members.length === 0) {
                alert("Please enter group name and at least one member.");
                return;
            }

            fetch("/create_group", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_name: groupName, members })
            }).then(res => res.json())
                .then(data => {
                    alert(data.message);
                    location.reload();
                });
        });
    }

    // === Show/hide new category input ===
    if (categorySelect && newCategoryInput) {
        categorySelect.addEventListener("change", () => {
            if (categorySelect.value === "__new__") {
                newCategoryInput.style.display = "block";
                newCategoryInput.required = true;
            } else {
                newCategoryInput.style.display = "none";
                newCategoryInput.required = false;
            }
        });
    }

    // === Profile Button Dropdown ===
    if (profileBtn && dropdown) {
        profileBtn.addEventListener("click", () => {
            dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
        });

        document.addEventListener("click", (e) => {
            if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = "none";
            }
        });
    }

    // === FAB Modal Toggle ===
    if (fab && modal && close) {
        fab.addEventListener("click", () => {
            modal.style.display = "block";
        });

        close.addEventListener("click", () => {
            modal.style.display = "none";
        });

        window.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });
    }

    // === Category Filter ===
    if (filterButtons.length > 0 && expenseItems.length > 0) {
        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const selectedCategory = button.getAttribute("data-category");
                filterButtons.forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");

                expenseItems.forEach((item) => {
                    const itemCategory = item.getAttribute("data-category");
                    const match = selectedCategory === "All" || itemCategory === selectedCategory;
                    item.style.display = match ? "flex" : "none";
                });
            });
        });
    }

    // === Search Filter ===
    if (searchInput && expenseItems.length > 0) {
        searchInput.addEventListener("input", () => {
            const searchTerm = searchInput.value.toLowerCase();
            expenseItems.forEach((item) => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? "flex" : "none";
            });
        });
    }
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
