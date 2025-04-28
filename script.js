// Firebase modüllerini içe aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyDmnOLgZuBhZrrTHrVbdvXmK0oBSlOam9A",
  authDomain: "chain-baed8.firebaseapp.com",
  projectId: "chain-baed8",
  storageBucket: "chain-baed8.firebasestorage.app",
  messagingSenderId: "1086759241641",
  appId: "1:1086759241641:web:e15923e4cc119a052166b8",
  measurementId: "G-QTG8LDV9E3"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Global değişkenler
let players = {}; // Tüm oyuncuların verileri (Firebase'den alınır)
let blockedPlayers = []; // Engellenen oyuncuların listesi (Firebase'den alınır)
let currentPlayer = null; // Şu an giriş yapmış oyuncu
let qrCodes = ["qr1", "qr2", "qr3", "qr4", "qr5"]; // Geçerli QR kodları
let adminPassword = "cankaya"; // Yönetici şifresi
let isAdmin = false; // Yönetici modu aktif mi?

// Argo kelime filtresi
const badWords = ['bok', 'siktir', 'am', 'orospu', 'piç', 'sik', 'yarrak', 'kaltak'];

// Gerçek zamanlı veri dinleyicileri (Firebase'den veri değişikliklerini dinler)
function setupRealtimeListeners() {
  try {
    const playersRef = ref(db, 'players');
    onValue(playersRef, (snapshot) => {
      players = snapshot.val() || {};
      updateLeaderboard();
    }, (error) => {
      console.error('Oyuncu verileri alınamadı:', error);
      alert('Veri alınamadı. Lütfen tekrar deneyin.');
    });

    const blockedPlayersRef = ref(db, 'blockedPlayers');
    onValue(blockedPlayersRef, (snapshot) => {
      blockedPlayers = snapshot.val() ? Object.values(snapshot.val()) : [];
      updateBlockedPlayers();
    }, (error) => {
      console.error('Engellenen oyuncular alınamadı:', error);
      alert('Engellenen oyuncular yüklenemedi.');
    });
  } catch (error) {
    console.error('Dinleyici kurulumu hatası:', error);
  }
}

