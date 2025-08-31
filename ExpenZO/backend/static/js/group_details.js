document.addEventListener("DOMContentLoaded", () => {
    // Expense modal handling
    const modal = document.getElementById("expense-modal");
    const openBtn = document.getElementById("open-expense-modal");
    const closeBtn = document.getElementById("close-expense");
    const splitTypeRadios = document.querySelectorAll('input[name="split-type"]');
    const customSplitSection = document.getElementById("custom-split-section");
    const customSplitsDiv = document.getElementById("custom-splits");
    const scrollBtn = document.getElementById("scroll-to-top");
    const modalContent = document.querySelector(".modal-content");

    modalContent.addEventListener('scroll', () => {
    scrollBtn.style.display = modalContent.scrollTop > 200 ? 'block' : 'none';
});

scrollBtn.addEventListener('click', () => {
    modalContent.scrollTo({ top: 0, behavior: 'smooth' });
});


    if (modalContent) {
        modalContent.addEventListener("scroll", () => {
            scrollBtn.style.display = modalContent.scrollTop > 150 ? "block" : "none";
        });
        scrollBtn.onclick = () => {
            modalContent.scrollTo({ top: 0, behavior: "smooth" });
        };
    }

    if (openBtn && closeBtn && modal) {
        openBtn.onclick = () => (modal.style.display = "block");
        closeBtn.onclick = () => (modal.style.display = "none");
        window.onclick = (e) => {
            if (e.target === modal) modal.style.display = "none";
        };
    }

    // Member selection and custom input population functions
    function getMemberCheckboxes() {
        return Array.from(document.querySelectorAll('#member-checkboxes input[type="checkbox"]'));
    }

    document.querySelectorAll('#member-checkboxes .member').forEach(box => {
    const checkbox = box.querySelector('input');
    checkbox.addEventListener('change', () => {
        box.classList.toggle('selected', checkbox.checked);
    });
});


    function populateCustomInputs() {
        const customSplitsDiv = document.getElementById("custom-splits");
        customSplitsDiv.innerHTML = '';
        const checkboxes = getMemberCheckboxes();
        checkboxes.forEach(cb => {
            if (cb.checked) {
                const phone = cb.value;
                const parent = cb.closest('.member');
                const labelText = parent?.dataset.name || (cb.nextElementSibling ? cb.nextElementSibling.innerText : phone);
                const div = document.createElement("div");
                div.className = 'custom-split-row';
                div.style.marginBottom = '8px';
                div.innerHTML = `
                    <label style="font-weight:600; display:block; margin-bottom:6px;">${labelText}:</label>
                    <input type="number" name="custom-split" data-phone="${phone}" min="0" step="0.01" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc;">
                `;
                customSplitsDiv.appendChild(div);
            }
        });
    }

    // Setup clickable member cards
    function initMemberCards() {
        const memberCards = Array.from(document.querySelectorAll('#member-checkboxes .member'));
        memberCards.forEach(card => {
            const cb = card.querySelector('input[type="checkbox"]');
            if (cb) {
                card.classList.toggle('selected', cb.checked);
                card.addEventListener('click', (e) => {
                    const clickedCheckbox = e.target.closest('input[type="checkbox"]');
                    if (!clickedCheckbox) {
                        cb.checked = !cb.checked;
                    }
                    card.classList.toggle('selected', cb.checked);
                    const splitType = document.querySelector('input[name="split-type"]:checked')?.value;
                    if (splitType === 'custom') populateCustomInputs();
                });
            }
        });
    }

    initMemberCards();

    // make sure split-type radio changes update custom inputs / visibility
    splitTypeRadios.forEach(r => {
        r.addEventListener('change', () => {
            const customSection = document.getElementById('custom-split-section');
            if (r.value === 'custom' && r.checked) {
                customSection.style.display = 'block';
                populateCustomInputs();
            } else if (r.value === 'equal' && r.checked) {
                customSection.style.display = 'none';
                document.getElementById('custom-splits').innerHTML = '';
            }
        });
    });

    // Expense form submission
    const expenseForm = document.getElementById("expense-form");
    if (expenseForm) {
        expenseForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const title = document.getElementById("expense-title").value.trim();
            const amount = parseFloat(document.getElementById("expense-amount").value);
            const paidBy = document.getElementById("paid-by").value;
            const checkboxes = getMemberCheckboxes();
            const selectedMembers = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

            if (selectedMembers.length === 0) {
                alert("Please select at least one member to split the amount.");
                return;
            }

            const splitType = document.querySelector('input[name="split-type"]:checked').value;
            let splits = [];
            if (splitType === "equal") {
                const share = parseFloat((amount / selectedMembers.length).toFixed(2));
                splits = selectedMembers.map(phone => ({
                    phone: phone,
                    amount: share,
                    role: phone === paidBy ? "paid" : "owes"
                }));
            }
            if (splitType === "custom") {
                const inputs = document.querySelectorAll('#custom-splits input');
                splits = Array.from(inputs).map(input => ({
                    phone: input.dataset.phone,
                    amount: parseFloat(input.value),
                    role: input.dataset.phone === paidBy ? "paid" : "owes"
                }));
                const hasEmpty = splits.some(s => isNaN(s.amount) || s.amount <= 0);
                if (hasEmpty) {
                    alert("Please fill all custom split amounts correctly.");
                    return;
                }
            }
            fetch(window.location.pathname + "/add_expense", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, amount, paid_by: paidBy, splits })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                document.getElementById("total-balance").textContent = `₹ ${data.total_balance.toFixed(2)}`;
                document.getElementById("amount-to-pay").textContent = `₹ ${data.amount_to_pay.toFixed(2)}`;
                document.getElementById("amount-to-get").textContent = `₹ ${data.amount_to_receive.toFixed(2)}`;
                const totalEl = document.getElementById("total-balance");
                totalEl.className = `amount ${data.total_balance >= 0 ? "amount-positive" : "amount-negative"}`;
                modal.style.display = "none";
                expenseForm.reset();
                customSplitSection.style.display = "none";
                customSplitsDiv.innerHTML = '';
                loadBalanceData();
                loadExpenseHistory();
            })
            .catch(err => {
                alert("Error adding expense");
                console.error(err);
            });
        });
    }

    document.querySelectorAll('.member').forEach(box => {
  box.addEventListener('click', () => {
    const checkbox = box.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked;
    box.classList.toggle('selected', checkbox.checked);
  });
});


    // Tabs
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
        });
    });

    // Initialize
    loadBalanceData();
    loadExpenseHistory();
    loadAnalyticsData();

    const barFilter = document.getElementById("bar-filter");
    if (barFilter) {
        barFilter.addEventListener("change", () => {
            if (!analyticsData) return;
            const val = barFilter.value;
            const dataset = val === "weekly" ? analyticsData.bar_weekly :
                val === "monthly" ? analyticsData.bar_monthly :
                analyticsData.bar_daily;
            renderBarChart(dataset);
        });
    }
});

