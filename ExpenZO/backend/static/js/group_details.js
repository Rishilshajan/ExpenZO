document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("expense-modal");
  const openBtn = document.getElementById("open-expense-modal");
  const closeBtn = document.getElementById("close-expense");
  const splitTypeRadios = document.querySelectorAll('input[name="split-type"]');
  const customSplitSection = document.getElementById("custom-split-section");
  const checkboxes = document.querySelectorAll('#member-checkboxes input[type="checkbox"]');
  const customSplitsDiv = document.getElementById("custom-splits");
  const scrollBtn = document.getElementById("scroll-to-top");
  const modalContent = document.querySelector(".modal-content");

  // Scroll-to-top logic
  modalContent.addEventListener("scroll", () => {
    scrollBtn.style.display = modalContent.scrollTop > 150 ? "block" : "none";
  });

  scrollBtn.onclick = () => {
    modalContent.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Open/Close modal
  openBtn.onclick = () => modal.style.display = "block";
  closeBtn.onclick = () => modal.style.display = "none";
  window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

  // Handle Split Type toggle
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

  // Repopulate custom inputs on checkbox change
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


  // Handle Form Submission
  document.getElementById("expense-form").addEventListener("submit", function (e) {
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

  // ✅ Check all custom amounts are valid
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
      body: JSON.stringify({
        title,
        amount,
        paid_by: paidBy,
        splits
      })
    }).then(res => res.json())
      .then(data => {
        alert(data.message);

       // ✅ Update UI using IDs
document.getElementById("total-balance").textContent = `₹ ${data.total_balance.toFixed(2)}`;
document.getElementById("amount-to-pay").textContent = `₹ ${data.amount_to_pay.toFixed(2)}`;
document.getElementById("amount-to-get").textContent = `₹ ${data.amount_to_receive.toFixed(2)}`;

// ✅ Update balance color based on positive/negative
const totalEl = document.getElementById("total-balance");
totalEl.className = `amount ${data.total_balance >= 0 ? "amount-positive" : "amount-negative"}`;


        modal.style.display = "none";
        document.getElementById("expense-form").reset();
        customSplitSection.style.display = "none";
        customSplitsDiv.innerHTML = '';
      })
      .catch(err => {
        alert("Error adding expense");
        console.error(err);
      });
  });

//Section 2
  // Tab Switching Logic
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    // Remove active class from all
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    // Add active to clicked
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

});
