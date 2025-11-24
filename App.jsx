
/*
CoupleGames - Single-file React app (App.jsx)

Instructions:
1. Create a Firebase project and Realtime Database (or leave offline to use single-player games).
2. Replace FIREBASE_CONFIG below with your Firebase web config to enable online Tic-Tac-Toe.
3. To run locally:
   npx create-react-app couple-games
   cd couple-games
   npm install firebase
   Replace src/App.js with this file content (or save as src/App.jsx) and run npm start
*/

import React, { useEffect, useRef, useState } from 'react';
import './index.css';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, onValue, remove } from 'firebase/database';

// --------- Put your Firebase web config here (create a Firebase project -> Realtime Database) ----------
const FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  databaseURL: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
// --------------------------------------------------------------------------------

let firebaseApp;
let db;
try {
  firebaseApp = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(firebaseApp);
} catch (e) {
  console.warn('Firebase not initialized. Fill FIREBASE_CONFIG to enable online tic-tac-toe.');
}

export default function App(){
  const [screen, setScreen] = useState('lobby');
  const [name, setName] = useState(localStorage.getItem('cg_name') || 'Player');
  const [roomId, setRoomId] = useState('');
  const [partner, setPartner] = useState('');

  useEffect(()=>{ localStorage.setItem('cg_name', name); },[name]);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1>CoupleGames</h1>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input value={name} onChange={e=>setName(e.target.value)} style={styles.input} />
          <button onClick={()=>{ setScreen('lobby'); setRoomId(''); }} style={styles.smallBtn}>Home</button>
        </div>
      </header>

      <main style={styles.main}>
        {screen==='lobby' && (
          <Lobby onChoose={(g)=>setScreen(g)} setRoomId={setRoomId} setPartner={setPartner} />
        )}
        {screen==='tictactoe' && (
          <TicTacToe name={name} roomId={roomId} setRoomId={setRoomId} setScreen={setScreen} partner={partner} setPartner={setPartner} db={db} />
        )}
        {screen==='snake' && (
          <Snake />
        )}
        {screen==='car' && (
          <CarRacing />
        )}
      </main>

      <footer style={styles.footer}>Made with ❤️ for long distance couples. Ask me to add more games (Ludo, Carrom, Cards).</footer>
    </div>
  );
}

function Lobby({onChoose, setRoomId, setPartner}){
  const [joinId, setJoinId] = useState('');

  return (
    <div style={styles.card}>
      <h2>Choose a game</h2>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button style={styles.btn} onClick={()=>onChoose('tictactoe')}>Tic-Tac-Toe (Online)</button>
        <button style={styles.btn} onClick={()=>onChoose('snake')}>Snake (Single-player)</button>
        <button style={styles.btn} onClick={()=>onChoose('car')}>Car Racing (Single-player)</button>
      </div>

      <hr style={{width:'100%',margin:'16px 0'}} />
      <div>
        <p>To play Tic-Tac-Toe online: create a room and share the Room ID with your partner.</p>
        <div style={{display:'flex',gap:8}}>
          <button style={styles.smallBtn} onClick={async ()=>{
            if(!db){ alert('Firebase not configured. Fill FIREBASE_CONFIG in App.jsx.'); return; }
            const roomsRef = ref(db, 'ttt_rooms');
            const newRoomRef = push(roomsRef);
            const id = newRoomRef.key;
            await set(newRoomRef, { board: Array(9).fill(null), turn: 'X', players: [], status: 'waiting' });
            setRoomId(id);
            setPartner('');
            onChoose('tictactoe');
            alert('Room created. Share Room ID: ' + id);
          }}>Create Room</button>

          <input placeholder='Room ID to join' value={joinId} onChange={e=>setJoinId(e.target.value)} style={styles.input} />
          <button style={styles.smallBtn} onClick={()=>{
            if(!joinId){ alert('Enter room id'); return; }
            setRoomId(joinId);
            setPartner('');
            onChoose('tictactoe');
          }}>Join Room</button>
        </div>
      </div>
    </div>
  );
}