// MEMBER FUNCTIONS
function deleteMember(phone) {
    if (confirm("Are you sure you want to delete this member?")) {
        fetch(window.location.pathname + "/delete_member", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            location.reload();
        })
        .catch(err => {
            alert("Error deleting member");
            console.error(err);
        });
    }
}

function openAddMemberModal() {
    document.getElementById("member-mode").value = "add";
    document.getElementById("member-modal-title").textContent = "Add Member";
    document.getElementById("member-form").reset();
    document.getElementById("member-phone").disabled = false;
    document.getElementById("member-modal").style.display = "block";
}

function editMember(phone) {
    const member = document.querySelector(`.member-item[data-phone="${phone}"]`);
    if (!member) return;
    const name = member.dataset.name;
    document.getElementById("member-mode").value = "edit";
    document.getElementById("member-modal-title").textContent = "Edit Member";
    document.getElementById("member-name").value = name;
    document.getElementById("member-phone").value = phone;
    document.getElementById("member-phone").disabled = true;
    document.getElementById("member-phone-original").value = phone;
    document.getElementById("member-modal").style.display = "block";
}

function closeMemberModal() {
    document.getElementById("member-modal").style.display = "none";
}

const memberForm = document.getElementById("member-form");
if (memberForm) {
    memberForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const mode = document.getElementById("member-mode").value;
        const name = document.getElementById("member-name").value.trim();
        const phone = document.getElementById("member-phone").value.trim();
        const original_phone = document.getElementById("member-phone-original").value;
        const payload = {
            name,
            phone,
            original_phone: mode === "edit" ? original_phone : null
        };
        const endpoint = mode === "edit" ? "/edit_member" : "/add_member";
        fetch(window.location.pathname + endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            closeMemberModal();
            location.reload();
        })
        .catch(err => {
            alert("Error saving member");
            console.error(err);
        });
    });
}

