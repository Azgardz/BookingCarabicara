// ======================================================
// === GLOBAL CONSTANTS & VARIABLES (Tambahan) ===
// ======================================================
// Pastikan kedua API ini mengarah ke URL Google App Script Anda
const BOOKINGS_API_READ =
  "https://script.google.com/macros/s/AKfycbx8RGBuLM77IHIA4EBnSjzg3HtJJILC3IWzqRlywmrMVAO0VA67q-4nNUxpAyiLK94d/exec";
const BOOKINGS_API_WRITE =
  "https://script.google.com/macros/s/AKfycbx8RGBuLM77IHIA4EBnSjzg3HtJJILC3IWzqRlywmrMVAO0VA67q-4nNUxpAyiLK94d/exec";

let selectedDateGlobal = null;
let selectedTimeGlobal = null;
let selectedClassId = "kelasA"; // Default kelas aktif

let bookings = {};
const allSlots = ["09:00", "13:00", "16:00"];

// ======================================================
// === 1. TAB NAVIGASI & RESPONSIF IFRAME BOOKING ===
// ======================================================
document.addEventListener("DOMContentLoaded", function () {
  // --- Fungsi: Menyesuaikan tinggi iframe agar responsif ---
  function adjustIframeHeight() {
    const iframes = document.querySelectorAll(".booking-iframe");
    const screenWidth = window.innerWidth;
    let newHeight;

    if (screenWidth > 1000) {
      newHeight = "800px";
    } else if (screenWidth > 600) {
      newHeight = "700px";
    } else {
      newHeight = "1000px";
    }

    iframes.forEach((iframe) => {
      iframe.style.height = newHeight;
    });
  }

  adjustIframeHeight();
  window.addEventListener("resize", adjustIframeHeight);

  // --- Fungsi: Ganti konten tab booking kelas ---
  window.showClass = function (classId, buttonElement) {
    // MENYIMPAN ID KELAS YANG AKTIF
    selectedClassId = classId;

    const contents = document.querySelectorAll(".class-content");
    contents.forEach((content) => (content.style.display = "none"));

    document.getElementById(classId).style.display = "block";

    // Update tombol aktif
    const buttons = document.querySelectorAll(".tab-button");
    buttons.forEach((btn) => btn.classList.remove("active"));
    buttonElement.classList.add("active");

    adjustIframeHeight();

    // Opsional: Muat ulang data booking jika kelas yang dipilih mempengaruhi ketersediaan
    // window.loadBookings();
  };

  // --- Set tab default saat halaman dimuat ---
  const defaultButton = document.querySelector(".tab-button");
  if (defaultButton) {
    defaultButton.classList.add("active");
    document.getElementById("kelasA").style.display = "block";
  }

  console.log("Script Carabicara (Tab & Responsif) berhasil dimuat.");
});

// ------------------------------------------------------------------

// ======================================================
// === 2. FITUR BOOKING INTERAKTIF (KALENDER & SLOT) ===
// ======================================================
document.addEventListener("DOMContentLoaded", function () {
  const calendar = document.getElementById("calendar");
  const slotsDiv = document.getElementById("slots");
  const selectedDateText = document.getElementById("selected-date");
  const timeSlotsDiv = document.getElementById("time-slots");
  const backBtn = document.getElementById("back");

  if (!calendar) return;

  const today = new Date();
  // Atur jam ke 00:00:00 untuk perbandingan tanggal yang akurat
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();

  // Fungsi READ data booking dari Sheet
  window.loadBookings = async function () {
    try {
      const res = await fetch(BOOKINGS_API_READ);
      // Asumsi App Script mengembalikan array of booking objects
      const data = await res.json();

      // Mengubah array booking menjadi objek bookings per tanggal
      bookings = data.reduce((acc, booking) => {
        const dateKey = booking.tanggal;
        const timeSlot = booking.jam;

        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        if (!acc[dateKey].includes(timeSlot)) {
          acc[dateKey].push(timeSlot);
        }
        return acc;
      }, {});

      generateCalendar();
    } catch (err) {
      console.error("Gagal ambil data booking:", err);
      generateCalendar();
    }
  };

  // --- Fungsi: Generate kalender (DITINGKATKAN) ---
  function generateCalendar() {
    // Tambahkan Header Hari (Sun, Mon, Tue, dll.)
    const dayHeaders = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const headerHtml = dayHeaders
      .map((day) => `<div class="day-header">${day}</div>`)
      .join("");
    calendar.innerHTML = headerHtml; // Menggantikan innerHTML agar header muncul

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Isi dengan slot kosong untuk posisi hari pertama
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      calendar.appendChild(empty);
    }

    // Buat elemen tanggal
    for (let d = 1; d <= lastDate; d++) {
      const date = document.createElement("div");
      const currentDayCheck = new Date(year, month, d); // Tanggal di kalender

      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;

      date.textContent = d;
      date.classList.add("day");

      // KOREKSI: Cek jika tanggal sudah lewat
      if (currentDayCheck < today) {
        date.classList.add("past");
        calendar.appendChild(date);
        continue; // Lanjut ke tanggal berikutnya, tidak perlu event listener
      }

      if (bookings[dateStr]?.length === allSlots.length) {
        date.classList.add("booked");
      } else {
        date.classList.add("available");
        date.addEventListener("click", () => openSlots(dateStr));
      }

      calendar.appendChild(date);
    }
  }

  // --- Fungsi: Buka daftar jam pada tanggal terpilih ---
  function openSlots(dateStr) {
    calendar.classList.add("hidden");
    slotsDiv.classList.remove("hidden");

    // Format tanggal yang lebih mudah dibaca
    const [y, m, d] = dateStr.split("-");
    selectedDateText.textContent = `Pilih Jam untuk ${d}-${m}-${y}`;

    timeSlotsDiv.innerHTML = "";

    allSlots.forEach((time) => {
      const slot = document.createElement("div");
      slot.classList.add("slot");

      const isBooked = bookings[dateStr] && bookings[dateStr].includes(time);

      if (isBooked) {
        slot.classList.add("booked");
        slot.textContent = `${time} (Penuh)`;
      } else {
        slot.textContent = time;
        // KOREKSI UTAMA: Panggil fungsi secara global (window.bookSlot)
        slot.addEventListener("click", () => window.bookSlot(dateStr, time));
      }

      timeSlotsDiv.appendChild(slot);
    });
  }

  // --- Tombol kembali ---
  backBtn.addEventListener("click", () => {
    slotsDiv.classList.add("hidden");
    document.getElementById("booking-form").classList.add("hidden"); // Sembunyikan form jika sedang ditampilkan
    document.getElementById("confirmation").classList.add("hidden"); // Sembunyikan konfirmasi
    calendar.classList.remove("hidden");
  });

  // Mulai memuat data dan generate kalender
  window.loadBookings();
});

