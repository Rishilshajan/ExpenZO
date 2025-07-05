document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("expense-modal");
  const openBtn = document.getElementById("open-expense-modal");
  const closeBtn = document.getElementById("close-expense");
  const splitTypeRadios = document.querySelectorAll('input[name="split-type"]');
  const customSplitSection = document.getElementById("custom-split-section");
  const checkboxes = document.querySelectorAll('#member-checkboxes input[type="checkbox"]');
  const customSplitsDiv = document.getElementById("custom-splits");

  // Open modal
  openBtn.onclick = () => modal.style.display = "block";
  closeBtn.onclick = () => modal.style.display = "none";

  // Click outside closes modal
  window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

  // Handle split type toggle
  splitTypeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "custom") {
        customSplitSection.style.display = "block";

        customSplitsDiv.innerHTML = '';
        checkboxes.forEach(cb => {
          if (cb.checked) {
            const phone = cb.value;
            const label = cb.nextElementSibling.innerText;

            const div = document.createElement("div");
            div.innerHTML = `
              <label>${label}:</label>
              <input type="number" name="custom-split" data-phone="${phone}" min="0" required>
            `;
            customSplitsDiv.appendChild(div);
          }
        });
      } else {
        customSplitSection.style.display = "none";
      }
    });
  });

  // Auto-populate custom split inputs when members are selected
  checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      const customChecked = document.querySelector('input[name="split-type"]:checked').value === "custom";
      if (!customChecked) return;

      customSplitsDiv.innerHTML = '';
      checkboxes.forEach(cb => {
        if (cb.checked) {
          const phone = cb.value;
          const label = cb.nextElementSibling.innerText;

          const div = document.createElement("div");
          div.innerHTML = `
            <label>${label}:</label>
            <input type="number" name="custom-split" data-phone="${phone}" min="0" required>
          `;
          customSplitsDiv.appendChild(div);
        }
      });
    });
  });

  // Submit Form
  document.getElementById("expense-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("expense-title").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);
    const paidBy = document.getElementById("paid-by").value;

    const selectedMembers = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    const splitType = document.querySelector('input[name="split-type"]:checked').value;
    let splits = [];

    if (splitType === "equal") {
      const share = parseFloat((amount / selectedMembers.length).toFixed(2));
      splits = selectedMembers.map(phone => ({
        phone: phone,
        amount: share,
        role: phone === paidBy ? "paid" : "owes"
      }));
    } else {
      const inputs = document.querySelectorAll('#custom-splits input');
      splits = Array.from(inputs).map(input => ({
        phone: input.dataset.phone,
        amount: parseFloat(input.value),
        role: input.dataset.phone === paidBy ? "paid" : "owes"
      }));
    }

    // Post to Flask backend
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
        location.reload();
      }).catch(err => {
        alert("Error adding expense");
        console.error(err);
      });
  });
});
