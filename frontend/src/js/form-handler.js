// form-handler.js
// form-handler.js
import { db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const form = document.getElementById("contactForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    firstname: form.firstname.value,
    lastname: form.lastname.value,
    phone: form.phone.value,
    email: form.email.value,
    subject: form.subject.value,
    message: form.message.value,
    timestamp: new Date()
  };

  try {
    await addDoc(collection(db, "contactMessages"), data);
    showAlert("Message sent successfully!", "success");
    form.reset();
  } catch (error) {
    console.error("Error submitting form:", error);
    showAlert("There was an error sending your message.", "error");
  }
});