// ------------------------------------------------------------------

// ======================================================
// === 3. FORM BOOKING + KIRIM DATA KE GOOGLE SHEETS ===
// ======================================================

// KOREKSI UTAMA: Definisikan fungsi secara global (window.)
window.bookSlot = function (dateStr, time) {
  selectedDateGlobal = dateStr;
  selectedTimeGlobal = time;

  // Reset form setiap kali dibuka
  document.getElementById("nama").value = "";
  document.getElementById("usia").value = "";
  document.getElementById("domisili").value = "";
  document.getElementById("email").value = "";
  document.getElementById("catatan").value = "";

  document.getElementById("slots").classList.add("hidden");
  document.getElementById("booking-form").classList.remove("hidden");
};

// --- Fungsi: Kirim data booking ke Google Sheets ---
document.addEventListener("DOMContentLoaded", function () {
  const submitBtn = document.getElementById("submitBooking");
  const confirmation = document.getElementById("confirmation");
  const bookingFormDiv = document.getElementById("booking-form");

  if (!submitBtn) return;

  submitBtn.addEventListener("click", async () => {
    const nama = document.getElementById("nama").value.trim();
    const usia = document.getElementById("usia").value.trim();
    const domisili = document.getElementById("domisili").value.trim();
    const email = document.getElementById("email").value.trim();
    const catatan = document.getElementById("catatan").value.trim();

    if (!nama || !email) {
      alert("Nama dan email wajib diisi!");
      return;
    }

    submitBtn.disabled = true; // Nonaktifkan tombol saat proses
    submitBtn.textContent = "Memproses...";

    const payload = {
      kelas: selectedClassId, // Mengirim kelas yang aktif
      tanggal: selectedDateGlobal,
      jam: selectedTimeGlobal,
      nama,
      usia,
      domisili,
      email,
      catatan,
    };

    try {
      const res = await fetch(BOOKINGS_API_WRITE, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();

      if (result.status === "success") {
        bookingFormDiv.classList.add("hidden");
        confirmation.classList.remove("hidden");
        confirmation.innerHTML = `
                    <p>✅ Terima kasih, <b>${nama}</b>! Booking Anda untuk 
                    <b>${payload.kelas}</b> tanggal <b>${payload.tanggal}</b> pukul 
                    <b>${payload.jam}</b> berhasil dikirim 🎉</p>`;

        window.loadBookings(); // Refresh kalender
      } else {
        throw new Error(result.message || "Response tidak valid dari server");
      }
    } catch (err) {
      console.warn("Gagal kirim data booking, mode simulasi aktif.", err);

      // MODE SIMULASI (Tampilkan pesan sukses simulasi)
      bookingFormDiv.classList.add("hidden");
      confirmation.classList.remove("hidden");
      confirmation.innerHTML = `
                <p>Terima kasih, <b>${nama}</b>! 🎉<br>
                (Simulasi) Booking Anda untuk <b>${payload.kelas}</b> tanggal 
                <b>${payload.tanggal}</b> pukul <b>${payload.jam}</b> telah diterima.</p>`;

      window.loadBookings(); // Refresh kalender
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Kirim Booking";
    }
  });
});