// --------------------- Tic Tac Toe (online via Firebase) ---------------------
function TicTacToe({name, roomId, setRoomId, setScreen, partner, setPartner, db}){
  const [status, setStatus] = useState('');
  const [roomData, setRoomData] = useState(null);
  const mySymbolRef = useRef(null);

  useEffect(()=>{
    if(!db){ setStatus('Firebase not configured. Tic-Tac-Toe offline unavailable.'); return; }
    if(!roomId){ setStatus('No room selected. Go to lobby.'); return; }
    const roomRef = ref(db, `ttt_rooms/${roomId}`);
    const unsub = onValue(roomRef, snapshot => {
      const val = snapshot.val();
      if(!val){ setStatus('Room not found or closed.'); setRoomData(null); return; }
      setRoomData(val);
      if(val.players && val.players.length===2){ setStatus('Two players present.'); setPartner(val.players.find(p=>p.name!==name)?.name || ''); }
      else setStatus('Waiting for another player to join.');
    });
    return ()=>unsub();
  },[db, roomId, name, setPartner]);

  async function joinRoom(){
    if(!db) return;
    const roomRef = ref(db, `ttt_rooms/${roomId}`);
    onValue(roomRef, async snap=>{
      const val = snap.val();
      if(!val) { alert('Room missing'); return; }
      const players = val.players||[];
      if(players.find(p=>p.name===name)) return;
      if(players.length>=2){ alert('Room full'); return; }
      const sym = players.length===0? 'X' : 'O';
      players.push({ name, sym });
      await set(roomRef, { ...val, players });
      mySymbolRef.current = sym;
    }, { onlyOnce: true });
  }

  async function makeMove(i){
    if(!db || !roomData) return;
    const players = roomData.players || [];
    const me = players.find(p=>p.name===name);
    if(!me){ alert('You must join the room first. Click Join.'); return; }
    const sym = me.sym;
    if(roomData.turn !== sym) return;
    if(roomData.board[i]) return;
    const newBoard = [...roomData.board];
    newBoard[i] = sym;
    const nextTurn = sym==='X'?'O':'X';
    const roomRef = ref(db, `ttt_rooms/${roomId}`);
    const w = checkWinner(newBoard);
    const newStatus = w ? (w==='draw'? 'finished' : 'finished') : 'playing';
    await set(roomRef, { ...roomData, board: newBoard, turn: nextTurn, status: newStatus });
  }

  async function leaveRoom(){
    if(!db) { setScreen('lobby'); return; }
    const roomRef = ref(db, `ttt_rooms/${roomId}`);
    onValue(roomRef, async snap=>{
      const val = snap.val();
      if(!val) { setScreen('lobby'); return; }
      const players = (val.players||[]).filter(p=>p.name!==name);
      if(players.length===0) await remove(roomRef);
      else await set(roomRef, { ...val, players });
      setRoomId('');
      setScreen('lobby');
    }, { onlyOnce: true });
  }

  if(!roomId) return (
    <div style={styles.card}><p>No room selected. Go back to lobby.</p><button onClick={()=>setScreen('lobby')} style={styles.btn}>Lobby</button></div>
  );

  return (
    <div style={styles.card}>
      <h2>Tic-Tac-Toe</h2>
      <div style={{marginBottom:8}}>Room ID: <strong>{roomId}</strong></div>
      <div style={{marginBottom:8}}>{status}</div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <button onClick={joinRoom} style={styles.smallBtn}>Join Room</button>
        <button onClick={leaveRoom} style={styles.smallBtn}>Leave Room</button>
      </div>

      <div style={{marginTop:12}}>
        <Board board={roomData?roomData.board:Array(9).fill(null)} onCellClick={i=>makeMove(i)} />
        <div style={{marginTop:8}}>
          <strong>Players:</strong>
          <ul>
            {(roomData?.players||[]).map((p,idx)=>(<li key={idx}>{p.name} — {p.sym}</li>))}
          </ul>
        </div>
      </div>

      <div style={{marginTop:8}}>
        <em>Note: This is a simple demo. Sometimes state sync may be delayed by the Realtime DB rules. Refresh to resync.</em>
      </div>
    </div>
  );
}

function Board({board, onCellClick}){
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,100px)',gap:6}}>
      {board.map((c,i)=> (
        <div key={i} onClick={()=>onCellClick(i)} style={styles.cell}>{c || ''}</div>
      ))}
    </div>
  );
}

function checkWinner(b){
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(const [a,b1,c] of lines){
    if(b[a] && b[a]===b[b1] && b[a]===b[c]) return b[a];
  }
  if(b.every(x=>x)) return 'draw';
  return null;
}

