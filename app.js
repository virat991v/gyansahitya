/* =========================
   GLOBAL STATE
========================= */

let currentUser = null;

/* =========================
   UTILS
========================= */

function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  setTimeout(() => notification.classList.remove("show"), 3000);
}

function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: "smooth" });
}

/* =========================
   AUTH MODAL
========================= */

function showAuthModal(type) {
  document.getElementById("authModal").classList.add("active");
  document.getElementById("loginForm").classList.toggle("hidden", type !== "login");
  document.getElementById("signupForm").classList.toggle("hidden", type !== "signup");
}

function closeAuthModal() {
  document.getElementById("authModal").classList.remove("active");
}

/* =========================
   AUTH (SUPABASE)
========================= */

async function signup(e) {
  e.preventDefault();

  const email = signupEmail.value;
  const password = signupPassword.value;
  const username = signupUsername.value;
  const bio = signupBio.value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { username, bio }
    }
  });

  if (error) {
    showNotification(error.message, "error");
    return;
  }

  showNotification("Signup successful! Please login.");
  closeAuthModal();
}

async function login(e) {
  e.preventDefault();

  const email = loginEmail.value;
  const password = loginPassword.value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showNotification(error.message, "error");
    return;
  }

  currentUser = data.user;
  updateAuthUI();
  closeAuthModal();
  showNotification("Logged in successfully");
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI();
  showNotification("Logged out");
}

/* =========================
   AUTH STATE
========================= */

async function loadSession() {
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  updateAuthUI();
}

function updateAuthUI() {
  const authButtons = document.getElementById("authButtons");
  const userDisplay = document.getElementById("userDisplay");
  const postItemAuth = document.getElementById("postItemAuth");
  const postItemForm = document.getElementById("postItemForm");

  if (currentUser) {
    authButtons.classList.add("hidden");
    userDisplay.classList.remove("hidden");
    userName.textContent = currentUser.user_metadata.username || currentUser.email;
    postItemAuth.classList.add("hidden");
    postItemForm.classList.remove("hidden");
    loadItems();
  } else {
    authButtons.classList.remove("hidden");
    userDisplay.classList.add("hidden");
    postItemAuth.classList.remove("hidden");
    postItemForm.classList.add("hidden");
    document.getElementById("itemsGrid").innerHTML = "";

  }
}

/* =========================
   ITEMS (SUPABASE DB)
========================= */

async function loadItems() {
  const { data, error } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showNotification("Failed to load items", "error");
    return;
  }

  renderItems(data);
}

function renderItems(items) {
  const grid = document.getElementById("itemsGrid");
  grid.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card p-4 fade-in";

    card.innerHTML = `
      ${item.image_url ? `
        <img 
          src="${item.image_url}" 
          alt="Item image"
          class="w-full h-40 object-cover rounded mb-3"
        >
      ` : ""}

      <h3 class="text-lg font-bold mb-1">${item.title}</h3>
      <p class="text-sm text-gray-600 mb-2">${item.description || ""}</p>

      <div class="flex gap-2 mb-2">
        <span class="badge badge-primary">${item.category}</span>
        <span class="badge badge-warning">${item.transaction_type}</span>
      </div>

      ${item.price ? `<p class="mt-2 font-semibold">₹${item.price}</p>` : ""}
    `;

    grid.appendChild(card);
  });
}



/* =========================
   POST ITEM
========================= */

postItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const imageFile = itemImage.files[0];
  let imageUrl = null;

  // 🔥 UPLOAD IMAGE TO SUPABASE STORAGE
  if (imageFile) {
    imageUrl = await uploadImage(imageFile);
    if (!imageUrl) return;
  }

  const item = {
    title: itemTitle.value,
    category: itemCategory.value,
    transaction_type: itemTransactionType.value,
    subject: itemSubject.value,
    course: itemCourse.value,
    price: itemTransactionType.value === "sell" ? Number(itemPrice.value) : null,
    description: itemDescription.value,
    image_url: imageUrl,   // 🔥 SAVE IMAGE URL
    user_id: currentUser.id
  };

  const { error } = await supabaseClient
    .from("items")
    .insert([item]);

  if (error) {
    showNotification(error.message, "error");
    return;
  }

  postItemForm.reset();
  imagePreview.style.display = "none";
  showNotification("Item posted successfully");
  loadItems();
});

/* =========================
   UI HELPERS
========================= */

function togglePriceField() {
  priceField.style.display =
    itemTransactionType.value === "donate" ? "none" : "block";
}

function previewImage() {
  const file = itemImage.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    previewImg.src = reader.result;
    imagePreview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

/* =========================
   INIT
========================= */

loadSession();
async function uploadImage(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;

  const { error } = await supabaseClient.storage
    .from('item-images')
    .upload(fileName, file);

  if (error) {
    alert("Image upload failed");
    console.error(error);
    return null;
  }

  const { data } = supabaseClient.storage
    .from('item-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}
