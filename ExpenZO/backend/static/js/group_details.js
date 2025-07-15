document.addEventListener("DOMContentLoaded", () => {
  // Expense modal handling
  const modal = document.getElementById("expense-modal");
  const openBtn = document.getElementById("open-expense-modal");
  const closeBtn = document.getElementById("close-expense");
  const splitTypeRadios = document.querySelectorAll('input[name="split-type"]');
  const customSplitSection = document.getElementById("custom-split-section");
  const checkboxes = document.querySelectorAll('#member-checkboxes input[type="checkbox"]');
  const customSplitsDiv = document.getElementById("custom-splits");
  const scrollBtn = document.getElementById("scroll-to-top");
  const modalContent = document.querySelector(".modal-content");

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

  splitTypeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "custom") {
        customSplitSection.style.display = "block";
        populateCustomInputs();
      } else {
        customSplitSection.style.display = "none";
      }
    });
  });

  checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      const isCustom = document.querySelector('input[name="split-type"]:checked').value === "custom";
      if (isCustom) populateCustomInputs();
    });
  });

  function populateCustomInputs() {
    customSplitsDiv.innerHTML = '';
    checkboxes.forEach(cb => {
      if (cb.checked) {
        const phone = cb.value;
        const label = cb.nextElementSibling.innerText;

        const div = document.createElement("div");
        div.innerHTML = `
          <label>${label}:</label>
          <input type="number" name="custom-split" data-phone="${phone}" min="0">
        `;
        customSplitsDiv.appendChild(div);
      }
    });
  }

  // Expense form submission
  const expenseForm = document.getElementById("expense-form");
  if (expenseForm) {
    expenseForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const title = document.getElementById("expense-title").value.trim();
      const amount = parseFloat(document.getElementById("expense-amount").value);
      const paidBy = document.getElementById("paid-by").value;

      const selectedMembers = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

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

      // Send to backend
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
        })
        .catch(err => {
          alert("Error adding expense");
          console.error(err);
        });
    });
  }

  // Tabs
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });
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
  const member = [...document.querySelectorAll(".member-item")].find(item =>
    item.textContent.includes(phone)
  );
  if (!member) return;

  const name = member.querySelector("span").textContent.split(" (")[0];

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
  memberForm.addEventListener("submit", function (e) {
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

// 🧠 BALANCE LOADER FUNCTION
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

      // Update class styling
      const totalEl = document.getElementById("total-balance");
      totalEl.className = `amount ${data.total_balance >= 0 ? "amount-positive" : "amount-negative"}`;
    });
}

function renderBalances(data) {
  const toPayList = document.getElementById("to-pay-list");
  const toGetList = document.getElementById("to-get-list");
  const timeline = document.getElementById("balance-timeline");

  toPayList.innerHTML = "";
  toGetList.innerHTML = "";
  timeline.innerHTML = "";

  data.to_pay.forEach(entry => {
    toPayList.innerHTML += `
      <div class="balance-entry">
        <span>Pay ₹${entry.amount} to ${entry.name}</span>
        <button onclick="settlePayment('${entry.phone}', ${entry.amount}, 'gpay')">GPay</button>
        <button onclick="settlePayment('${entry.phone}', ${entry.amount}, 'manual')">Mark as Paid</button>
      </div>
    `;
  });

  data.to_get.forEach(entry => {
    toGetList.innerHTML += `
      <div class="balance-entry">
        <span>${entry.name} owes you ₹${entry.amount}</span>
      </div>
    `;
  });

  data.transactions.forEach(tx => {
    const direction = tx.direction === "pay" ? "Paid to" : "Received from";
    const date = new Date(tx.date).toLocaleString();

    timeline.innerHTML += `
      <div class="timeline-entry">
        <div class="dot"></div>
        <div class="content">
          <p><strong>${tx.title}</strong></p>
          <p>${direction} ${tx.to}: ₹${tx.amount}</p>
          <p class="timestamp">${date}</p>
        </div>
      </div>
    `;
  });
}


// 📤 Settlement trigger
function settlePayment(phone, amount, method) {
  const confirmMsg = method === "gpay"
    ? `Confirm Google Pay payment of ₹${amount} to ${phone}?`
    : `Mark ₹${amount} as paid manually to ${phone}?`;

  if (!confirm(confirmMsg)) return;

  fetch(window.location.pathname + "/settle_payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, amount, method })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || "Payment settled.");
      loadBalanceData();
    })
    .catch(err => {
      console.error("Settlement error:", err);
      alert("Error settling payment.");
    });
}