// --------------------- Snake (single-player) ---------------------
function Snake(){
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);

  useEffect(()=>{
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 20;
    let width = canvas.width = 300;
    let height = canvas.height = 300;

    let snake = [{x:6,y:6}];
    let dir = {x:1,y:0};
    let food = randomFood();
    let tick = 200;
    let id;

    function randomFood(){
      return { x: Math.floor(Math.random()*(width/size)), y: Math.floor(Math.random()*(height/size)) };
    }

    function loop(){
      if(!running) return;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      head.x = (head.x + width/size) % (width/size);
      head.y = (head.y + height/size) % (height/size);
      if(snake.some(s=>s.x===head.x && s.y===head.y)){
        setRunning(false);
        return;
      }
      snake.unshift(head);
      if(head.x===food.x && head.y===food.y){
        setScore(s=>s+1);
        food = randomFood();
      } else{
        snake.pop();
      }

      ctx.fillStyle='white';
      ctx.fillRect(0,0,width,height);
      ctx.fillStyle='black';
      for(const s of snake) ctx.fillRect(s.x*size, s.y*size, size-2, size-2);
      ctx.fillStyle='red';
      ctx.fillRect(food.x*size, food.y*size, size-2, size-2);

      id = setTimeout(loop, tick);
    }
    loop();

    function onKey(e){
      if(e.key==='ArrowUp' && dir.y===0) dir={x:0,y:-1};
      if(e.key==='ArrowDown' && dir.y===0) dir={x:0,y:1};
      if(e.key==='ArrowLeft' && dir.x===0) dir={x:-1,y:0};
      if(e.key==='ArrowRight' && dir.x===0) dir={x:1,y:0};
      if(e.key===' '){ setRunning(r=>!r); }
    }
    window.addEventListener('keydown', onKey);
    return ()=>{ clearTimeout(id); window.removeEventListener('keydown', onKey); };

  },[running]);

  return (
    <div style={styles.card}>
      <h2>Snake</h2>
      <div>Score: {score}</div>
      <canvas ref={canvasRef} style={{border:'1px solid #ccc',marginTop:8}} />
      <div style={{marginTop:8}}>
        <button style={styles.smallBtn} onClick={()=>window.location.reload()}>Restart</button>
        <span style={{marginLeft:12}}>Use arrow keys. Space to pause.</span>
      </div>
    </div>
  );
}

// --------------------- Simple Car Racing (single-player) ---------------------
function CarRacing(){
  const canvasRef = useRef(null);
  const [speed, setSpeed] = useState(4);
  const [score, setScore] = useState(0);

  useEffect(()=>{
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    canvas.width = 320; canvas.height = 480;
    let carX = canvas.width/2 - 16;
    let obstacles = [];
    let running = true;
    let left=false,right=false;

    function spawn(){
      obstacles.push({ x: Math.random()*(canvas.width-40), y:-40, w:40, h:40 });
    }
    let spawnTimer = 0;
    function loop(){
      if(!running) return;
      ctx.fillStyle='lightgreen'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='gray'; ctx.fillRect(40,0,canvas.width-80,canvas.height);
      if(left) carX -= 5; if(right) carX +=5; carX = Math.max(40, Math.min(carX, canvas.width-80-32));
      ctx.fillStyle='blue'; ctx.fillRect(carX, canvas.height-80, 32, 48);

      spawnTimer += 1;
      if(spawnTimer>60){ spawnTimer=0; spawn(); }
      for(const obs of obstacles){ obs.y += speed; ctx.fillStyle='brown'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h); }
      obstacles = obstacles.filter(o=>o.y < canvas.height+50);

      for(const o of obstacles){
        if(o.x < carX+32 && o.x+o.w > carX && o.y < canvas.height-32 && o.y+o.h > canvas.height-80){ running=false; }
      }
      if(running) setScore(s=>s+1);
      requestAnimationFrame(loop);
    }
    loop();

    function onKey(e){ if(e.key==='ArrowLeft') left = e.type==='keydown'; if(e.key==='ArrowRight') right = e.type==='keydown'; }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    return ()=>{ window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  },[speed]);

  return (
    <div style={styles.card}>
      <h2>Car Racing</h2>
      <div>Score: {score}</div>
      <canvas ref={canvasRef} style={{border:'1px solid #ccc',marginTop:8}} />
      <div style={{marginTop:8}}>
        <small>Use left/right arrows to move. Avoid obstacles.</small>
      </div>
    </div>
  );
}

// --------------------- Styles ---------------------
const styles = {
  app: { fontFamily: 'system-ui, Arial', maxWidth:900, margin:'24px auto', padding:12 },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  main: { minHeight:400 },
  footer: { marginTop:18, color:'#666' },
  card: { border:'1px solid #ddd', padding:16, borderRadius:8, background:'#fff' },
  btn: { padding:'10px 16px', borderRadius:8, border:'1px solid #888', cursor:'pointer', background:'#f7f7f7' },
  smallBtn: { padding:'8px 10px', borderRadius:6, border:'1px solid #888', cursor:'pointer', background:'#f1f1f1' },
  input: { padding:8, borderRadius:6, border:'1px solid #ccc' },
  cell: { width:100, height:100, display:'flex', alignItems:'center', justifyContent:'center', background:'#fafafa', border:'1px solid #ccc', fontSize:32, cursor:'pointer' }
};
