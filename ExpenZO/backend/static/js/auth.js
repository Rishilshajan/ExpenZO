document.addEventListener("DOMContentLoaded", () => {
    //Toggle between Login and Signup forms
    document.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
            document.querySelectorAll(".auth-form").forEach(form => form.classList.remove("active"));

            button.classList.add("active");
            const formId = button.getAttribute("data-form");
            document.getElementById(formId).classList.add("active");
        });
    });


    //Firebase Setup
    const firebaseConfig = window.firebaseConfig;
    firebase.initializeApp(firebaseConfig);
    const provider = new firebase.auth.GoogleAuthProvider();


    //Google Auth Handler
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

                    return fetch("/set_session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(userData)
                    });
                })
                .then(async (res) => {
                    if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error("Server Error: " + errorText);
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    } else {
                        console.warn("No redirect URL in server response.");
                    }
                })
                .catch(err => {
                    console.error("Google Auth failed:", err);
                    alert("Google Sign-In Failed: " + err.message);
                });
        });
    });


    //Email/Password Login
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
            .then(async res => {
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error("Server Error: " + errorText);
                }
                return res.json();
            })
            .then(data => {
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    window.location.href = "/home";
                }
            })
            .catch(error => {
                console.error("Login error:", error);
                alert("Login Failed: " + error.message);
            });
    });


    //Email/Password Sign Up
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
            .then(async res => {
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error("Server Error: " + errorText);
                }
                return res.json();
            })
            .then(data => {
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    window.location.href = "/home";
                }
            })
            .catch(error => {
                console.error("Signup error:", error);
                alert("Signup Failed: " + error.message);
            });
    });
});
