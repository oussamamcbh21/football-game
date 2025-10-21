// توليد معرف فريد لكل لاعب
const playerId = 'player_' + Date.now();
document.getElementById('coins').innerText = 100; // رصيد ابتدائي

// Firebase config
const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "PROJECT.firebaseapp.com",
  databaseURL: "https://PROJECT.firebaseio.com",
  projectId: "PROJECT",
  storageBucket: "PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// اللعب أونلاين عادي
document.getElementById('playOnline').addEventListener('click', () => {
  findOnlineMatch();
});

// اللعب مع صديق
document.getElementById('playPrivate').addEventListener('click', () => {
  const friendId = document.getElementById('friendId').value.trim();
  if(friendId) createPrivateMatch(friendId);
});

// إنشاء مباراة عامة
function findOnlineMatch(){
  const matchRef = db.ref('matches').push();
  matchRef.set({
    player1: playerId,
    state: 'waiting',
    score1: 0,
    score2: 0,
    timer: 90
  });
  matchRef.on('value', snapshot => {
    const data = snapshot.val();
    if(data.state === 'inProgress') startOnlineGame(data, playerId);
  });
  alert('تم إنشاء غرفة انتظار، انتظر لاعب آخر...');
}

// إنشاء مباراة خاصة
function createPrivateMatch(friendId){
  const matchRef = db.ref('matches').push();
  matchRef.set({
    player1: playerId,
    player2: friendId,
    state: 'waiting',
    score1: 0,
    score2: 0,
    timer: 90
  });
  matchRef.on('value', snapshot => {
    const data = snapshot.val();
    if(data.state === 'inProgress') startOnlineGame(data, playerId);
  });
  alert('تم إنشاء مباراة خاصة مع صديقك. شارك معرفك: ' + playerId);
}

// بدء اللعبة أونلاين
function startOnlineGame(matchData, playerId){
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('gameArea').classList.remove('hidden');
  // هنا يمكن استخدام matchData.score1 و score2 للتحديث المستمر
}

// اللعب أوفلاين
document.getElementById('playOffline').addEventListener('click', startOfflineGame);

function startOfflineGame(){
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('gameArea').classList.remove('hidden');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='white';
  ctx.font='28px Arial';
  ctx.fillText('⚽ المباراة بدأت! العب الآن...', 40,80);
  // مؤقت 90 ثانية
}