// Kayıt formunu göster
function showRegisterForm() {
  try {
    document.getElementById('welcome-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
  } catch (error) {
    console.error('Kayıt formu gösterilemedi:', error);
  }
}

// Giriş formunu göster
function showLoginForm() {
  try {
    document.getElementById('welcome-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  } catch (error) {
    console.error('Giriş formu gösterilemedi:', error);
  }
}

// Geri Dön fonksiyonu (Kayıt/Giriş ekranından ana ekrana dön)
function goBackToWelcome() {
  try {
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('welcome-section').style.display = 'block';
  } catch (error) {
    console.error('Geri dönme hatası:', error);
  }
}

// Oyuncu kaydı
async function registerPlayer() {
  try {
    const username = document.getElementById('player-username').value.trim();
    const password = document.getElementById('player-password').value.trim();

    if (!username || !password) {
      alert('Lütfen kullanıcı adı ve şifre girin!');
      return;
    }

    const playerRef = ref(db, `players/${username}`);
    const snapshot = await get(playerRef);
    if (snapshot.exists()) {
      alert('Bu kullanıcı adı zaten alınmış. Başka bir tane seçin.');
      return;
    }

    const lowerUsername = username.toLowerCase();
    if (badWords.some(word => lowerUsername.includes(word))) {
      alert('Bu kullanıcı adı uygun olmayan kelimeler içeriyor. Lütfen farklı bir isim seçin.');
      return;
    }

    await set(playerRef, {
      password,
      scans: [], // scans boş bir dizi olarak tanımlı
      lastScan: null,
      lastTime: null
    });

    currentPlayer = username;
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('scan-section').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'block';
    document.querySelector('.map-img').style.display = 'block';
    alert(`Kayıt başarılı! Hoş geldin, ${username}!`);
  } catch (error) {
    console.error('Kayıt hatası:', error);
    alert('Kayıt sırasında bir hata oluştu: ' + error.message);
  }
}

// Oyuncu girişi
async function loginPlayer() {
  try {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const playerRef = ref(db, `players/${username}`);
    const snapshot = await get(playerRef);
    if (!snapshot.exists()) {
      alert('Kullanıcı adı bulunamadı. Lütfen önce kayıt olun.');
      return;
    }

    const playerData = snapshot.val();
    if (playerData.password !== password) {
      alert('Yanlış şifre. Lütfen tekrar deneyin.');
      return;
    }

    currentPlayer = username;
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('scan-section').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'block';
    document.querySelector('.map-img').style.display = 'block';
    alert(`Hoş geldin, ${username}!`);
  } catch (error) {
    console.error('Giriş hatası:', error);
    alert('Giriş sırasında bir hata oluştu: ' + error.message);
  }
}

// Yönetici girişi
function loginAdmin() {
    try {
      const password = prompt('Yönetici şifresini girin:');
      if (password === adminPassword) {
        isAdmin = true;
        alert('Yönetici olarak giriş yaptınız!');
        document.getElementById('blocked-players-section').style.display = 'block';
        updateBlockedPlayers();
        updateLeaderboard(); // Sıralama tablosunu güncelle
        const adminButton = document.getElementById('admin-button');
        adminButton.removeEventListener('click', loginAdmin);
        adminButton.addEventListener('click', logoutAdmin);
      } else {
        alert('Yanlış yönetici şifresi!');
      }
    } catch (error) {
      console.error('Yönetici giriş hatası:', error);
    }
  }
  
  // Yönetici modundan çık
  function logoutAdmin() {
    try {
      isAdmin = false;
      alert('Yönetici modundan çıktınız.');
      document.getElementById('blocked-players-section').style.display = 'none';
      updateBlockedPlayers();
      updateLeaderboard(); // Sıralama tablosunu güncelle
      const adminButton = document.getElementById('admin-button');
      adminButton.removeEventListener('click', logoutAdmin);
      adminButton.addEventListener('click', loginAdmin);
    } catch (error) {
      console.error('Yönetici çıkış hatası:', error);
    }
  }

// Oyuncuyu engelleme
async function deletePlayer(username) {
  try {
    if (!isAdmin) {
      alert('Bu işlemi yapmak için yönetici yetkisi gerekli!');
      return;
    }
    if (confirm(`${username} kullanıcısını engellemek istiyor musunuz?`)) {
      await remove(ref(db, `players/${username}`));
      const blockedRef = ref(db, `blockedPlayers/${username}`);
      await set(blockedRef, username);
      alert(`${username} engellendi!`);
    }
  } catch (error) {
    console.error('Engelleme hatası:', error);
    alert('Engelleme sırasında hata oluştu: ' + error.message);
  }
}

// Engeli kaldırma
async function unblockPlayer(username) {
  try {
    if (!isAdmin) {
      alert('Bu işlemi yapmak için yönetici yetkisi gerekli!');
      return;
    }
    if (confirm(`${username} kullanıcısının engelini kaldırmak istiyor musunuz?`)) {
      await remove(ref(db, `blockedPlayers/${username}`));
      alert(`${username} engeli kaldırıldı!`);
    }
  } catch (error) {
    console.error('Engel kaldırma hatası:', error);
    alert('Engel kaldırma sırasında hata oluştu: ' + error.message);
  }
}

// QR kod tarama
let video = document.getElementById('video');
let canvasElement = document.getElementById('canvas');
let canvas = canvasElement.getContext('2d');

function startScanner() {
  try {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        video.play().then(() => {
          canvasElement.style.display = 'block';
          video.style.display = 'none';
          requestAnimationFrame(tick);
        }).catch(err => {
          alert('Video başlatılamadı: ' + err);
        });
      })
      .catch(err => {
        alert('Kamera erişimi başarısız: ' + err);
      });
  } catch (error) {
    console.error('Kamera başlatma hatası:', error);
  }
}

function tick() {
  try {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvasElement.height = video.videoHeight;
      canvasElement.width = video.videoWidth;
      canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
      let imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
      let code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code && qrCodes.includes(code.data)) {
        processQR(code.data);
        stopScanner();
      }
    }
    requestAnimationFrame(tick);
  } catch (error) {
    console.error('QR tarama hatası:', error);
  }
}

function stopScanner() {
  try {
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }
    canvasElement.style.display = 'none';
    video.style.display = 'none';
  } catch (error) {
    console.error('Kamera durdurma hatası:', error);
  }
}

// Manuel QR kod girişi
function submitManualQR() {
  try {
    const qrCode = document.getElementById('manual-qr').value.trim();
    if (qrCodes.includes(qrCode)) {
      processQR(qrCode);
    } else {
      alert('Geçersiz QR kodu!');
    }
  } catch (error) {
    console.error('Manuel QR giriş hatası:', error);
  }
}

