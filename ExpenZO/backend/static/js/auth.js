document.addEventListener("DOMContentLoaded", () => {
    // 🔁 Handle Toggle Between Forms
    document.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", () => {
            // Remove active class from all buttons and forms
            document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
            document.querySelectorAll(".auth-form").forEach(form => form.classList.remove("active"));

            // Add active class to clicked button and corresponding form
            button.classList.add("active");
            const formId = button.getAttribute("data-form");
            document.getElementById(formId).classList.add("active");
        });
    });

    // ✅ Firebase Setup
    const firebaseConfig = window.firebaseConfig;
    firebase.initializeApp(firebaseConfig);
    const provider = new firebase.auth.GoogleAuthProvider();

    // 🔐 Google Auth
    document.querySelectorAll(".google-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            firebase.auth().signInWithPopup(provider)
                .then(result => {
                    const user = result.user;
                    const userData = {
                        name: user.displayName,
                        email: user.email,
                        phone: user.phoneNumber || "",
                        photo: user.photoURL
                    };
                    sessionStorage.setItem("authUser", JSON.stringify(userData));

                    // Store session in Flask
                    return fetch("/set_session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(userData)
                    });
                })
                .then(() => {
                    window.location.href = "/home";
                })
                .catch(error => {
                    console.error("Google Auth Error:", error);
                    alert("Authentication failed. Try again.");
                });
        });
    });

    // 📨 Handle Email Sign In / Sign Up
    document.querySelector("#login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(result => {
                const user = result.user;
                const userData = {
                    name: user.displayName || "",
                    email: user.email,
                    phone: user.phoneNumber || ""
                };
                sessionStorage.setItem("authUser", JSON.stringify(userData));

                return fetch("/set_session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userData)
                });
            })
            .then(() => {
                window.location.href = "/home";
            })
            .catch(error => {
                alert("Login Failed: " + error.message);
            });
    });

    document.querySelector("#signup-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const email = e.target.email.value;
        const password = e.target.password.value;
        const phone = e.target.phone.value;

        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(result => {
                const user = result.user;
                return user.updateProfile({ displayName: name }).then(() => ({
                    name,
                    email,
                    phone
                }));
            })
            .then(userData => {
                sessionStorage.setItem("authUser", JSON.stringify(userData));

                return fetch("/set_session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userData)
                });
            })
            .then(() => {
                window.location.href = "/home";
            })
            .catch(error => {
                alert("Signup Failed: " + error.message);
            });
    });
});
