// ------- GLOBAL STATE -------

let events = [];
let currentView = "home";
let selectedEvent = null;

const categoryEmojis = {
  "Tiyatro": "🎭",
  "Sergi": "🎨",
  "Bale": "🩰",
  "Konser": "🎵",
  "Şehir Keşfi": "🏛️"
};

const senaName = "Sena";
const hanneName = "Hanne";
const merveName = "Merve";

// ------- YARDIMCILAR -------

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function notify(message, color = "#C9A690") {
  const div = document.createElement("div");
  div.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${color};
    color: white;
    padding: 1rem 2rem;
    border-radius: 12px;
    z-index: 2000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    font-family: 'Inter', sans-serif;
  `;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function switchView(view) {
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.remove("active");
  });
  const target = document.getElementById(`${view}-view`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("active");
    if (link.dataset.view === view) {
      link.classList.add("active");
    }
  });

  currentView = view;
}

// ------- BACKEND İLE KONUŞAN FONKSİYONLAR -------

async function fetchEvents() {
  try {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error("event çekilemedi");
    const data = await res.json();
    events = data.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    renderTimeline();
    renderEventsGrid();

    if (currentView === "detail" && selectedEvent) {
      const updated = events.find(e => e.id === selectedEvent.id);
      if (updated) {
        selectedEvent = updated;
        renderEventDetail(selectedEvent);
      }
    }
  } catch (err) {
    console.error(err);
    notify("Etkinlikler yüklenemedi", "#D66565");
  }
}

async function createEventOnServer(eventData) {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventData)
  });
  if (!res.ok) throw new Error("Etkinlik kaydedilemedi");
  return await res.json();
}

async function updateEventOnServer(eventData) {
  if (!eventData.id) throw new Error("id yok");
  const res = await fetch(`/api/events/${eventData.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventData)
  });
  if (!res.ok) throw new Error("Etkinlik güncellenemedi");
  return await res.json();
}

async function deleteEventOnServer(id) {
  const res = await fetch(`/api/events/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Etkinlik silinemedi");
  return await res.json();
}

// ------- RENDER FONKSİYONLARI -------

function renderTimeline() {
  const timeline = document.getElementById("timeline");
  if (!timeline) return;

  if (events.length === 0) {
    timeline.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <p class="empty-text">Henüz etkinlik eklenmemiş. İlk deneyiminizi paylaşarak başlayın!</p>
      </div>
    `;
    return;
  }

  timeline.innerHTML = events
    .map(ev => `
      <div class="event-card" data-id="${ev.id}">
        <div class="event-meta">
          <span class="event-date">${formatDate(ev.date)}</span>
          <span class="event-category">${ev.category || ""}</span>
        </div>
        <h2 class="event-title">${ev.title || ""}</h2>
        <p class="event-venue">${ev.venue || ""}</p>
        <p class="event-summary">${ev.summary || ""}</p>
      </div>
    `)
    .join("");

  document.querySelectorAll(".event-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const ev = events.find(e => e.id === id);
      if (ev) showEventDetail(ev);
    });
  });
}

function renderEventsGrid() {
  const grid = document.getElementById("events-grid");
  if (!grid) return;

  if (events.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <p class="empty-text">Henüz etkinlik eklenmemiş</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = events
    .map(ev => {
      const emoji = categoryEmojis[ev.category] || "🎭";
      const photos = ev.photos
        ? ev.photos.split("|||").filter(p => p.trim())
        : [];
      const lastPhoto = photos[photos.length - 1];

      const hasReviews = [
        { emoji: "👱🏻‍♀️", has: !!ev.senaReview },
        { emoji: "👩🏻", has: !!ev.hanneReview },
        { emoji: "👩🏻‍🦰", has: !!ev.merveReview }
      ];

      return `
        <div class="event-grid-card" data-id="${ev.id}">
          <div class="event-grid-image">
            ${
              lastPhoto
                ? `<img src="${lastPhoto}" alt="${ev.title}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${emoji}';">`
                : emoji
            }
          </div>
          <div class="event-grid-content">
            <div class="event-grid-meta">
              <span class="event-grid-date">${formatDate(ev.date)}</span>
              <span class="event-grid-category">${ev.category || ""}</span>
            </div>
            <h3 class="event-grid-title">${ev.title || ""}</h3>
            <p class="event-grid-venue">${ev.venue || ""}</p>
            <div class="event-grid-reviews">
              ${hasReviews
                .map(
                  r =>
                    `<div class="review-avatar ${
                      !r.has ? "empty" : ""
                    }">${r.emoji}</div>`
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".event-grid-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const ev = events.find(e => e.id === id);
      if (ev) showEventDetail(ev);
    });
  });
}

