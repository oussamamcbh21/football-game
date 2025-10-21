// Canvas
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');

// Player ID
const playerId='player_'+Date.now();
document.getElementById('coins').innerText=100;

// Firebase config
const firebaseConfig={
  apiKey:"API_KEY",
  authDomain:"PROJECT.firebaseapp.com",
  databaseURL:"https://PROJECT.firebaseio.com",
  projectId:"PROJECT",
  storageBucket:"PROJECT.appspot.com",
  messagingSenderId:"SENDER_ID",
  appId:"APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db=firebase.database();

// Menu buttons
document.getElementById('playOffline').onclick=startOfflineGame;
document.getElementById('playOnline').onclick=findOnlineMatch;
document.getElementById('playPrivate').onclick=()=>{createPrivateMatch(document.getElementById('friendId').value);};
document.getElementById('exitMatch').onclick=exitGame;
document.getElementById('resultBack').onclick=backToMenu;

function startOfflineGame(){
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('gameArea').classList.remove('hidden');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='white';
  ctx.font='28px Arial';
  ctx.fillText('⚽ المباراة بدأت! العب الآن...',40,80);
  // مؤقت 90 ثانية
  let time=90;
  const timer=setInterval(()=>{
    time--;document.getElementById('timer').innerText=time;
    if(time<=0){clearInterval(timer);endGame(Math.random()>0.5?'فوز':'خسارة');}
  },1000);
}

function endGame(result){
  document.getElementById('gameArea').classList.add('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('resultText').innerText='النتيجة: '+result;
}

function backToMenu(){
  document.getElementById('result').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
}

// Online match
function findOnlineMatch(){
  const matchRef=db.ref('matches').push();
  matchRef.set({player1:playerId,state:'waiting',score1:0,score2:0,timer:90});
  matchRef.on('value',snap=>{
    const data=snap.val();
    if(data.state==='inProgress') startOnlineGame(data,playerId);
  });
  alert('تم إنشاء غرفة انتظار، انتظر لاعب آخر...');
}

// Private match
function createPrivateMatch(friendId){
  if(!friendId){alert('ادخل معرف صديقك');return;}
  const matchRef=db.ref('matches').push();
  matchRef.set({player1:playerId,player2:friendId,state:'waiting',score1:0,score2:0,timer:90});
  matchRef.on('value',snap=>{
    const data=snap.val();
    if(data.state==='inProgress') startOnlineGame(data,playerId);
  });
  alert('تم إنشاء مباراة خاصة مع صديقك. شارك معرفك: '+playerId);
}

function startOnlineGame(matchData,playerId){
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('gameArea').classList.remove('hidden');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='white';
  ctx.font='28px Arial';
  ctx.fillText('⚽ مباراة أونلاين بدأت!',40,80);
}

function exitGame(){
  document.getElementById('gameArea').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
}