// BALANCE FUNCTIONS
function loadBalanceData() {
    const groupId = window.location.pathname.split("/")[2];
    fetch(`/group/${groupId}/my_balances`)
    .then(response => response.json())
    .then(data => {
        document.getElementById("total-balance").innerText = `₹${data.total_balance}`;
        document.getElementById("amount-to-pay").innerText = `₹${data.amount_to_pay}`;
        document.getElementById("amount-to-get").innerText = `₹${data.amount_to_get}`;
        const toGetDiv = document.getElementById("to-get-list");
        const toPayDiv = document.getElementById("to-pay-list");
        const timelineDiv = document.getElementById("balance-timeline");
        toGetDiv.innerHTML = "";
        toPayDiv.innerHTML = "";
        timelineDiv.innerHTML = "";
        data.to_get.forEach(item => {
            const entry = document.createElement("div");
            entry.className = "balance-entry";
            entry.innerText = `${item.name} owes you ₹${item.amount}`;
            toGetDiv.appendChild(entry);
        });
        data.to_pay.forEach(item => {
            const entry = document.createElement("div");
            entry.className = "balance-entry";
            entry.innerHTML = `
                <span>You owe ₹${item.amount} to ${item.name}</span>
                <button onclick="settlePayment('${item.phone}', ${item.amount}, 'gpay')">GPay</button>
                <button onclick="settlePayment('${item.phone}', ${item.amount}, 'manual')">Mark as Paid</button>
            `;
            toPayDiv.appendChild(entry);
        });
        data.transactions.forEach(t => {
            const box = document.createElement("div");
            box.className = "timeline-entry";
            const date = new Date(t.date).toLocaleString();
            const action = t.direction === "receive" ? "Received from" : "Paid to";
            box.innerHTML = `
                <div class="dot"></div>
                <div class="content">
                    <p><strong>${t.title}</strong></p>
                    <p>${action} ${t.to_name}: ₹${t.amount}</p>
                    <p class="timestamp">${date}</p>
                </div>
            `;
            timelineDiv.appendChild(box);
        });
        const totalEl = document.getElementById("total-balance");
        totalEl.className = `amount ${data.total_balance >= 0 ? "amount-positive" : "amount-negative"}`;
    });
}

// EXPENSE HISTORY
function loadExpenseHistory() {
    const groupId = window.location.pathname.split("/")[2];
    fetch(`/group/${groupId}/all_expenses`)
    .then(res => res.json())
    .then(data => {
        renderExpenseHistory(data.expenses);
    })
    .catch(err => {
        console.error("Error loading expense history:", err);
    });
}

function renderExpenseHistory(expenses) {
    const container = document.getElementById("expense-history-list");
    container.innerHTML = "";
    expenses.forEach((exp) => {
        const dateStr = new Date(exp.created_at).toLocaleString();
        const entry = document.createElement("div");
        entry.className = "history-entry";
        entry.innerHTML = `
            <div class="history-title">${exp.title} - ₹${exp.amount}</div>
            <div class="history-details">
                <p><strong>Paid by:</strong> ${exp.paid_by}</p>
                <ul>
                    ${exp.splits.map(s => `<li>${s.name} (${s.role}) - ₹${s.amount}</li>`).join("")}
                </ul>
                <span class="history-date">${dateStr}</span>
            </div>
        `;
        entry.addEventListener("click", () => {
            entry.classList.toggle("open");
        });
        container.appendChild(entry);
    });
}

let analyticsData = null;

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        tab.classList.add("active");
        const tabName = tab.dataset.tab;
        document.getElementById("tab-" + tabName).classList.add("active");
        const chartWrapper = document.getElementById("charts-container");
        if (chartWrapper) {
            chartWrapper.style.display = tabName === "analytics" ? "flex" : "none";
        }
        if (tabName === "analytics") {
            loadAnalyticsData();
        }
    });
});

function loadAnalyticsData() {
    const groupId = window.location.pathname.split("/")[2];
    fetch(`/group/${groupId}/analytics_data`)
    .then(res => res.json())
    .then(data => {
        analyticsData = data;
        document.getElementById("total-expense").innerText = `₹${data.total}`;
        renderBarChart(data.bar_daily);
        renderPieChart(data.pie);
    });
}

let barChart, pieChart;

function renderBarChart(data) {
    const ctx = document.getElementById("bar-chart").getContext("2d");
    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: "Expenses",
                data: Object.values(data),
                backgroundColor: "#2196f3",
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Amount (₹)" }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { mode: "index" }
            }
        }
    });
}

function renderPieChart(data) {
    const ctx = document.getElementById("pie-chart").getContext("2d");
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    "#4caf50", "#ff9800", "#03a9f4", "#e91e63",
                    "#9c27b0", "#ffc107", "#00bcd4", "#8bc34a"
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ₹${ctx.raw}`
                    }
                }
            }
        }
    });
}

function settlePayment(entryId, senderPhone, receiverPhone, amount, method, currentUserPhone, otherUserName) {
    const confirmMsg = method === "gpay" ?
        `Confirm Google Pay payment of ₹${amount} to ${otherUserName}?` :
        `Mark ₹${amount} as paid manually to ${otherUserName}?`;
    if (!confirm(confirmMsg)) return;
    fetch(window.location.pathname + "/settle_payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            entry_id: entryId,
            phone: String(currentUserPhone).trim(),
            senderPhone: String(senderPhone).trim(),
            receiverPhone: String(receiverPhone).trim(),
            method: method
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message || "Payment settled.");
            loadBalanceData();
        }
    })
    .catch(err => {
        console.error("Settlement error:", err);
        alert("Error settling payment.");
    });
}