function showEventDetail(ev) {
  selectedEvent = ev;
  switchView("detail");
  renderEventDetail(ev);
}

function renderEventDetail(ev) {
  const emoji = categoryEmojis[ev.category] || "🎭";

  const hero = document.getElementById("detail-hero");
  const title = document.getElementById("detail-title");
  const date = document.getElementById("detail-date");
  const venue = document.getElementById("detail-venue");
  const cat = document.getElementById("detail-category");

  if (hero) hero.textContent = emoji;
  if (title) title.textContent = ev.title || "";
  if (date) date.textContent = formatDate(ev.date);
  if (venue) venue.textContent = ev.venue || "";
  if (cat) cat.textContent = ev.category || "";

  renderGallery(ev);
  renderReviews(ev);
}

function renderGallery(ev) {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  const photos = ev.photos
    ? ev.photos.split("|||").filter(p => p.trim())
    : [];

  if (photos.length === 0) {
    grid.innerHTML = `
      <div class="empty-gallery">
        <div class="empty-gallery-icon">📸</div>
        <p class="empty-gallery-text">Henüz fotoğraf eklenmemiş</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = photos
    .map(
      (p, idx) => `
    <div class="gallery-item" data-photo-index="${idx}">
      <img src="${p}" alt="Etkinlik fotoğrafı ${idx + 1}" onerror="this.parentElement.remove();">
      <button class="gallery-item-delete" data-photo-index="${idx}">🗑️</button>
    </div>
  `
    )
    .join("");

  document.querySelectorAll(".gallery-item img").forEach(img => {
    img.addEventListener("click", () => {
      const overlay = document.getElementById("lightbox-overlay");
      const imgEl = document.getElementById("lightbox-image");
      if (!overlay || !imgEl) return;
      imgEl.src = img.src;
      overlay.classList.add("active");
    });
  });

  document.querySelectorAll(".gallery-item-delete").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.photoIndex, 10);
      await deletePhoto(idx);
    });
  });
}

function renderReviews(ev) {
  const grid = document.getElementById("reviews-grid");
  if (!grid) return;

  const reviews = [
    {
      name: senaName,
      key: "sena",
      mood: ev.senaMood,
      rating: ev.senaRating,
      text: ev.senaReview,
      highlight: ev.senaHighlight,
      photo: ev.senaPhoto
    },
    {
      name: hanneName,
      key: "hanne",
      mood: ev.hanneMood,
      rating: ev.hanneRating,
      text: ev.hanneReview,
      highlight: ev.hanneHighlight,
      photo: ev.hannePhoto
    },
    {
      name: merveName,
      key: "merve",
      mood: ev.merveMood,
      rating: ev.merveRating,
      text: ev.merveReview,
      highlight: ev.merveHighlight,
      photo: ev.mervePhoto
    }
  ];

  grid.innerHTML = reviews
    .map(r =>
      r.text
        ? createReviewCard(
            r.name,
            r.mood,
            r.rating,
            r.text,
            r.highlight,
            r.photo,
            r.key,
            ev.id
          )
        : createEmptyReviewCard(r.name, r.key, ev.id)
    )
    .join("");

  document.querySelectorAll(".add-review-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const author = btn.dataset.author;
      const eventId = btn.dataset.eventId;
      openReviewModal(author, eventId, false);
    });
  });

  document.querySelectorAll(".edit-review-button").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const author = btn.dataset.author;
      const eventId = btn.dataset.eventId;
      openReviewModal(author, eventId, true);
    });
  });

  document.querySelectorAll(".delete-review-button").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const author = btn.dataset.author;
      const eventId = btn.dataset.eventId;

      if (!btn.dataset.confirmDelete) {
        btn.textContent = "✓";
        btn.dataset.confirmDelete = "true";
        setTimeout(() => {
          delete btn.dataset.confirmDelete;
          btn.textContent = "🗑️";
        }, 3000);
        return;
      }

      await deleteReview(author, eventId);
    });
  });
}

function createReviewCard(
  name,
  mood,
  rating,
  review,
  highlight,
  photo,
  authorKey,
  eventId
) {
  const stars =
    rating && rating > 0
      ? Array(5)
          .fill(0)
          .map(
            (_, i) =>
              `<span class="star ${i < rating ? "" : "empty"}">★</span>`
          )
          .join("")
      : "";

  const photoHtml = photo
    ? `<img src="${photo}" alt="${name} fotoğrafı" class="review-photo" onerror="this.style.display='none';">`
    : "";

  return `
    <div class="review-card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
        <h3 class="reviewer-name">${name}</h3>
        <div style="display:flex;gap:0.5rem;">
          <button class="edit-review-button" data-author="${authorKey}" data-event-id="${eventId}" style="background:none;border:none;color:#C9A690;cursor:pointer;font-size:1.2rem;padding:0.25rem 0.5rem;">✏️</button>
          <button class="delete-review-button" data-author="${authorKey}" data-event-id="${eventId}" style="background:none;border:none;color:#D66565;cursor:pointer;font-size:1.2rem;padding:0.25rem 0.5rem;">🗑️</button>
        </div>
      </div>
      ${mood ? `<div class="review-mood">${mood}</div>` : ""}
      ${stars ? `<div class="review-rating">${stars}</div>` : ""}
      <p class="review-text">${review}</p>
      ${photoHtml}
      ${
        highlight
          ? `<p class="review-highlight">"${highlight}"</p>`
          : ""
      }
    </div>
  `;
}

function createEmptyReviewCard(name, authorKey, eventId) {
  return `
    <div class="review-card empty">
      <div class="empty-review-icon">✍️</div>
      <p class="empty-review-text">${name} henüz yorum yapmadı</p>
      <button class="add-review-button" data-author="${authorKey}" data-event-id="${eventId}">
        Yorum Ekle
      </button>
    </div>
  `;
}

// ------- YORUM VE FOTO İŞLEMLERİ -------

function openReviewModal(author, eventId, isEditing = false) {
  const modal = document.getElementById("modal-overlay");
  const titleEl = document.getElementById("modal-title");
  const eventForm = document.getElementById("event-form");
  const reviewForm = document.getElementById("review-form");
  const photoForm = document.getElementById("photo-form");

  if (!modal || !titleEl || !eventForm || !reviewForm || !photoForm) return;

  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  selectedEvent = ev;

  titleEl.textContent = isEditing ? "Yorumu Düzenle" : "Yorum Ekle";
  eventForm.style.display = "none";
  reviewForm.style.display = "block";
  photoForm.style.display = "none";

  const authorSelect = document.getElementById("review-author");
  const textInput = document.getElementById("review-text");
  const moodInput = document.getElementById("review-mood");
  const ratingInput = document.getElementById("review-rating");
  const highlightInput = document.getElementById("review-highlight");

  authorSelect.value = author;

  if (isEditing) {
    textInput.value = ev[`${author}Review`] || "";
    moodInput.value = ev[`${author}Mood`] || "";
    ratingInput.value = ev[`${author}Rating`] || "";
    highlightInput.value = ev[`${author}Highlight`] || "";
  } else {
    reviewForm.reset();
    authorSelect.value = author;
  }

  modal.classList.add("active");
}

async function deleteReview(author, eventId) {
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;

  const updated = { ...ev };
  updated[`${author}Review`] = "";
  updated[`${author}Mood`] = "";
  updated[`${author}Rating`] = 0;
  updated[`${author}Highlight`] = "";
  updated[`${author}Photo`] = "";

  try {
    await updateEventOnServer(updated);
    await fetchEvents();
    notify("Yorum silindi");
  } catch (err) {
    console.error(err);
    notify("Yorum silinemedi", "#D66565");
  }
}

async function deletePhoto(photoIndex) {
  if (!selectedEvent) return;
  const photos = selectedEvent.photos
    ? selectedEvent.photos.split("|||").filter(p => p.trim())
    : [];
  photos.splice(photoIndex, 1);
  const updated = { ...selectedEvent, photos: photos.join("|||") };

  try {
    await updateEventOnServer(updated);
    await fetchEvents();
    notify("Fotoğraf silindi");
  } catch (err) {
    console.error(err);
    notify("Fotoğraf silinemedi", "#D66565");
  }
}

// ------- MODAL AÇ/KAPAT, FORM HANDLERLARI -------

function openEventModal() {
  const modal = document.getElementById("modal-overlay");
  const titleEl = document.getElementById("modal-title");
  const eventForm = document.getElementById("event-form");
  const reviewForm = document.getElementById("review-form");
  const photoForm = document.getElementById("photo-form");

  if (!modal || !titleEl || !eventForm || !reviewForm || !photoForm) return;

  titleEl.textContent = "Yeni Etkinlik Ekle";
  eventForm.style.display = "block";
  reviewForm.style.display = "none";
  photoForm.style.display = "none";
  eventForm.reset();
  modal.classList.add("active");
}

function openPhotoModal() {
  if (!selectedEvent) {
    notify("Önce bir etkinlik seçin", "#D66565");
    return;
  }
  const modal = document.getElementById("modal-overlay");
  const titleEl = document.getElementById("modal-title");
  const eventForm = document.getElementById("event-form");
  const reviewForm = document.getElementById("review-form");
  const photoForm = document.getElementById("photo-form");

  if (!modal || !titleEl || !eventForm || !reviewForm || !photoForm) return;

  titleEl.textContent = "Fotoğraf Ekle";
  eventForm.style.display = "none";
  reviewForm.style.display = "none";
  photoForm.style.display = "block";
  photoForm.reset();

  const preview = document.getElementById("photo-preview");
  if (preview) preview.style.display = "none";

  modal.classList.add("active");
}

function closeModalCompletely() {
  const modal = document.getElementById("modal-overlay");
  if (!modal) return;
  modal.classList.remove("active");

  const eventForm = document.getElementById("event-form");
  const reviewForm = document.getElementById("review-form");
  const photoForm = document.getElementById("photo-form");

  if (eventForm) eventForm.reset();
  if (reviewForm) reviewForm.reset();
  if (photoForm) photoForm.reset();

  const preview = document.getElementById("photo-preview");
  if (preview) preview.style.display = "none";
}

// ------- DOM EVENTLERİ -------

document.addEventListener("DOMContentLoaded", () => {
  // Navbar
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const view = link.dataset.view;
      switchView(view);
    });
  });

  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      selectedEvent = null;
      switchView("home");
    });
  }

  const addEventBtn = document.getElementById("add-event-btn");
  if (addEventBtn) {
    addEventBtn.addEventListener("click", () => {
      openEventModal();
    });
  }

  const closeModalBtn = document.getElementById("close-modal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      closeModalCompletely();
    });
  }

  const modalOverlay = document.getElementById("modal-overlay");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", e => {
      if (e.target === modalOverlay) {
        closeModalCompletely();
      }
    });
  }

  const lightboxOverlay = document.getElementById("lightbox-overlay");
  const lightboxClose = document.getElementById("lightbox-close");
  if (lightboxClose) {
    lightboxClose.addEventListener("click", () => {
      if (lightboxOverlay) lightboxOverlay.classList.remove("active");
    });
  }
  if (lightboxOverlay) {
    lightboxOverlay.addEventListener("click", e => {
      if (e.target === lightboxOverlay) {
        lightboxOverlay.classList.remove("active");
      }
    });
  }

  const addPhotoBtn = document.getElementById("add-photo-btn");
  if (addPhotoBtn) {
    addPhotoBtn.addEventListener("click", () => {
      openPhotoModal();
    });
  }

  // Etkinlik formu submit
  const eventForm = document.getElementById("event-form");
  if (eventForm) {
    eventForm.addEventListener("submit", async e => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-btn");
      const submitText = document.getElementById("submit-text");

      if (submitBtn && submitText) {
        submitBtn.disabled = true;
        submitText.innerHTML = '<span class="loading-spinner"></span>';
      }

      const categoryInput = document.getElementById("category");
      const titleInput = document.getElementById("title");
      const dateInput = document.getElementById("date");
      const venueInput = document.getElementById("venue");
      const summaryInput = document.getElementById("summary");

      const category = categoryInput.value || "Tiyatro";

      const eventData = {
        title: titleInput.value,
        category,
        date: dateInput.value || "",
        venue: venueInput.value || "",
        summary: summaryInput.value || ""
      };

      try {
        await createEventOnServer(eventData);
        closeModalCompletely();
        await fetchEvents();
        notify("Etkinlik kaydedildi");
      } catch (err) {
        console.error(err);
        notify("Etkinlik kaydedilemedi", "#D66565");
      } finally {
        if (submitBtn && submitText) {
          submitBtn.disabled = false;
          submitText.textContent = "Etkinliği Kaydet";
        }
      }
    });
  }

  // Yorum formu submit
  const reviewForm = document.getElementById("review-form");
  if (reviewForm) {
    reviewForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (!selectedEvent) return;

      const reviewSubmitBtn = document.getElementById("review-submit-btn");
      const reviewSubmitText = document.getElementById("review-submit-text");

      if (reviewSubmitBtn && reviewSubmitText) {
        reviewSubmitBtn.disabled = true;
        reviewSubmitText.innerHTML = '<span class="loading-spinner"></span>';
      }

      const author = document.getElementById("review-author").value;
      const text = document.getElementById("review-text").value;
      const mood = document.getElementById("review-mood").value || "";
      const ratingVal = document.getElementById("review-rating").value;
      const rating = ratingVal ? parseInt(ratingVal, 10) : 0;
      const highlight =
        document.getElementById("review-highlight").value || "";

      const updated = { ...selectedEvent };
      updated[`${author}Review`] = text;
      updated[`${author}Mood`] = mood;
      updated[`${author}Rating`] = rating;
      updated[`${author}Highlight`] = highlight;

      try {
        await updateEventOnServer(updated);
        closeModalCompletely();
        await fetchEvents();
        notify("Yorum kaydedildi");
      } catch (err) {
        console.error(err);
        notify("Yorum kaydedilemedi", "#D66565");
      } finally {
        if (reviewSubmitBtn && reviewSubmitText) {
          reviewSubmitBtn.disabled = false;
          reviewSubmitText.textContent = "Yorumu Kaydet";
        }
      }
    });
  }

  // Foto formu
  const photoFileInput = document.getElementById("photo-file");
  const photoUrlInput = document.getElementById("photo-url");
  const photoPreview = document.getElementById("photo-preview");
  const photoPreviewImg = document.getElementById("photo-preview-img");

  if (photoFileInput) {
    photoFileInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file || !photoPreview || !photoPreviewImg) return;
      const reader = new FileReader();
      reader.onload = ev => {
        photoPreviewImg.src = ev.target.result;
        photoPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
  }

  if (photoUrlInput) {
    photoUrlInput.addEventListener("input", e => {
      const url = e.target.value.trim();
      if (!photoPreview || !photoPreviewImg) return;
      if (url) {
        photoPreviewImg.src = url;
        photoPreview.style.display = "block";
      } else {
        photoPreview.style.display = "none";
      }
    });
  }

  const photoForm = document.getElementById("photo-form");
  if (photoForm) {
    photoForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (!selectedEvent) return;

      const photoSubmitBtn = document.getElementById("photo-submit-btn");
      const photoSubmitText = document.getElementById("photo-submit-text");

      if (photoSubmitBtn && photoSubmitText) {
        photoSubmitBtn.disabled = true;
        photoSubmitText.innerHTML = '<span class="loading-spinner"></span>';
      }

      const file = photoFileInput ? photoFileInput.files[0] : null;
      const url = photoUrlInput ? photoUrlInput.value.trim() : "";

      if (!file && !url) {
        notify("Lütfen fotoğraf seçin veya URL girin", "#D66565");
        if (photoSubmitBtn && photoSubmitText) {
          photoSubmitBtn.disabled = false;
          photoSubmitText.textContent = "Fotoğrafı Ekle";
        }
        return;
      }

      try {
        let photoDataUrl = url;

        if (file) {
          photoDataUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target.result);
            reader.readAsDataURL(file);
          });
        }

        const photos = selectedEvent.photos
          ? selectedEvent.photos.split("|||").filter(p => p.trim())
          : [];
        photos.push(photoDataUrl);

        const updated = {
          ...selectedEvent,
          photos: photos.join("|||")
        };

        await updateEventOnServer(updated);
        closeModalCompletely();
        await fetchEvents();
        notify("Fotoğraf eklendi");
      } catch (err) {
        console.error(err);
        notify("Fotoğraf eklenemedi", "#D66565");
      } finally {
        if (photoSubmitBtn && photoSubmitText) {
          photoSubmitBtn.disabled = false;
          photoSubmitText.textContent = "Fotoğrafı Ekle";
        }
      }
    });
  }

  // Etkinlik silme
  const deleteBtn = document.getElementById("delete-event-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!selectedEvent) return;

      if (!deleteBtn.dataset.confirmDelete) {
        deleteBtn.dataset.confirmDelete = "true";
        deleteBtn.innerHTML =
          "<span>✓</span><span>Emin misiniz? Tekrar tıklayın</span>";
        deleteBtn.style.background = "#D66565";
        deleteBtn.style.color = "#FFFFFF";
        deleteBtn.style.borderColor = "#D66565";
        setTimeout(() => {
          delete deleteBtn.dataset.confirmDelete;
          deleteBtn.innerHTML = '<span>🗑️</span><span>Etkinliği Sil</span>';
          deleteBtn.style.background = "transparent";
          deleteBtn.style.color = "#D66565";
          deleteBtn.style.borderColor = "#D66565";
        }, 3000);
        return;
      }

      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<span class="loading-spinner"></span>';

      try {
        await deleteEventOnServer(selectedEvent.id);
        selectedEvent = null;
        switchView("home");
        await fetchEvents();
        notify("Etkinlik silindi");
      } catch (err) {
        console.error(err);
        notify("Etkinlik silinemedi", "#D66565");
      } finally {
        deleteBtn.disabled = false;
        delete deleteBtn.dataset.confirmDelete;
        deleteBtn.innerHTML = '<span>🗑️</span><span>Etkinliği Sil</span>';
        deleteBtn.style.background = "transparent";
        deleteBtn.style.color = "#D66565";
        deleteBtn.style.borderColor = "#D66565";
      }
    });
  }

  // İlk yüklemede eventleri çek
  fetchEvents();
});