// QR kod işleme
async function processQR(qrCode) {
  try {
    if (!currentPlayer) {
      alert('Önce giriş yapın!');
      return;
    }
    if (blockedPlayers.includes(currentPlayer)) {
      alert('Hesabınız engellenmiş. Yöneticiyle iletişime geçin.');
      return;
    }

    const playerRef = ref(db, `players/${currentPlayer}`);
    const snapshot = await get(playerRef);
    const playerData = snapshot.val();

    // playerData kontrolü
    if (!playerData) {
      alert('Oyuncu verisi bulunamadı. Lütfen tekrar giriş yapın.');
      currentPlayer = null; // Kullanıcıyı çıkış yapmaya zorla
      goBackToWelcome();
      return;
    }

    // scans dizisinin varlığını kontrol et, yoksa boş bir dizi olarak başlat
    if (!Array.isArray(playerData.scans)) {
      await update(playerRef, { scans: [] });
      playerData.scans = [];
    }

    if (!playerData.scans.includes(qrCode)) {
      const updatedScans = [...playerData.scans, qrCode];
      await update(playerRef, {
        scans: updatedScans,
        lastScan: qrCode,
        lastTime: new Date().toLocaleString()
      });
      alert(`Tebrikler! ${qrCode} tarandı!`);
      document.getElementById('leaderboard').classList.add('scan-success');
      setTimeout(() => document.getElementById('leaderboard').classList.remove('scan-success'), 500);
    } else {
      alert('Bu QR kodu zaten tarandı!');
    }
  } catch (error) {
    console.error('QR işleme hatası:', error);
    alert('QR tarama sırasında hata oluştu: ' + error.message);
  }
}

// Sıralama tablosunu güncelle
function updateLeaderboard() {
    try {
      console.log('Sıralama tablosu güncelleniyor, isAdmin:', isAdmin); // Hata ayıklama için
      const leaderboardBody = document.getElementById('leaderboard-body');
      leaderboardBody.innerHTML = '';
      const sortedPlayers = Object.entries(players).sort((a, b) => {
        const scansA = Array.isArray(a[1].scans) ? a[1].scans.length : 0;
        const scansB = Array.isArray(b[1].scans) ? b[1].scans.length : 0;
        return scansB - scansA;
      });
      sortedPlayers.forEach(([username, data]) => {
        const row = document.createElement('tr');
        const deleteButton = isAdmin ? `<button class="delete-button" data-username="${username}">Engelle</button>` : '';
        row.innerHTML = `
          <td>${username}</td>
          <td>${Array.isArray(data.scans) ? data.scans.length : 0}</td>
          <td>${data.lastScan || '-'}</td>
          <td>${deleteButton}</td>
        `;
        leaderboardBody.appendChild(row);
      });
  
      // Dinamik olarak oluşturulan "Engelle" butonlarına olay dinleyicisi ekle
      document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
          const username = e.target.getAttribute('data-username');
          deletePlayer(username);
        });
      });
    } catch (error) {
      console.error('Sıralama tablosu güncelleme hatası:', error);
    }
  }

// Engellenen oyuncuları güncelle
function updateBlockedPlayers() {
  try {
    const blockedBody = document.getElementById('blocked-players-body');
    blockedBody.innerHTML = '';
    blockedPlayers.forEach(username => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${username}</td>
        <td><button class="unblock-button" data-username="${username}">Engeli Kaldır</button></td>
      `;
      blockedBody.appendChild(row);
    });

    // Dinamik olarak oluşturulan "Engeli Kaldır" butonlarına olay dinleyicisi ekle
    document.querySelectorAll('.unblock-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const username = e.target.getAttribute('data-username');
        unblockPlayer(username);
      });
    });
  } catch (error) {
    console.error('Engellenen oyuncular güncelleme hatası:', error);
  }
}

// Olay dinleyicilerini bağla
document.addEventListener('DOMContentLoaded', () => {
  setupRealtimeListeners();

  // Hoş Geldin Ekranı Butonları
  document.getElementById('register-welcome-button').addEventListener('click', showRegisterForm);
  document.getElementById('login-welcome-button').addEventListener('click', showLoginForm);

  // Kayıt Formu Butonları
  document.getElementById('register-submit-button').addEventListener('click', registerPlayer);
  document.getElementById('register-back-button').addEventListener('click', goBackToWelcome);

  // Giriş Formu Butonları
  document.getElementById('login-submit-button').addEventListener('click', loginPlayer);
  document.getElementById('login-back-button').addEventListener('click', goBackToWelcome);

  // Yönetici Butonu
  document.getElementById('admin-button').addEventListener('click', loginAdmin);

  // QR Kod Tarama Butonları
  document.getElementById('start-scanner-button').addEventListener('click', startScanner);
  document.getElementById('submit-manual-qr-button').addEventListener('click', submitManualQR);
});